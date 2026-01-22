import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * Advanced query to find locations filtering by amenitites (array column)
 * and active status.
 */
export async function findLocationsWithAvailability(
    city: string,
    requiredAmenities: string[] = []
) {
    const locations = await prisma.parkingLocation.findMany({
        where: {
            city: {
                contains: city,
                mode: 'insensitive' // Case insensitive search
            },
            status: "ACTIVE",
            // Array filtering: Location MUST have ALL required amenities
            AND: requiredAmenities.map(amenity => ({
                amenities: {
                    has: amenity
                }
            }))
        },
        include: {
            // Include pricing rules to calculate display price dynamically
            pricingRules: {
                where: {
                    isActive: true
                }
            },
            // Include aggregate review stats if needed (though often better calculated separately or cached)
            _count: {
                select: { reviews: true }
            }
        },
        orderBy: {
            pricePerDay: 'asc'
        }
    })

    return locations
}

/**
 * Update a location's amenities list.
 * Arrays in Prisma/Postgres can be set directly.
 */
export async function updateLocationAmenities(locationId: string, amenities: string[]) {
    return await prisma.parkingLocation.update({
        where: { id: locationId },
        data: {
            amenities: {
                set: amenities // Replaces the entire array
            }
        }
    })
}
