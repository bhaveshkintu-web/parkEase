import { PrismaClient, UserRole, UserStatus, BookingStatus, DisputeType, DisputeStatus, DisputePriority, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Admins and Support Users
  const admin = await prisma.user.upsert({
    where: { email: 'admin@parkzipply.com' },
    update: {},
    create: {
      email: 'admin@parkzipply.com',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const support = await prisma.user.upsert({
    where: { email: 'support@parkzipply.com' },
    update: {},
    create: {
      email: 'support@parkzipply.com',
      firstName: 'Support',
      lastName: 'Agent',
      password: hashedPassword,
      role: UserRole.SUPPORT,
      status: UserStatus.ACTIVE,
    },
  });

  // 2. Create Customers
  const customer1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: hashedPassword,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: hashedPassword,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    },
  });

  // 3. Create a Location
  const owner = await prisma.user.upsert({
    where: { email: 'owner@example.com' },
    update: {},
    create: {
      email: 'owner@example.com',
      firstName: 'Parking',
      lastName: 'Owner',
      password: hashedPassword,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      ownerProfile: {
        create: {
          businessName: 'Premium Parking Garage',
          businessType: 'Garage',
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA',
        }
      }
    },
    include: { ownerProfile: true }
  });

  const location = await prisma.parkingLocation.upsert({
    where: { id: 'seed-location-1' },
    update: {},
    create: {
      id: 'seed-location-1',
      ownerId: owner.ownerProfile!.id,
      name: 'Airport Parking SF',
      address: '789 Airport Blvd',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      zipCode: '94128',
      latitude: 37.6213,
      longitude: -122.3790,
      pricePerDay: 25.0,
      availableSpots: 50,
      totalSpots: 100,
      status: 'ACTIVE',
    }
  });

  // 4. Create Bookings (Idempotent check)
  const booking1 = await prisma.booking.upsert({
    where: { confirmationCode: 'BOOKING-101' },
    update: {},
    create: {
      userId: customer1.id,
      locationId: location.id,
      checkIn: new Date(Date.now() - 86400000 * 2),
      checkOut: new Date(Date.now() - 86400000),
      totalPrice: 50.0,
      taxes: 5.0,
      fees: 2.0,
      status: BookingStatus.COMPLETED,
      confirmationCode: 'BOOKING-101',
      guestFirstName: 'John',
      guestLastName: 'Doe',
      guestEmail: 'john@example.com',
      guestPhone: '1234567890',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      vehicleColor: 'Silver',
      vehiclePlate: 'ABC-123',
    }
  });

  const booking2 = await prisma.booking.upsert({
    where: { confirmationCode: 'BOOKING-102' },
    update: {},
    create: {
      userId: customer2.id,
      locationId: location.id,
      checkIn: new Date(Date.now() - 86400000),
      checkOut: new Date(Date.now() + 86400000),
      totalPrice: 75.0,
      taxes: 7.5,
      fees: 3.0,
      status: BookingStatus.CONFIRMED,
      confirmationCode: 'BOOKING-102',
      guestFirstName: 'Jane',
      guestLastName: 'Smith',
      guestEmail: 'jane@example.com',
      guestPhone: '0987654321',
      vehicleMake: 'Honda',
      vehicleModel: 'Civic',
      vehicleColor: 'Black',
      vehiclePlate: 'XYZ-789',
    }
  });

  // 5. Create Disputes (Only if they don't exist for these bookings)
  const existingDispute1 = await prisma.dispute.findFirst({ where: { bookingId: booking1.id } });
  if (!existingDispute1) {
    await prisma.dispute.create({
      data: {
        bookingId: booking1.id,
        userId: customer1.id,
        subject: 'Double Charged',
        description: 'I was charged twice for my stay. I only stayed for one day but my credit card shows two charges of $57.00.',
        type: DisputeType.REFUND,
        status: DisputeStatus.OPEN,
        priority: DisputePriority.HIGH,
        auditLogs: {
          create: {
            action: 'CREATED',
            notes: 'Customer raised a dispute about double charging.',
          }
        }
      }
    });
  }

  const existingDispute2 = await prisma.dispute.findFirst({ where: { bookingId: booking2.id } });
  if (!existingDispute2) {
    const dispute2 = await prisma.dispute.create({
      data: {
        bookingId: booking2.id,
        userId: customer2.id,
        subject: 'Shuttle was late',
        description: 'The shuttle took 45 minutes to arrive at the airport. I almost missed my flight.',
        type: DisputeType.SERVICE,
        status: DisputeStatus.IN_PROGRESS,
        priority: DisputePriority.MEDIUM,
        assignedAdminId: support.id,
        auditLogs: {
          create: {
            action: 'CREATED',
            notes: 'Customer complaining about shuttle delay.',
          }
        }
      }
    });

    await prisma.disputeAuditLog.create({
      data: {
        disputeId: dispute2.id,
        adminId: support.id,
        action: 'ASSIGNED',
        notes: 'Assigned to support agent for investigation.',
      }
    });
  }

  // 6. Create Support Tickets
  const existingTicket1 = await prisma.supportTicket.findFirst({ where: { email: 'bob@example.com', subject: 'How to cancel?' } });
  if (!existingTicket1) {
    await prisma.supportTicket.create({
      data: {
        name: 'Bob Wilson',
        email: 'bob@example.com',
        subject: 'How to cancel?',
        message: 'I need to cancel my booking for next week. How do I do that?',
        status: TicketStatus.OPEN,
      }
    });
  }

  const existingTicket2 = await prisma.supportTicket.findFirst({ where: { email: 'alice@example.com', subject: 'Partner inquiry' } });
  if (!existingTicket2) {
    await prisma.supportTicket.create({
      data: {
        name: 'Alice Brown',
        email: 'alice@example.com',
        subject: 'Partner inquiry',
        message: 'I have a parking lot near the airport and would like to list it on your platform.',
        status: TicketStatus.IN_PROGRESS,
      }
    });
  }

  console.log('Seed data checked/created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
