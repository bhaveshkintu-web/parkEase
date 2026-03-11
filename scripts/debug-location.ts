import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    const locationId = 'cmmg4d4ew000au1j0l7watifz';
    const location = await prisma.parkingLocation.findUnique({
        where: { id: locationId },
        include: {
            spots: {
                orderBy: { identifier: 'asc' }
            }
        }
    });

    if (!location) {
        fs.writeFileSync('scripts/debug-result.json', JSON.stringify({ error: 'Location not found' }));
        return;
    }

    const result = {
        location: {
            id: location.id,
            name: location.name,
            totalSpots: location.totalSpots,
            availableSpots: location.availableSpots
        },
        spots: location.spots
    };
    fs.writeFileSync('scripts/debug-result.json', JSON.stringify(result, null, 2));
}

main().catch(e => {
    fs.writeFileSync('scripts/debug-result.json', JSON.stringify({ error: e.message }));
}).finally(() => prisma.$disconnect());
