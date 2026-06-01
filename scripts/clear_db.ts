/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing database...');

  // Delete records in reverse order of dependencies to avoid foreign key errors
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.plan.deleteMany(),
    prisma.member.deleteMany(),
    prisma.gym.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.refreshToken.deleteMany(),
    
    // Delete all users EXCEPT those with the SUPER_ADMIN role
    prisma.user.deleteMany({
      where: {
        role: {
          not: 'SUPER_ADMIN'
        }
      }
    })
  ]);

  console.log('✅ Database cleared successfully! All your SUPER_ADMIN accounts were kept.');
}

main().then(() => prisma.$disconnect()).catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
