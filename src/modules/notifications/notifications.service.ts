import prisma from '../../config/database';
import { getMessaging } from '../../config/firebase';
import { PaginationQuery } from '../../shared/utils/pagination';

export class NotificationsService {
  async getNotifications(userId: string, query: PaginationQuery) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
    return { notifications, total, unreadCount };
  }

  async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  async sendPushNotification(userId: string, title: string, body: string, data?: Record<string, string>) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    if (!user?.fcmToken) return;

    const messaging = getMessaging();
    if (!messaging) return;

    try {
      await messaging.send({ token: user.fcmToken, notification: { title, body }, data: data || {} });
    } catch (err) {
      console.error('FCM send error:', err);
      // Remove stale token
      await prisma.user.update({ where: { id: userId }, data: { fcmToken: null } });
    }
  }

  async createInAppNotification(userId: string, title: string, body: string, type: 'EXPIRY_REMINDER' | 'PAYMENT_DUE' | 'RENEWAL' | 'GENERAL', data?: object) {
    return prisma.notification.create({
      data: { userId, title, body, type, data: data || {} },
    });
  }
}
