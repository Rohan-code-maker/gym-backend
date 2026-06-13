import prisma from '../../config/database';
import { AppError } from '../../shared/utils/AppError';
import { CreateGymInput, UpdateGymInput } from './gyms.validation';

export class GymsService {
  /** Get all gyms owned by user or all gyms if admin */
  async getGyms(ownerId: string, role?: string) {
    if (role === 'SUPER_ADMIN') {
      return prisma.gym.findMany({
        include: { _count: { select: { members: true, plans: true } }, owner: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    const gyms = await prisma.gym.findMany({
      where: { ownerId },
      include: { _count: { select: { members: true, plans: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (gyms.some(g => !g.isActive)) throw new AppError('GYM_DEACTIVATED', 403);
    return gyms;
  }

  /** Get single gym by ID (verifying ownership) */
  async getGymById(id: string, ownerId: string) {
    const gym = await prisma.gym.findFirst({
      where: { id, ownerId },
      include: { _count: { select: { members: true, plans: true } } },
    });
    if (!gym) throw new AppError('Gym not found', 404);
    if (!gym.isActive) throw new AppError('GYM_DEACTIVATED', 403);
    return gym;
  }

  /** Create a new gym */
  async createGym(data: CreateGymInput, ownerId: string) {
    return prisma.gym.create({
      data: { ...data, ownerId },
      include: { _count: { select: { members: true, plans: true } } },
    });
  }

  /** Update gym details */
  async updateGym(id: string, data: UpdateGymInput, ownerId: string) {
    const gym = await prisma.gym.findFirst({ where: { id, ownerId } });
    if (!gym) throw new AppError('Gym not found', 404);
    if (!gym.isActive) throw new AppError('GYM_DEACTIVATED', 403);
    return prisma.gym.update({
      where: { id },
      data,
      include: { _count: { select: { members: true, plans: true } } },
    });
  }

  /** Soft-delete a gym */
  async deleteGym(id: string, ownerId: string) {
    const gym = await prisma.gym.findFirst({ where: { id, ownerId } });
    if (!gym) throw new AppError('Gym not found', 404);
    await prisma.gym.update({ where: { id }, data: { isActive: false } });
  }

  /** Admin toggle gym status */
  async toggleGymStatus(id: string, durationDays?: number, planType?: string, startDate?: string) {
    const gym = await prisma.gym.findUnique({ where: { id } });
    if (!gym) throw new AppError('Gym not found', 404);
    
    const newIsActive = !gym.isActive;
    const data: any = { isActive: newIsActive };
    
    if (newIsActive && durationDays && planType) {
      const start = startDate ? new Date(startDate) : new Date();
      data.validUntil = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
      data.planType = planType;
    }

    return prisma.gym.update({
      where: { id },
      data,
    });
  }

  /** Get dashboard analytics for a gym */
  async getDashboardStats(gymId: string, ownerId: string) {
    const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerId } });
    if (!gym) throw new AppError('Gym not found', 404);
    if (!gym.isActive) throw new AppError('GYM_DEACTIVATED', 403);

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMembers,
      activeSubscriptions,
      expiringSoon,
      expiredSubscriptions,
      monthlyRevenue,
      recentMembers,
      expiringMembers,
    ] = await Promise.all([
      prisma.member.count({ where: { gymId, isActive: true } }),
      prisma.subscription.count({ where: { member: { gymId }, status: 'ACTIVE' } }),
      prisma.subscription.count({
        where: {
          member: { gymId },
          status: 'ACTIVE',
          endDate: { gte: now, lte: sevenDaysLater },
        },
      }),
      prisma.subscription.count({ where: { member: { gymId }, status: 'EXPIRED' } }),
      prisma.payment.aggregate({
        where: { member: { gymId }, status: 'COMPLETED', paidAt: { gte: firstOfMonth } },
        _sum: { amount: true },
      }),
      prisma.member.findMany({
        where: { gymId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, phone: true, avatar: true, joinedAt: true, subscriptions: { where: { status: 'ACTIVE' }, include: { plan: { select: { name: true } } }, take: 1 } },
      }),
      prisma.subscription.findMany({
        where: { member: { gymId }, status: 'ACTIVE', endDate: { gte: now, lte: sevenDaysLater } },
        include: { member: { select: { id: true, name: true, phone: true, avatar: true } }, plan: { select: { name: true } } },
        orderBy: { endDate: 'asc' },
        take: 10,
      }),
    ]);

    // Revenue for last 6 months
    const monthlyRevenueChart: { month: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const rev = await prisma.payment.aggregate({
        where: { member: { gymId }, status: 'COMPLETED', paidAt: { gte: start, lte: end } },
        _sum: { amount: true },
      });
      monthlyRevenueChart.push({
        month: start.toLocaleString('default', { month: 'short', year: '2-digit' }),
        amount: Number(rev._sum.amount || 0),
      });
    }

    return {
      gym: { id: gym.id, name: gym.name },
      stats: {
        totalMembers,
        activeSubscriptions,
        expiringSoon,
        expiredSubscriptions,
        monthlyRevenue: Number(monthlyRevenue._sum.amount || 0),
      },
      recentMembers,
      expiringMembers,
      revenueChart: monthlyRevenueChart,
    };
  }
}
