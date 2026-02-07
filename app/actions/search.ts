"use server";

import { prisma } from "@/lib/prisma";

export type SearchResult = {
  id: string;
  name: string;
  city: string;
  country: string;
  airportCode: string | null;
  pricePerDay: number;
};

export async function searchLocations(query: string): Promise<SearchResult[]> {
  if (!query) {
    return await prisma.parkingLocation.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        airportCode: true,
        pricePerDay: true,
      },
      take: 10,
    });
  }

  const locations = await prisma.parkingLocation.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { airportCode: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      airportCode: true,
      pricePerDay: true,
    },
    take: 10,
  });

  return locations;
}
