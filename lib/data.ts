import type { ParkingLocation, Airport, Destination, Review } from "./types";

export const destinations: Destination[] = [
  { id: "lax", type: "airport", code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", state: "CA", country: "USA", coordinates: { lat: 33.9416, lng: -118.4085 } },
  { id: "jfk", type: "airport", code: "JFK", name: "John F. Kennedy International Airport", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.6413, lng: -73.7781 } },
  { id: "ord", type: "airport", code: "ORD", name: "O'Hare International Airport", city: "Chicago", state: "IL", country: "USA", coordinates: { lat: 41.9742, lng: -87.9073 } },
  { id: "dfw", type: "airport", code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", state: "TX", country: "USA", coordinates: { lat: 32.8998, lng: -97.0403 } },
  { id: "sfo", type: "airport", code: "SFO", name: "San Francisco International Airport", city: "San Francisco", state: "CA", country: "USA", coordinates: { lat: 37.6213, lng: -122.3790 } },
  { id: "nyc-city", type: "city", name: "New York City", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.7128, lng: -74.0060 } },
  { id: "msg", type: "venue", name: "Madison Square Garden", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.7505, lng: -73.9934 } },
  { id: "staples", type: "venue", name: "Crypto.com Arena", city: "Los Angeles", state: "CA", country: "USA", coordinates: { lat: 34.0430, lng: -118.2673 } },
];

export const airports: Airport[] = [
  { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", state: "CA", image: "/airports/la.jpeg" },
  { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", state: "NY", image: "/airports/jfk.jpg" },
  { code: "ORD", name: "O'Hare International Airport", city: "Chicago", state: "IL", image: "/airports/ord.jpg" },
  { code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", state: "TX", image: "/airports/dfw.jpg" },
  { code: "SFO", name: "San Francisco International Airport", city: "San Francisco", state: "CA", image: "/airports/sfo.jpg" },
  { code: "MIA", name: "Miami International Airport", city: "Miami", state: "FL", image: "/airports/mia.jpeg" },
  { code: "SEA", name: "Seattle-Tacomo International Airport", city: "Seattle", state: "WA", image: "/airports/sea.jpg" },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", state: "GA", image: "/airports/atl.jpg" },
  { code: "PHL", name: "Philadelphia International Airport", city: "Philadelphia", state: "PA", image: "/airports/phl.jpg" },
  { code: "BOS", name: "Boston Logan International Airport", city: "Boston", state: "MA", image: "/airports/bos.jpg" },
];

// Essential helper functions and minimal reference data
export const parkingLocations: any[] = [];
export const reviews: any[] = [];

export const CAR_MAKES = [
  "Acura",
  "Audi",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ford",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jeep",
  "Kia",
  "Lexus",
  "Lincoln",
  "Mazda",
  "Mercedes-Benz",
  "Nissan",
  "Porsche",
  "Ram",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
  "Other",
];

export const benefits = [
  { title: "Free Cancellation", description: "Cancel up to 24 hours before for a full refund", icon: "check" },
  { title: "Best Price Guarantee", description: "Find a lower price? We'll match it", icon: "shield" },
  { title: "Free Shuttle", description: "Complimentary shuttle to and from terminals", icon: "bus" },
  { title: "Secure Parking", description: "24/7 surveillance and security patrols", icon: "lock" },
  { title: "Reservations Guaranteed", description: "Your spot is guaranteed when you book", icon: "calendar" },
  { title: "Loyalty Rewards", description: "Earn points on every booking", icon: "star" },
  { title: "24/7 Support", description: "Customer service available around the clock", icon: "headset" },
];

export function calculateDays(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  // Returns pro-rated days (fractional)
  return diffTime / (1000 * 60 * 60 * 24);
}

export function formatDuration(checkIn: Date, checkOut: Date): string {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const diffHours = diffTime / (1000 * 60 * 60);

  if (diffHours < 24) {
    const hours = Math.round(diffHours);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  const days = Math.floor(diffHours / 24);
  const remainingHours = Math.round(diffHours % 24);

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
}

export function calculateQuote(
  location: ParkingLocation,
  checkIn: Date,
  checkOut: Date,
  taxRate: number = 12,
  serviceFee: number = 5.99,
  promotion?: { type: string, value: number, maxDiscount?: number | null } | null
) {
  const days = calculateDays(checkIn, checkOut);
  const basePrice = location.pricePerDay * days;

  // Apply Promotion if present
  let discount = 0;
  if (promotion) {
    if (promotion.type === "percentage") {
      discount = basePrice * (promotion.value / 100);
      if (promotion.maxDiscount && discount > promotion.maxDiscount) {
        discount = promotion.maxDiscount;
      }
    } else if (promotion.type === "fixed") {
      discount = promotion.value;
    }
  }

  const subtotal = Math.max(0, basePrice - discount);
  const taxes = subtotal * (taxRate / 100);
  const fees = serviceFee;
  const totalPrice = subtotal + taxes + fees;

  const originalPrice = location.originalPrice || location.pricePerDay;
  const savings = Math.max(0, (originalPrice - location.pricePerDay) * days) + discount;

  return {
    days: days,
    durationText: formatDuration(checkIn, checkOut),
    basePrice,
    taxes,
    fees,
    totalPrice,
    discount,
    subtotal,
    savings,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (date === null || date === undefined) return "N/A";
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Invalid Date";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch (e) {
    return "Invalid Date";
  }
}

export function formatDateShort(date: Date | string | number | null | undefined): string {
  if (date === null || date === undefined) return "N/A";
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Invalid Date";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(d);
  } catch (e) {
    return "Invalid Date";
  }
}

export function formatTime(date: Date | string | number | null | undefined): string {
  if (date === null || date === undefined) return "N/A";
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "Invalid Time";

    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch (e) {
    return "Invalid Time";
  }
}

export function generateConfirmationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getAvailabilityStatus(
  location: ParkingLocation,
  liveAvailableSpots?: number
): { status: "available" | "limited" | "soldout"; message: string } {
  // Use the live count if provided (from the spot-actions check), else fallback to the location counter
  const spots = liveAvailableSpots !== undefined ? liveAvailableSpots : location.availableSpots;
  const percentAvailable = (spots / location.totalSpots) * 100;

  if (spots === 0) {
    return { status: "soldout", message: "Sold Out" };
  }
  
  // For small locations (like 5 spots), use a more sensitive threshold to show "Only X left"
  // If it's 4/5 (80%), we want to show it as limited to create urgency/clarity.
  const isLimited = location.totalSpots <= 10 
    ? (spots < location.totalSpots) // Any spot taken in a small lot shows as limited
    : (percentAvailable < 30 || spots < 20);

  if (isLimited) {
    return { status: "limited", message: `Only ${spots} spots left for these dates` };
  }
  
  return { status: "available", message: `${spots} spots available` };
}

export function searchDestinations(query: string): Destination[] {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();
  return destinations.filter(
    (dest) =>
      dest.name.toLowerCase().includes(lowerQuery) ||
      dest.city.toLowerCase().includes(lowerQuery) ||
      (dest.code && dest.code.toLowerCase().includes(lowerQuery))
  ).slice(0, 8);
}
