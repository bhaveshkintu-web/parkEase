
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkflowEngine, WorkflowStep } from "@/lib/workflow/engine";
import { standardModules } from "@/lib/workflow/modules";

// Initialize Engine with standard modules
const engine = new WorkflowEngine();
Object.entries(standardModules).forEach(([name, handler]) => {
    engine.registerModule(name, handler);
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: workflowId } = await params;

    try {
        const body = await req.json().catch(() => ({}));

        // 1. Fetch Workflow
        const workflow = await prisma.workflow.findUnique({
            where: { id: workflowId },
        });

        if (!workflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        if (!workflow.isActive) {
            return NextResponse.json({ error: "Workflow is inactive" }, { status: 400 });
        }

        // 2. Create Execution Record
        const execution = await prisma.workflowExecution.create({
            data: {
                workflowId,
                status: "RUNNING",
                data: body,
            },
        });

        // 3. Execute Workflow (In-process for demo, ideal for queues)
        // We treat the "definition" schema as { steps: WorkflowStep[] }
        const definition = workflow.definition as any;
        const steps: WorkflowStep[] = definition.steps || [];

        // Run execution logic
        // NOTE: In a real app, this might be backgrounded. Here we await for immediate result.
        const context = {
            workflowId,
            executionId: execution.id,
            initialData: body,
            steps: {},
        };

        const results: Record<string, any> = {};
        let currentStepId = steps[0]?.id;
        let status = "COMPLETED";
        let finalError = null;

        while (currentStepId) {
            const step = steps.find((s) => s.id === currentStepId);
            if (!step) break;

            const stepResult = await engine.executeStep(step, context);

            // Store result
            context.steps[step.id] = stepResult;
            results[step.id] = stepResult;

            if (stepResult.status === "FAILED") {
                status = "FAILED";
                finalError = stepResult.error;
                break; // Stop execution
            }

            // Determine next step
            if (typeof step.next === 'string') {
                currentStepId = step.next;
            } else if (typeof step.next === 'object' && stepResult.output) {
                // Simple conditional: Check if output contains a key that matches a next path
                // For this demo, strictly using direct next or finding next in mapped object
                // e.g. next: { "success": "step_3", "failure": "step_99" }
                // We'll rely on the module returning a "nextStep" or just simple property check
                // For simplicity: If next is object, assume output has a "status" key
                const outcome = stepResult.output.status || "default";
                currentStepId = (step.next as any)[outcome];
            } else {
                currentStepId = undefined; // End
            }
        }

        // 4. Update Execution Record
        const updatedExecution = await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
                status,
                results: results,
                error: finalError ? { message: finalError } : undefined,
                completedAt: new Date(),
            },
        });

        return NextResponse.json(updatedExecution);

    } catch (error: any) {
        console.error("Execution failed:", error);
        return NextResponse.json(
            { error: "Internal execution error", details: error.message },
            { status: 500 }
        );
    }
}
