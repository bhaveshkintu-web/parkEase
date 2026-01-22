import { ModuleHandler } from "./engine";

export const logModule: ModuleHandler = async (inputs) => {
    console.log(`[Workflow Log] ${inputs.message}`);
    return { output: { logged: true, message: inputs.message } };
};

export const waitModule: ModuleHandler = async (inputs) => {
    const ms = parseInt(inputs.duration, 10) || 1000;
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { output: { waited: ms } };
};

export const httpRequestModule: ModuleHandler = async (inputs) => {
    const { url, method = "GET", body, headers } = inputs;

    if (!url) throw new Error("URL is required");

    // Basic fetch implementation
    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}: ${JSON.stringify(data)}`);
    }

    return { output: data };
};

export const standardModules = {
    log: logModule,
    wait: waitModule,
    httpRequest: httpRequestModule,
};
