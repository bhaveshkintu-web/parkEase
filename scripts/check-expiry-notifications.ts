import { runExpiryCheck } from "../lib/utils/expiry-check";

async function main() {
    console.log("Starting Expiry Check Worker...");

    const check = async () => {
        try {
            const stats = await runExpiryCheck();
            console.log(`[${new Date().toLocaleTimeString()}] Check complete: notified=${stats.notified}, overstays=${stats.markedOverstay}, errors=${stats.errors}`);
        } catch (error) {
            console.error("Critical error in worker loop:", error);
        }
    };

    // Run every minute
    setInterval(check, 60000);
    await check();
}

main().catch(console.error);
