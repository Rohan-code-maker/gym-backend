/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Please provide an email address! Usage: npx ts-node scripts/make_admin.ts <email>');
    process.exit(1);
  }

  const result = await prisma.user.updateMany({
    where: { email: email },
    data: { role: 'SUPER_ADMIN' }
  });

  if (result.count === 0) {
    console.log(`❌ No user found with email: ${email}`);
  } else {
    console.log(`✅ Successfully made ${email} a SUPER_ADMIN!`);
  }
}

main().then(() => prisma.$disconnect()).catch(e => {
  console.error(e);
  prisma.$disconnect();
});
