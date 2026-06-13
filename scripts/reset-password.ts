/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx ts-node scripts/reset-password.ts <email_or_phone> <new_password>');
    process.exit(1);
  }

  const identifier = args[0];
  const newPassword = args[1];

  if (newPassword.length < 6) {
    console.error('Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  try {
    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier }
        ]
      }
    });

    if (!user) {
      console.error(`Error: User not found with email or phone "${identifier}".`);
      process.exit(1);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log(`✅ Password successfully reset for user "${user.name}" (${user.email}).`);

  } catch (error) {
    console.error('❌ Failed to reset password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
