import { PrismaClient } from '@prisma/client';
import { subDays, setHours, addHours } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { id: 'demo-user-id' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@nightctrl.com',
      name: 'Demo User',
    },
  });

  // Generate last 7 days of sleep data
  for (let i = 0; i < 7; i++) {
    const date = subDays(new Date(), i);
    const bedtime = setHours(date, 22 + Math.random() * 2);
    const waketime = addHours(bedtime, 6 + Math.random() * 3);

    // Sleep start
    await prisma.event.create({
      data: {
        userId: user.id,
        timestamp: bedtime,
        type: 'sleep_start',
        category: 'sleep',
        name: 'Bedtime',
      },
    });

    // Sleep end
    await prisma.event.create({
      data: {
        userId: user.id,
        timestamp: waketime,
        type: 'sleep_end',
        category: 'sleep',
        name: 'Wake Time',
        value: (waketime.getTime() - bedtime.getTime()) / (1000 * 60), // duration in minutes
        unit: 'minutes',
      },
    });

    // Random supplement
    if (Math.random() > 0.5) {
      await prisma.event.create({
        data: {
          userId: user.id,
          timestamp: addHours(bedtime, -1),
          type: 'supplement',
          category: 'intervention',
          name: 'Magnesium',
          value: 400,
          unit: 'mg',
        },
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());