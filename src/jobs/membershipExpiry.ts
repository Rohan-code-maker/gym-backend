import cron from 'node-cron';
import prisma from '../config/database';
import { NotificationsService } from '../modules/notifications/notifications.service';

const notificationsService = new NotificationsService();
const BATCH_SIZE = 100;

/**
 * Daily cron job (runs at 5:00 AM) that:
 * 1. Auto-expires subscriptions past their end date
 * 2. Sends expiry reminders for subscriptions expiring within 7 days
 */
export const startMembershipExpiryJob = () => {
  cron.schedule(
    '0 10 * * *',
    async () => {
      const now = new Date();
      console.log(`[CRON] Starting Membership/Gym expiry job at ${now.toISOString()}`);

      try {
        // ---------------------------------------------------------
        // 1. Mark past-due subscriptions as EXPIRED and notify owner
        // ---------------------------------------------------------
        let subCursor: string | undefined = undefined;
        while (true) {
          const expiredSubscriptions: any[] = await prisma.subscription.findMany({
            take: BATCH_SIZE,
            skip: subCursor ? 1 : 0,
            cursor: subCursor ? { id: subCursor } : undefined,
            where: { status: 'ACTIVE', endDate: { lt: now } },
            orderBy: { id: 'asc' },
            include: {
              member: { include: { gym: { include: { owner: { select: { id: true, fcmToken: true } } } } } },
              plan: { select: { name: true } },
            },
          });

          if (expiredSubscriptions.length === 0) break;
          subCursor = expiredSubscriptions[expiredSubscriptions.length - 1].id;

          // Process this batch in parallel
          await Promise.all(expiredSubscriptions.map(async (sub) => {
            try {
              // Update status first so it doesn't get retried indefinitely if notification fails
              await prisma.subscription.update({
                where: { id: sub.id },
                data: { status: 'EXPIRED' },
              });

              const ownerId = sub.member.gym.owner.id;
              const title = '🚨 Membership Expired';
              const body = `${sub.member.name}'s ${sub.plan.name} plan has expired.`;

              // Wait for both notifications for this user concurrently
              await Promise.all([
                notificationsService.createInAppNotification(ownerId, title, body, 'EXPIRY_REMINDER', {
                  memberId: sub.memberId,
                  subscriptionId: sub.id,
                }),
                notificationsService.sendPushNotification(ownerId, title, body)
              ]);
            } catch (err) {
              console.error(`[CRON] Failed to process expired subscription ${sub.id}:`, err);
            }
          }));
        }

        // ---------------------------------------------------------
        // 2. Find subscriptions expiring in the next 7 days
        // ---------------------------------------------------------
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        let soonCursor: string | undefined = undefined;
        while (true) {
          const expiringSoon: any[] = await prisma.subscription.findMany({
            take: BATCH_SIZE,
            skip: soonCursor ? 1 : 0,
            cursor: soonCursor ? { id: soonCursor } : undefined,
            where: {
              status: 'ACTIVE',
              endDate: { gte: now, lte: sevenDaysLater },
            },
            orderBy: { id: 'asc' },
            include: {
              member: { include: { gym: { include: { owner: { select: { id: true, fcmToken: true } } } } } },
              plan: { select: { name: true } },
            },
          });

          if (expiringSoon.length === 0) break;
          soonCursor = expiringSoon[expiringSoon.length - 1].id;

          await Promise.all(expiringSoon.map(async (sub) => {
            try {
              const daysLeft = Math.ceil((sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const ownerId = sub.member.gym.owner.id;
              const title = '⚠️ Membership Expiring Soon';
              const body = `${sub.member.name}'s ${sub.plan.name} expires in ${daysLeft} day(s).`;

              await Promise.all([
                notificationsService.createInAppNotification(ownerId, title, body, 'EXPIRY_REMINDER', {
                  memberId: sub.memberId,
                  subscriptionId: sub.id,
                  daysLeft,
                }),
                notificationsService.sendPushNotification(ownerId, title, body)
              ]);
            } catch (err) {
              console.error(`[CRON] Failed to notify expiring soon subscription ${sub.id}:`, err);
            }
          }));
        }

        // Fetch super admins once for the gym notifications
        const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });

        // ---------------------------------------------------------
        // 3. Check for expired Gym Owner accounts
        // ---------------------------------------------------------
        let gymExpiredCursor: string | undefined = undefined;
        while (true) {
          const expiredGyms: any[] = await prisma.gym.findMany({
            take: BATCH_SIZE,
            skip: gymExpiredCursor ? 1 : 0,
            cursor: gymExpiredCursor ? { id: gymExpiredCursor } : undefined,
            where: { isActive: true, validUntil: { lt: now } },
            orderBy: { id: 'asc' },
            include: { owner: { select: { id: true, name: true, fcmToken: true } } },
          });

          if (expiredGyms.length === 0) break;
          gymExpiredCursor = expiredGyms[expiredGyms.length - 1].id;

          await Promise.all(expiredGyms.map(async (gym) => {
            try {
              // Deactivate gym
              await prisma.gym.update({
                where: { id: gym.id },
                data: { isActive: false },
              });

              // Notify Gym Owner
              await Promise.all([
                notificationsService.createInAppNotification(
                  gym.owner.id,
                  '🚨 Gym Plan Expired',
                  `Your gym plan has expired. Your account is deactivated. Please contact the Super Admin to renew.`,
                  'GENERAL',
                  { gymId: gym.id }
                ),
                notificationsService.sendPushNotification(gym.owner.id, '🚨 Gym Plan Expired', 'Your gym plan has expired and your account has been deactivated.')
              ]);

              // Notify Super Admins
              await Promise.all(superAdmins.map(async (admin) => {
                await notificationsService.createInAppNotification(
                  admin.id,
                  '🚨 Gym Plan Expired',
                  `${gym.name} (Owner: ${gym.owner.name}) plan has expired and the gym has been deactivated.`,
                  'GENERAL',
                  { gymId: gym.id }
                );
                await notificationsService.sendPushNotification(admin.id, '🚨 Gym Plan Expired', `${gym.name} plan has expired and was deactivated.`);
              }));
            } catch (err) {
              console.error(`[CRON] Failed to process expired gym ${gym.id}:`, err);
            }
          }));
        }

        // ---------------------------------------------------------
        // 4. Warn for Gym Owner accounts expiring soon (within 24 hours)
        // ---------------------------------------------------------
        const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
        let gymExpiringCursor: string | undefined = undefined;
        while (true) {
          const expiringGyms: any[] = await prisma.gym.findMany({
            take: BATCH_SIZE,
            skip: gymExpiringCursor ? 1 : 0,
            cursor: gymExpiringCursor ? { id: gymExpiringCursor } : undefined,
            where: { isActive: true, validUntil: { gte: now, lte: oneDayLater } },
            orderBy: { id: 'asc' },
            include: { owner: { select: { id: true, name: true, fcmToken: true } } },
          });

          if (expiringGyms.length === 0) break;
          gymExpiringCursor = expiringGyms[expiringGyms.length - 1].id;

          await Promise.all(expiringGyms.map(async (gym) => {
            try {
              // Notify Gym Owner
              await Promise.all([
                notificationsService.createInAppNotification(
                  gym.owner.id,
                  '⚠️ Gym Plan Expiring Soon',
                  `Your gym plan (${gym.planType || 'Trial'}) will expire in less than 24 hours.`,
                  'EXPIRY_REMINDER',
                  { gymId: gym.id }
                ),
                notificationsService.sendPushNotification(gym.owner.id, '⚠️ Gym Plan Expiring Soon', `Your gym plan will expire in less than 24 hours.`)
              ]);

              // Notify Super Admins
              await Promise.all(superAdmins.map(async (admin) => {
                await notificationsService.createInAppNotification(
                  admin.id,
                  '⚠️ Gym Plan Expiring Soon',
                  `${gym.name} (Owner: ${gym.owner.name}) plan is expiring in less than 24 hours.`,
                  'GENERAL',
                  { gymId: gym.id }
                );
                await notificationsService.sendPushNotification(admin.id, '⚠️ Gym Plan Expiring Soon', `${gym.name} is expiring in less than 24 hours.`);
              }));
            } catch (err) {
              console.error(`[CRON] Failed to notify expiring soon gym ${gym.id}:`, err);
            }
          }));
        }

        console.log(`[CRON] Membership/Gym expiry job completed successfully.`);
      } catch (error) {
        console.error('[CRON] Membership/Gym expiry check failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
};
