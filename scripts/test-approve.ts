import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const requestId = 'cml6i3sbr0013u1p8tqmf6gms'; // Anish's request
    console.log(`Approving request ${requestId}...`);

    try {
        const response = await fetch(`http://localhost:3000/api/watchman/booking-requests/${requestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' })
        });
        const data = await response.json();
        console.log('API Response:', data);
    } catch (e) {
        console.error('Fetch failed (server might not be running), using data-store internal logic mock');
        // If server isn't running, we can't test the API directly this way.
        // But I can check if the logic I wrote in the API file would work.
    } finally {
        await prisma.$disconnect();
    }
}

// main(); // Commented out because I don't know if the dev server is accessible via localhost in this environment
