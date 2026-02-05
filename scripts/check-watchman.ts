import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function m() {
    try {
        const res = await p.$queryRawUnsafe('SELECT * FROM "Watchman" LIMIT 1');
        console.log(res);
    } catch (e) {
        console.error(e);
    } finally {
        await p.$disconnect();
    }
}
m();
