import cron from 'node-cron';
import prisma from '../config/database';

/**
 * Daily cron job (runs at 3:00 AM) that:
 * Deletes all refresh tokens that have expired.
 * We keep revoked tokens until they expire to detect reuse attacks,
 * but once they pass their expiration date, they are safe to delete.
 */
export const startTokenCleanupJob = () => {
  cron.schedule(
    '0 3 * * *',
    async () => {
      const now = new Date();

      try {
        const result = await prisma.refreshToken.deleteMany({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        });
      } catch (error) {
        console.error('[CRON] Token Cleanup job failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
};
