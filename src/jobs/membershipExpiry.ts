import cron from 'node-cron';
import prisma from '../config/database';
import { NotificationsService } from '../modules/notifications/notifications.service';

const notificationsService = new NotificationsService();

/**
 * Daily cron job (runs at 9:00 AM) that:
 * 1. Auto-expires subscriptions past their end date
 * 2. Sends expiry reminders for subscriptions expiring within 7 days
 */
export const startMembershipExpiryJob = () => {
  cron.schedule(
    '0 5 * * *',
    async () => {
      const now = new Date();

      try {
        // 1. Mark past-due subscriptions as EXPIRED
        const expired = await prisma.subscription.updateMany({
          where: { status: 'ACTIVE', endDate: { lt: now } },
          data: { status: 'EXPIRED' },
        });

        // 2. Find subscriptions expiring in the next 7 days
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const expiringSoon = await prisma.subscription.findMany({
          where: {
            status: 'ACTIVE',
            endDate: { gte: now, lte: sevenDaysLater },
          },
          include: {
            member: { include: { gym: { include: { owner: { select: { id: true, fcmToken: true } } } } } },
            plan: { select: { name: true } },
          },
        });

        for (const sub of expiringSoon) {
          const daysLeft = Math.ceil((sub.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const ownerId = sub.member.gym.owner.id;
          const title = '⚠️ Membership Expiring Soon';
          const body = `${sub.member.name}'s ${sub.plan.name} expires in ${daysLeft} day(s).`;

          // Create in-app notification
          await notificationsService.createInAppNotification(ownerId, title, body, 'EXPIRY_REMINDER', {
            memberId: sub.memberId,
            subscriptionId: sub.id,
            daysLeft,
          });

          // Send push notification
          await notificationsService.sendPushNotification(ownerId, title, body);
        }

        // 3. Check for expired Gym Owner accounts
        const expiredGyms = await prisma.gym.findMany({
          where: { isActive: true, validUntil: { lt: now } },
          include: { owner: { select: { id: true, name: true, fcmToken: true } } },
        });

        if (expiredGyms.length > 0) {
          // Deactivate them
          await prisma.gym.updateMany({
            where: { id: { in: expiredGyms.map(g => g.id) } },
            data: { isActive: false },
          });

          // Notify Super Admins and Gym Owners
          const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
          for (const gym of expiredGyms) {
            // Notify the gym owner that they have expired
            await notificationsService.createInAppNotification(
              gym.owner.id,
              '🚨 Gym Plan Expired',
              `Your gym plan has expired. Your account is deactivated. Please contact the Super Admin to renew.`,
              'GENERAL',
              { gymId: gym.id }
            );
            await notificationsService.sendPushNotification(gym.owner.id, '🚨 Gym Plan Expired', 'Your gym plan has expired and your account has been deactivated.');

            for (const admin of superAdmins) {
              await notificationsService.createInAppNotification(
                admin.id,
                '🚨 Gym Plan Expired',
                `${gym.name} (Owner: ${gym.owner.name}) plan has expired and the gym has been deactivated.`,
                'GENERAL',
                { gymId: gym.id }
              );
              await notificationsService.sendPushNotification(admin.id, '🚨 Gym Plan Expired', `${gym.name} plan has expired and was deactivated.`);
            }
          }
        }

        // 4. Warn for Gym Owner accounts expiring soon (within 24 hours)
        const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
        const expiringGyms = await prisma.gym.findMany({
          where: { isActive: true, validUntil: { gte: now, lte: oneDayLater } },
          include: { owner: { select: { id: true, name: true, fcmToken: true } } },
        });

        if (expiringGyms.length > 0) {
          const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' } });
          for (const gym of expiringGyms) {
            // Notify Gym Owner
            await notificationsService.createInAppNotification(
              gym.owner.id,
              '⚠️ Gym Plan Expiring Soon',
              `Your gym plan (${gym.planType || 'Trial'}) will expire in less than 24 hours.`,
              'EXPIRY_REMINDER',
              { gymId: gym.id }
            );
            await notificationsService.sendPushNotification(gym.owner.id, '⚠️ Gym Plan Expiring Soon', `Your gym plan will expire in less than 24 hours.`);

            // Notify Super Admins
            for (const admin of superAdmins) {
              await notificationsService.createInAppNotification(
                admin.id,
                '⚠️ Gym Plan Expiring Soon',
                `${gym.name} (Owner: ${gym.owner.name}) plan is expiring in less than 24 hours.`,
                'GENERAL',
                { gymId: gym.id }
              );
              await notificationsService.sendPushNotification(admin.id, '⚠️ Gym Plan Expiring Soon', `${gym.name} is expiring in less than 24 hours.`);
            }
          }
        }

      } catch (error) {
        console.error('[CRON] Membership/Gym expiry check failed:', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );
};
