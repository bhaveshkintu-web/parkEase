const fs = require('fs');
const path = require('path');

// Manually load .env
try {
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join('=').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        if (key && value && !key.startsWith('#')) {
          process.env[key] = value;
        }
      }
    });
    console.log("Loaded .env file");
  } else {
    console.log(".env file not found");
  }
} catch (e) {
  console.log("Error reading .env:", e);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    const notifications = await prisma.notification.findMany({
      where: { type: 'NEW_BOOKING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: true }
    });
    
    const result = {
      timestamp: new Date().toISOString(),
      count: notifications.length,
      notifications
    };
    
    fs.writeFileSync('db-result.json', JSON.stringify(result, null, 2));
    console.log(`Successfully wrote ${notifications.length} notifications to db-result.json`);
  } catch (e) {
    const errorInfo = {
      message: e.message,
      stack: e.stack
    };
    fs.writeFileSync('db-error.json', JSON.stringify(errorInfo, null, 2));
    console.error("Error executing query:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
