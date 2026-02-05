
export type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface WorkflowStep {
  id: string;
  module: string; // Name of the registered module
  name?: string;
  inputs?: Record<string, any>; // Static inputs or dynamic references like "{{step1.output.id}}"
  next?: string | Record<string, string>; // ID of next step or conditional map
}

export interface StepResult {
  stepId: string;
  status: StepStatus;
  output?: any;
  error?: string;
  startTime: number;
  endTime?: number;
  logs: string[];
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  initialData: any;
  steps: Record<string, StepResult>; // Results of previous steps
}

export type ModuleHandler = (
  inputs: any,
  context: ExecutionContext
) => Promise<{ output?: any; nextStep?: string }>;

export class WorkflowEngine {
  private modules: Map<string, ModuleHandler> = new Map();

  registerModule(name: string, handler: ModuleHandler) {
    this.modules.set(name, handler);
  }

  async executeStep(
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<StepResult> {
    const startTime = Date.now();
    const result: StepResult = {
      stepId: step.id,
      status: 'RUNNING',
      startTime,
      logs: [],
    };

    try {
      const handler = this.modules.get(step.module);
      if (!handler) {
        throw new Error(`Module '${step.module}' not found`);
      }

      // Resolve inputs (simple variable substitution)
      const resolvedInputs = this.resolveInputs(step.inputs || {}, context);

      const { output } = await handler(resolvedInputs, context);

      result.output = output;
      result.status = 'COMPLETED';
    } catch (error: any) {
      result.status = 'FAILED';
      result.error = error.message || String(error);
      result.logs.push(`Error: ${result.error}`);
    } finally {
      result.endTime = Date.now();
    }

    return result;
  }

  // Simple helper to replace {{stepId.output.key}} with actual values
  private resolveInputs(inputs: Record<string, any>, context: ExecutionContext): any {
    const resolved: any = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim(); // e.g. "step1.output.id"
        resolved[key] = this.getValueByPath(path, context);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  private getValueByPath(path: string, context: ExecutionContext): any {
    // Check initial data
    if (path.startsWith('initial.')) {
      return context.initialData?.[path.split('.')[1]];
    }

    const parts = path.split('.'); // [stepId, 'output', key]
    const stepResult = context.steps[parts[0]];
    if (!stepResult?.output) return null;

    return stepResult.output[parts[2]] || stepResult.output;
  }
}
