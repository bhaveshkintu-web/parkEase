# Relationship Queries & Workflow Guide

This guide provides idiomatic patterns for handling data relationships in the **Way-Com Clone** project. It covers Create, Read, Update, and Delete (CRUD) operations for key entities like **Bookings**, **Users**, and **Locations**, using both raw SQL (for understanding) and Prisma ORM (for implementation).

## 1. Creating Related Records (Nested Writes)
**Scenario:** A user creates a booking. We need to create the `Booking` record AND optionally a `Payment` record or `ParkingSession` atomically.

### Prisma (Recommended)
Prisma allows "nested writes" to create related records in a single transaction.

```typescript
// Create a Booking and a related Payment in one go
const newBooking = await prisma.booking.create({
  data: {
    userId: "user_123",
    locationId: "loc_abc",
    checkIn: new Date("2024-02-01"),
    checkOut: new Date("2024-02-02"),
    totalPrice: 45.00,
    confirmationCode: "CONF-999",
    // Nested write: Create the related Payment record immediately
    payment: {
      create: {
        amount: 45.00,
        provider: "stripe",
        transactionId: "tx_12345",
        status: "succeeded"
      }
    }
  },
  include: {
    payment: true // Return the created payment object as well
  }
})
```

### SQL Equivalent
```sql
BEGIN;
-- 1. Insert Booking
INSERT INTO "Booking" (id, "userId", "locationId", ...) 
VALUES ('booking_1', 'user_123', 'loc_abc', ...)
RETURNING id;

-- 2. Insert Payment using the returned Booking ID
INSERT INTO "Payment" (id, "bookingId", amount, ...) 
VALUES ('pay_1', 'booking_1', 45.00, ...);
COMMIT;
```

---

## 2. Reading Related Data (Eager Loading)
**Scenario:** Display a Booking Confirmation page. We need the Booking details, the User's name, and the Parking Location's address.

### Prisma
Use `include` to fetch related data in a single query.

```typescript
const bookingDetails = await prisma.booking.findUnique({
  where: { id: "booking_1" },
  include: {
    // Join User table to get guest details (if linked) or just user profile
    user: {
      select: {
        firstName: true,
        lastName: true,
        email: true
      }
    },
    // Join Location table to get address
    location: {
      select: {
        name: true,
        address: true,
        city: true,
        images: true // Array of images
      }
    },
    // Join Payment to show status
    payment: true
  }
})
```

### SQL Equivalent
```sql
SELECT 
  b.*, 
  u."firstName", u."lastName", u.email,
  l.name as "locationName", l.address, l.city
FROM "Booking" b
LEFT JOIN "User" u ON b."userId" = u.id
LEFT JOIN "ParkingLocation" l ON b."locationId" = l.id
LEFT JOIN "Payment" p ON b.id = p."bookingId"
WHERE b.id = 'booking_1';
```

---

## 3. Updating Relationships
**Scenario:** A Watchman checks in a vehicle. We need to update the `Booking` status AND create or update a `ParkingSession`.

### Prisma
Use `update` with nested `create` or `update` (upsert).

```typescript
const checkIn = await prisma.booking.update({
  where: { id: "booking_1" },
  data: {
    status: "CONFIRMED",
    // Create a new ParkingSession linked to this booking
    parkingSession: {
      create: {
        locationId: "loc_abc",
        checkInTime: new Date(),
        status: "checked_in"
      }
    }
  }
})
```

**Scenario:** Reassigning a Watchman to a different Location.
```typescript
const shiftUpdate = await prisma.watchmanShift.update({
  where: { id: "shift_1" },
  data: {
    // Connect to a different existing Location record
    location: {
      connect: { id: "new_location_id_456" }
    }
  }
})
```

### SQL Equivalent
```sql
-- Transaction required for atomicity
BEGIN;
UPDATE "Booking" SET status = 'CONFIRMED' WHERE id = 'booking_1';
INSERT INTO "ParkingSession" ("bookingId", "locationId", "checkInTime", status)
VALUES ('booking_1', 'loc_abc', NOW(), 'checked_in');
COMMIT;
```

---

## 4. Deleting with Constraints (Cascading)
**Scenario:** Deleting a `ParkingLocation`.
**Constraint:** You generally don't want to delete a location if it has active bookings. However, if you *must* delete, you need to handle related `Bookings`, `Reviews`, etc.

The `prisma/schema.prisma` does not strictly define `onDelete: Cascade` for all relations, so you often need to delete dependents manually or rely on database-level constraints.

### Safe Delete Workflow (Manual Cascade)
```typescript
const deleteLocation = await prisma.$transaction([
  // 1. Delete or Reassign Future Bookings (Business Logic decision)
  prisma.booking.deleteMany({
    where: { 
      locationId: "loc_abc",
      status: "PENDING" // Only delete pending ones
    }
  }),
  // 2. Delete Reviews
  prisma.review.deleteMany({
    where: { locationId: "loc_abc" }
  }),
  // 3. Finally delete the Location
  prisma.parkingLocation.delete({
    where: { id: "loc_abc" }
  })
])
```

---

## 5. Many-to-Many & Filtering
**Scenario:** Find parking locations that have specifically "EV Charging" (from an array of strings in `amenities` or a potentially related table).

In the current schema, `amenities` is a `String[]`.

### Prisma (Array Filtering)
```typescript
const evLocations = await prisma.parkingLocation.findMany({
  where: {
    amenities: {
      has: "EV Charging" // Filter array column
    },
    city: "New York",
    status: "ACTIVE"
  }
})
```

### SQL Equivalent
```sql
SELECT * FROM "ParkingLocation"
WHERE "EV Charging" = ANY(amenities)
AND city = 'New York'
AND status = 'ACTIVE';
```
