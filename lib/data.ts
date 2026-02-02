import type { ParkingLocation, Airport, Destination, Review } from "./types";

export const destinations: Destination[] = [
  { id: "lax", type: "airport", code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", state: "CA", country: "USA", coordinates: { lat: 33.9416, lng: -118.4085 } },
  { id: "jfk", type: "airport", code: "JFK", name: "John F. Kennedy International Airport", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.6413, lng: -73.7781 } },
  { id: "ord", type: "airport", code: "ORD", name: "O'Hare International Airport", city: "Chicago", state: "IL", country: "USA", coordinates: { lat: 41.9742, lng: -87.9073 } },
  { id: "dfw", type: "airport", code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", state: "TX", country: "USA", coordinates: { lat: 32.8998, lng: -97.0403 } },
  { id: "sfo", type: "airport", code: "SFO", name: "San Francisco International Airport", city: "San Francisco", state: "CA", country: "USA", coordinates: { lat: 37.6213, lng: -122.3790 } },
  { id: "mia", type: "airport", code: "MIA", name: "Miami International Airport", city: "Miami", state: "FL", country: "USA", coordinates: { lat: 25.7959, lng: -80.2870 } },
  { id: "sea", type: "airport", code: "SEA", name: "Seattle-Tacoma International Airport", city: "Seattle", state: "WA", country: "USA", coordinates: { lat: 47.4502, lng: -122.3088 } },
  { id: "atl", type: "airport", code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", state: "GA", country: "USA", coordinates: { lat: 33.6407, lng: -84.4277 } },
  { id: "phl", type: "airport", code: "PHL", name: "Philadelphia International Airport", city: "Philadelphia", state: "PA", country: "USA", coordinates: { lat: 39.8729, lng: -75.2437 } },
  { id: "bos", type: "airport", code: "BOS", name: "Boston Logan International Airport", city: "Boston", state: "MA", country: "USA", coordinates: { lat: 42.3656, lng: -71.0096 } },
  { id: "la-city", type: "city", name: "Los Angeles", city: "Los Angeles", state: "CA", country: "USA", coordinates: { lat: 34.0522, lng: -118.2437 } },
  { id: "nyc-city", type: "city", name: "New York City", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.7128, lng: -74.0060 } },
  { id: "msg", type: "venue", name: "Madison Square Garden", city: "New York", state: "NY", country: "USA", coordinates: { lat: 40.7505, lng: -73.9934 } },
  { id: "staples", type: "venue", name: "Crypto.com Arena", city: "Los Angeles", state: "CA", country: "USA", coordinates: { lat: 34.0430, lng: -118.2673 } },
];

export const airports: Airport[] = [
  { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", state: "CA", image: "/airports/lax.jpg" },
  { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", state: "NY", image: "/airports/jfk.jpg" },
  { code: "ORD", name: "O'Hare International Airport", city: "Chicago", state: "IL", image: "/airports/ord.jpg" },
  { code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", state: "TX", image: "/airports/dfw.jpg" },
  { code: "SFO", name: "San Francisco International Airport", city: "San Francisco", state: "CA", image: "/airports/sfo.jpg" },
  { code: "MIA", name: "Miami International Airport", city: "Miami", state: "FL", image: "/airports/mia.jpg" },
  { code: "SEA", name: "Seattle-Tacomo International Airport", city: "Seattle", state: "WA", image: "/airports/sea.jpg" },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", state: "GA", image: "/airports/atl.jpg" },
  { code: "PHL", name: "Philadelphia International Airport", city: "Philadelphia", state: "PA", image: "/airports/phl.jpg" },
  { code: "BOS", name: "Boston Logan International Airport", city: "Boston", state: "MA", image: "/airports/bos.jpg" },
];

export const parkingLocations: ParkingLocation[] = [
  {
    id: "1",
    name: "LAX Economy Parking",
    address: "9101 Airport Blvd, Los Angeles, CA 90045",
    airport: "Los Angeles International Airport",
    airportCode: "LAX",
    coordinates: { lat: 33.9416, lng: -118.4085 },
    pricePerDay: 12.99,
    originalPrice: 18.99,
    rating: 4.7,
    reviewCount: 2847,
    amenities: ["Free Shuttle", "24/7 Security", "Covered Parking", "EV Charging", "Handicap Accessible", "Luggage Assistance"],
    images: ["/parking/lax-1.jpg", "/parking/lax-2.jpg", "/parking/lax-3.jpg"],
    shuttle: true,
    shuttleInfo: {
      enabled: true,
      hours: "24/7",
      frequency: "Every 5-10 minutes",
      pickupInstructions: "After parking, proceed to the shuttle pickup zone located near the main entrance. Look for the blue shuttle bus with our logo.",
      phone: "(310) 555-0123",
      trackingUrl: "https://track.example.com/lax-economy",
    },
    covered: true,
    selfPark: true,
    valet: false,
    open24Hours: true,
    distance: "1.2 mi from terminal",
    availableSpots: 156,
    totalSpots: 500,
    description: "Convenient economy parking just minutes from LAX terminals. Our 24-hour shuttle service runs every 5-10 minutes, ensuring you never miss your flight. Enjoy covered parking spots and full security monitoring.",
    redeemSteps: [
      { step: 1, title: "Arrive at the lot", description: "Drive to 9101 Airport Blvd. Present your confirmation code or email at the entrance gate." },
      { step: 2, title: "Park your vehicle", description: "Follow the signs to available parking. Take a photo of your parking spot number for reference." },
      { step: 3, title: "Take the shuttle", description: "Walk to the shuttle pickup zone near the entrance. Shuttles run every 5-10 minutes to all terminals." },
      { step: 4, title: "Return & retrieve", description: "Upon return, call (310) 555-0123 from baggage claim. Show your confirmation to exit the lot." },
    ],
    specialInstructions: [
      "Keep your confirmation code handy for entry and exit",
      "Note your parking spot number or take a photo",
      "Shuttle operates 24/7 with no advance reservation needed",
    ],
    cancellationPolicy: {
      type: "free",
      deadline: "24 hours before check-in",
      description: "Free cancellation up to 24 hours before your check-in time. After that, the first day's rate will be charged.",
    },
    securityFeatures: ["24/7 CCTV Surveillance", "Security Patrols", "Well-lit Facility", "Gated Entry"],
  },
  {
    id: "2",
    name: "Premier Parking LAX",
    address: "5959 W Century Blvd, Los Angeles, CA 90045",
    airport: "Los Angeles International Airport",
    airportCode: "LAX",
    coordinates: { lat: 33.9461, lng: -118.3920 },
    pricePerDay: 15.99,
    originalPrice: 24.99,
    rating: 4.9,
    reviewCount: 1523,
    amenities: ["Free Shuttle", "Valet Available", "Covered Parking", "Car Wash", "EV Charging", "Premium Lounge"],
    images: ["/parking/premier-1.jpg", "/parking/premier-2.jpg"],
    shuttle: true,
    shuttleInfo: {
      enabled: true,
      hours: "24/7",
      frequency: "Every 3-5 minutes",
      pickupInstructions: "Our premium shuttle picks up directly at your vehicle. Simply call when you're parked and we'll come to you.",
      phone: "(310) 555-0456",
    },
    covered: true,
    selfPark: true,
    valet: true,
    open24Hours: true,
    distance: "0.8 mi from terminal",
    availableSpots: 12,
    totalSpots: 200,
    description: "Premium parking experience with valet service available. Located closer to the terminals with faster shuttle times. Optional car wash service while you travel.",
    redeemSteps: [
      { step: 1, title: "Arrive at the lot", description: "Drive to 5959 W Century Blvd. Choose self-park or pull up to valet stand." },
      { step: 2, title: "Check in", description: "Show your confirmation code. For valet, hand over your keys and receive a claim ticket." },
      { step: 3, title: "Premium shuttle", description: "Our shuttle picks up at your spot or the valet stand. Runs every 3-5 minutes." },
      { step: 4, title: "Easy return", description: "Call 15 minutes before arrival. Your car will be ready and waiting at the valet stand." },
    ],
    cancellationPolicy: {
      type: "free",
      deadline: "12 hours before check-in",
      description: "Free cancellation up to 12 hours before your check-in time.",
    },
    securityFeatures: ["24/7 CCTV Surveillance", "On-site Security Staff", "Vehicle Inspection", "Gated Entry"],
  },
  {
    id: "3",
    name: "Budget Airport Parking",
    address: "10100 S La Cienega Blvd, Inglewood, CA 90304",
    airport: "Los Angeles International Airport",
    airportCode: "LAX",
    coordinates: { lat: 33.9380, lng: -118.3780 },
    pricePerDay: 8.99,
    originalPrice: 14.99,
    rating: 4.4,
    reviewCount: 3291,
    amenities: ["Free Shuttle", "24/7 Security", "Uncovered Parking"],
    images: ["/parking/budget-1.jpg", "/parking/budget-2.jpg"],
    shuttle: true,
    shuttleInfo: {
      enabled: true,
      hours: "4:00 AM - 1:00 AM",
      frequency: "Every 10-15 minutes",
      pickupInstructions: "Walk to the covered shuttle stop near Row A. Shuttles depart every 10-15 minutes.",
      phone: "(310) 555-0789",
    },
    covered: false,
    selfPark: true,
    valet: false,
    open24Hours: true,
    distance: "2.1 mi from terminal",
    availableSpots: 312,
    totalSpots: 800,
    description: "Most affordable parking option near LAX. Reliable shuttle service every 10-15 minutes. Open-air parking with full security monitoring.",
    redeemSteps: [
      { step: 1, title: "Enter the lot", description: "Scan your confirmation QR code at the gate or enter your code manually." },
      { step: 2, title: "Park anywhere", description: "Find any available spot in the uncovered lot. Remember your row number." },
      { step: 3, title: "Catch the shuttle", description: "Head to the shuttle stop at Row A. Service runs 4 AM to 1 AM." },
      { step: 4, title: "Exit on return", description: "Scan your QR code at the exit gate. No need to visit the office." },
    ],
    cancellationPolicy: {
      type: "free",
      deadline: "24 hours before check-in",
      description: "Full refund if cancelled 24+ hours before check-in.",
    },
    securityFeatures: ["24/7 CCTV Surveillance", "Security Patrols", "Well-lit Facility"],
  },
  {
    id: "4",
    name: "JFK Long Term Parking",
    address: "JFK Access Rd, Jamaica, NY 11430",
    airport: "John F. Kennedy International Airport",
    airportCode: "JFK",
    coordinates: { lat: 40.6413, lng: -73.7781 },
    pricePerDay: 14.99,
    originalPrice: 22.99,
    rating: 4.6,
    reviewCount: 1876,
    amenities: ["Free Shuttle", "24/7 Security", "Covered Parking", "Handicap Accessible"],
    images: ["/parking/jfk-1.jpg", "/parking/jfk-2.jpg"],
    shuttle: true,
    shuttleInfo: {
      enabled: true,
      hours: "24/7",
      frequency: "Every 8-12 minutes",
      pickupInstructions: "Board the shuttle at the designated pickup area near the main office.",
      phone: "(718) 555-0123",
    },
    covered: true,
    selfPark: true,
    valet: false,
    open24Hours: true,
    distance: "1.5 mi from terminal",
    availableSpots: 234,
    totalSpots: 600,
    description: "Convenient long-term parking for JFK travelers. Covered spots available with frequent shuttle service to all terminals.",
    redeemSteps: [
      { step: 1, title: "Check in at gate", description: "Present your confirmation at the entry booth or scan QR code." },
      { step: 2, title: "Park your car", description: "Follow attendant directions or find an open spot in covered area." },
      { step: 3, title: "Board the shuttle", description: "Walk to the shuttle zone. Service to all JFK terminals." },
      { step: 4, title: "Return procedure", description: "Take shuttle back, show confirmation to retrieve your vehicle." },
    ],
    cancellationPolicy: {
      type: "free",
      deadline: "24 hours before check-in",
      description: "Free cancellation up to 24 hours before arrival.",
    },
    securityFeatures: ["24/7 CCTV Surveillance", "Manned Booths", "Fenced Perimeter"],
  },
  {
    id: "5",
    name: "SFO Park & Fly",
    address: "620 Airport Blvd, Burlingame, CA 94010",
    airport: "San Francisco International Airport",
    airportCode: "SFO",
    coordinates: { lat: 37.6213, lng: -122.3790 },
    pricePerDay: 11.99,
    originalPrice: 19.99,
    rating: 4.8,
    reviewCount: 2134,
    amenities: ["Free Shuttle", "24/7 Security", "Covered Parking", "EV Charging", "Car Detailing"],
    images: ["/parking/sfo-1.jpg", "/parking/sfo-2.jpg"],
    shuttle: true,
    shuttleInfo: {
      enabled: true,
      hours: "24/7",
      frequency: "Every 5-8 minutes",
      pickupInstructions: "Shuttles pick up at Zones A, B, and C. Listen for announcements.",
      phone: "(650) 555-0456",
    },
    covered: true,
    selfPark: true,
    valet: true,
    open24Hours: true,
    distance: "1.0 mi from terminal",
    availableSpots: 178,
    totalSpots: 450,
    description: "Top-rated parking facility near SFO. Quick shuttle rides and premium amenities including car detailing services.",
    redeemSteps: [
      { step: 1, title: "Arrive & check in", description: "Show confirmation at the welcome booth or use self-service kiosk." },
      { step: 2, title: "Choose your spot", description: "Self-park in designated area or opt for valet service." },
      { step: 3, title: "Shuttle to terminal", description: "Board at Zones A, B, or C. Quick 5-minute ride to SFO." },
      { step: 4, title: "Return pickup", description: "Call from baggage claim for express pickup service." },
    ],
    cancellationPolicy: {
      type: "free",
      deadline: "6 hours before check-in",
      description: "Flexible cancellation up to 6 hours before your reservation.",
    },
    securityFeatures: ["24/7 CCTV Surveillance", "Security Guards", "License Plate Recognition"],
  },
  {
    id: "6",
    name: "O'Hare Express Parking",
    address: "10255 W Zemke Rd, Chicago, IL 60666",
    airport: "O'Hare International Airport",
    airportCode: "ORD",
    coordinates: { lat: 41.9742, lng: -87.9073 },
    pricePerDay: 10.99,
    originalPrice: 17.99,
    rating: 4.5,
    reviewCount: 1654,
    amenities: ["Free Shuttle", "24/7 Security", "Heated Indoor Parking", "Jump Start Service"],
    images: ["/parking/ord-1.jpg", "/parking/ord-2.jpg"],
    shuttle: true,
    shuttleInfo: {
      enabled: true,
      hours: "24/7",
      frequency: "Every 10-12 minutes",
      pickupInstructions: "Indoor shuttle boarding at Level 1 near elevators.",
      phone: "(773) 555-0789",
    },
    covered: true,
    selfPark: true,
    valet: false,
    open24Hours: true,
    distance: "1.3 mi from terminal",
    availableSpots: 198,
    totalSpots: 400,
    description: "Heated indoor parking perfect for Chicago winters. Fast shuttle service to all O'Hare terminals.",
    redeemSteps: [
      { step: 1, title: "Enter garage", description: "Take a ticket at entry or scan your QR code for pre-paid access." },
      { step: 2, title: "Park indoors", description: "All spots are covered and heated. Note your level and spot number." },
      { step: 3, title: "Shuttle boarding", description: "Go to Level 1 shuttle area. Service runs every 10-12 minutes." },
      { step: 4, title: "Exit procedure", description: "Insert ticket and pay any balance, or scan QR for prepaid exit." },
    ],
    cancellationPolicy: {
      type: "free",
      deadline: "24 hours before check-in",
      description: "Full refund for cancellations 24+ hours in advance.",
    },
    heightLimit: "7'2\"",
    securityFeatures: ["24/7 CCTV Surveillance", "Indoor Facility", "Emergency Call Boxes"],
  },
];

export const reviews: Review[] = [
  { id: "r1", locationId: "1", author: "Sarah M.", rating: 5, date: new Date("2026-01-10"), title: "Perfect for our trip!", content: "Easy to find, shuttle was quick, and our car was safe when we returned. Will definitely use again!", helpful: 24 },
  { id: "r2", locationId: "1", author: "Michael T.", rating: 4, date: new Date("2026-01-08"), title: "Good value", content: "Great price for LAX parking. Shuttle took about 10 mins which was fine. Only minor issue was finding the exit.", helpful: 12 },
  { id: "r3", locationId: "1", author: "Jennifer L.", rating: 5, date: new Date("2026-01-05"), title: "Smooth experience", content: "Booked last minute and everything was seamless. QR code worked perfectly at the gate.", helpful: 18 },
  { id: "r4", locationId: "2", author: "David K.", rating: 5, date: new Date("2026-01-12"), title: "Premium service worth it", content: "The valet option was amazing. Car was washed when I returned. Highly recommend for the price.", helpful: 31 },
  { id: "r5", locationId: "2", author: "Amanda R.", rating: 5, date: new Date("2026-01-09"), title: "Best LAX parking", content: "Fastest shuttle I've ever experienced. Driver was friendly and helped with bags. Five stars!", helpful: 27 },
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
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1);
}

export function calculateQuote(location: ParkingLocation, checkIn: Date, checkOut: Date) {
  const days = calculateDays(checkIn, checkOut);
  const basePrice = location.pricePerDay * days;
  const taxes = basePrice * 0.0925; // 9.25% tax
  const fees = 2.99; // Service fee
  const totalPrice = basePrice + taxes + fees;
<<<<<<< Updated upstream
  
=======
  const originalPrice = location.originalPrice || location.pricePerDay;
  const savings = Math.max(0, (originalPrice - location.pricePerDay) * days);
>>>>>>> Stashed changes
  return {
    days,
    basePrice,
    taxes,
    fees,
    totalPrice,
    savings: (location.originalPrice - location.pricePerDay) * days,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function generateConfirmationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getAvailabilityStatus(location: ParkingLocation): { status: "available" | "limited" | "soldout"; message: string } {
  const percentAvailable = (location.availableSpots / location.totalSpots) * 100;
  
  if (location.availableSpots === 0) {
    return { status: "soldout", message: "Sold Out" };
  }
  if (percentAvailable < 10 || location.availableSpots < 20) {
    return { status: "limited", message: `Only ${location.availableSpots} spots left` };
  }
  return { status: "available", message: `${location.availableSpots} spots available` };
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
