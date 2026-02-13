import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Watchman Stats Debug ===");
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const watchmen = await prisma.watchman.findMany({
    include: {
      user: true,
      activityLogs: {
        where: {
          timestamp: { gte: today },
          type: { in: ["check_in", "check_out"] }
        }
      }
    }
  });
  
  if (watchmen.length === 0) {
    console.log("No watchmen found.");
    return;
  }
  
  watchmen.forEach(w => {
    const checkIns = w.activityLogs.filter(l => l.type === "check_in").length;
    const checkOuts = w.activityLogs.filter(l => l.type === "check_out").length;
    
    console.log(`Watchman: ${w.user.firstName} ${w.user.lastName}`);
    console.log(`- Shift: ${w.shift || "N/A"}`);
    console.log(`- Today Check-ins: ${checkIns}`);
    console.log(`- Today Check-outs: ${checkOuts}`);
    console.log("----------------------------");
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
