import prisma from '../../config/database';
import { AppError } from '../../shared/utils/AppError';
import { PaginationQuery } from '../../shared/utils/pagination';
import { CreateSubscriptionInput } from './subscriptions.validation';

const subscriptionInclude = {
  member: { select: { id: true, name: true, phone: true, avatar: true } },
  plan: { select: { id: true, name: true, price: true, durationDays: true } },
};

export class SubscriptionsService {
  private async verifyGymOwner(gymId: string, ownerId: string) {
    const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerId } });
    if (!gym) throw new AppError('Gym not found', 404);
    if (!gym.isActive) throw new AppError('GYM_DEACTIVATED', 403);
    return gym;
  }

  async getSubscriptions(gymId: string, ownerId: string, query: PaginationQuery, status?: string) {
    await this.verifyGymOwner(gymId, ownerId);

    const where: Record<string, unknown> = {
      member: { gymId },
      ...(status && { status }),
    };

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy === 'createdAt' ? 'createdAt' : query.sortBy]: query.sortOrder },
        include: subscriptionInclude,
      }),
      prisma.subscription.count({ where }),
    ]);
    return { subscriptions, total };
  }

  async getExpiringSubscriptions(gymId: string, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return prisma.subscription.findMany({
      where: { member: { gymId }, status: 'ACTIVE', endDate: { gte: now, lte: sevenDays } },
      include: subscriptionInclude,
      orderBy: { endDate: 'asc' },
    });
  }

  async getExpiredSubscriptions(gymId: string, ownerId: string, query: PaginationQuery) {
    await this.verifyGymOwner(gymId, ownerId);

    const where: any = {
      status: 'EXPIRED',
      member: {
        gymId,
        subscriptions: {
          none: { status: 'ACTIVE' }
        }
      }
    };

    const [subscriptions, grouped] = await Promise.all([
      prisma.subscription.findMany({
        where,
        distinct: ['memberId'],
        skip: query.skip,
        take: query.limit,
        include: subscriptionInclude,
        orderBy: { endDate: 'desc' },
      }),
      prisma.subscription.groupBy({
        by: ['memberId'],
        where,
      }),
    ]);
    
    return { subscriptions, total: grouped.length };
  }

  async createSubscription(gymId: string, data: CreateSubscriptionInput, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);

    const [member, plan] = await Promise.all([
      prisma.member.findFirst({ where: { id: data.memberId, gymId, isActive: true } }),
      prisma.plan.findFirst({ where: { id: data.planId, gymId, isActive: true } }),
    ]);
    if (!member) throw new AppError('Member not found in this gym', 404);
    if (!plan) throw new AppError('Plan not found in this gym', 404);

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    return prisma.$transaction(async (tx) => {
      // Fetch existing subscriptions ordered by createdAt descending (newest first)
      const existingSubscriptions = await tx.subscription.findMany({
        where: { memberId: data.memberId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      // Keep only the 2 newest existing subscriptions so the total will be at most 3
      // after adding the new one.
      if (existingSubscriptions.length >= 3) {
        const subscriptionsToDelete = existingSubscriptions.slice(2).map((sub) => sub.id);

        // Delete payments tied to the subscriptions we are deleting
        await tx.payment.deleteMany({
          where: {
            subscriptionId: { in: subscriptionsToDelete },
          },
        });

        // Delete the oldest subscriptions
        await tx.subscription.deleteMany({
          where: { id: { in: subscriptionsToDelete } },
        });
      }

      const subscription = await tx.subscription.create({
        data: { memberId: data.memberId, planId: data.planId, startDate, endDate, status: 'ACTIVE' },
        include: subscriptionInclude,
      });

      // Automatically create a payment record
      await tx.payment.create({
        data: {
          memberId: data.memberId,
          subscriptionId: subscription.id,
          amount: plan.price,
          status: 'COMPLETED',
          method: 'CASH', // Defaulting to CASH for now
          notes: `Automatic payment for plan: ${plan.name}`,
        },
      });

      return subscription;
    });
  }

  async updateSubscription(gymId: string, id: string, status: string, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const sub = await prisma.subscription.findFirst({ where: { id, member: { gymId } } });
    if (!sub) throw new AppError('Subscription not found', 404);
    return prisma.subscription.update({
      where: { id },
      data: { status: status as 'ACTIVE' | 'CANCELLED' | 'FROZEN' },
      include: subscriptionInclude,
    });
  }
}
