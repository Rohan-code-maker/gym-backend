import prisma from '../../config/database';
import { AppError } from '../../shared/utils/AppError';
import { PaginationQuery } from '../../shared/utils/pagination';

export class PaymentsService {
  private async verifyGymOwner(gymId: string, ownerId: string) {
    const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerId } });
    if (!gym) throw new AppError('Gym not found', 404);
    if (!gym.isActive) throw new AppError('GYM_DEACTIVATED', 403);
    return gym;
  }

  async getPayments(gymId: string, ownerId: string, query: PaginationQuery) {
    await this.verifyGymOwner(gymId, ownerId);
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { member: { gymId } },
        skip: query.skip,
        take: query.limit,
        orderBy: { paidAt: 'desc' },
        include: {
          member: { select: { id: true, name: true, avatar: true } },
          subscription: { include: { plan: { select: { name: true } } } },
        },
      }),
      prisma.payment.count({ where: { member: { gymId } } }),
    ]);
    return { payments, total };
  }

  async recordPayment(gymId: string, ownerId: string, data: {
    memberId: string;
    subscriptionId?: string;
    amount: number;
    method: string;
    notes?: string;
  }) {
    await this.verifyGymOwner(gymId, ownerId);
    const member = await prisma.member.findFirst({ where: { id: data.memberId, gymId } });
    if (!member) throw new AppError('Member not found', 404);

    return prisma.payment.create({
      data: {
        memberId: data.memberId,
        subscriptionId: data.subscriptionId,
        amount: data.amount,
        method: data.method as 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER',
        notes: data.notes,
        status: 'COMPLETED',
      },
      include: {
        member: { select: { id: true, name: true } },
        subscription: { include: { plan: { select: { name: true } } } },
      },
    });
  }

  async getPaymentStats(gymId: string, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalRevenue, monthlyRevenue, yearlyRevenue, paymentsByMethod] = await Promise.all([
      prisma.payment.aggregate({ where: { member: { gymId }, status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { member: { gymId }, status: 'COMPLETED', paidAt: { gte: firstOfMonth } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { member: { gymId }, status: 'COMPLETED', paidAt: { gte: firstOfYear } }, _sum: { amount: true } }),
      prisma.payment.groupBy({ by: ['method'], where: { member: { gymId }, status: 'COMPLETED' }, _sum: { amount: true }, _count: true }),
    ]);

    return {
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
      yearlyRevenue: Number(yearlyRevenue._sum.amount || 0),
      paymentsByMethod: paymentsByMethod.map((p) => ({
        method: p.method,
        count: p._count,
        amount: Number(p._sum.amount || 0),
      })),
    };
  }
}
