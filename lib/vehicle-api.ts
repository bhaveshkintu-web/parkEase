export interface NHTSAModel {
    Make_ID: number;
    Make_Name: string;
    Model_ID: number;
    Model_Name: string;
}

export interface NHTSAResponse {
    Count: number;
    Message: string;
    SearchCriteria: string;
    Results: NHTSAModel[];
}

export async function fetchModelsByMake(make: string): Promise<string[]> {
    if (!make) return [];

    try {
        const response = await fetch(
            `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${encodeURIComponent(
                make
            )}?format=json`
        );

        if (!response.ok) {
            throw new Error("Failed to fetch models");
        }

        const data: NHTSAResponse = await response.json();

        // Sort and return unique model names
        return Array.from(new Set(data.Results.map((r) => r.Model_Name))).sort();
    } catch (error) {
        console.error("Error fetching models from NHTSA:", error);
        return [];
    }
}
