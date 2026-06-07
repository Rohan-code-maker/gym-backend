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
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      try {
        const tokensResult = await prisma.refreshToken.deleteMany({
          where: {
            expiresAt: {
              lt: now,
            },
          },
        });

        const notificationsResult = await prisma.notification.deleteMany({
          where: {
            createdAt: {
              lt: sevenDaysAgo,
            },
          },
        });
      } catch (error) {
        console.error('[CRON] Token/Notification Cleanup job failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
};
