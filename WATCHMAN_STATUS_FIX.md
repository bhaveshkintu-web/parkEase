# WATCHMAN BOOKINGS - STATUS FIX

## 🐛 The Problem

Your watchman bookings page has a **case sensitivity issue**:

- Database bookings have: `status: 'CONFIRMED'` (UPPERCASE)
- Your code checks for: `status === "confirmed"` (lowercase)

Result: **Confirmed count always shows 0**

## ✅ The Solution

### Option 1: Quick Fix - Normalize in Component (RECOMMENDED)

Add this helper function to normalize status:

```typescript
const normalizeStatus = (status: string) => status.toUpperCase();
```

Then update line 456:

```typescript
// BEFORE:
{todayBookings.filter((b) => b.status === "confirmed").length}

// AFTER:
{todayBookings.filter((b) => normalizeStatus(b.status) === "CONFIRMED").length}
```

### Option 2: Fix Database Statuses

Run this script to convert all statuses to lowercase:

```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

await prisma.booking.updateMany({
  where: { status: 'CONFIRMED' },
  data: { status: 'confirmed' }
});

await prisma.booking.updateMany({
  where: { status: 'PENDING' },
  data: { status: 'pending' }
});
```

## 🚀 Complete Fixed Component

I recommend **Option 1** - here's the complete fix:

1. Add status normalization helper at the top of your component
2. Update all status comparisons to use uppercase
3. Works with both database formats

The key changes needed:
- Line 213: `filtered.filter((b) => normalizeStatus(b.status) === statusFilter.toUpperCase())`
- Line 456: `{todayBookings.filter((b) => normalizeStatus(b.status) === "CONFIRMED").length}`

This way it works whether database has uppercase or lowercase!
