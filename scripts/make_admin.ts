import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: { email: 'rohan.gupta2059@gmail.com' },
    data: { role: 'SUPER_ADMIN' }
  });
}

main().then(() => prisma.$disconnect()).catch(e => {
  console.error(e);
  prisma.$disconnect();
});
