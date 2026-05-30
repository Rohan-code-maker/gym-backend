import prisma from '../../config/database';
import { AppError } from '../../shared/utils/AppError';
import { CreatePlanInput, UpdatePlanInput } from './plans.validation';

export class PlansService {
  private async verifyGymOwner(gymId: string, ownerId: string) {
    const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerId, isActive: true } });
    if (!gym) throw new AppError('Gym not found', 404);
    return gym;
  }

  async getPlans(gymId: string, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    return prisma.plan.findMany({
      where: { gymId },
      include: { _count: { select: { subscriptions: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getPlanById(gymId: string, id: string, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const plan = await prisma.plan.findFirst({
      where: { id, gymId },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!plan) throw new AppError('Plan not found', 404);
    return plan;
  }

  async createPlan(gymId: string, data: CreatePlanInput, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    return prisma.plan.create({ data: { ...data, gymId } });
  }

  async updatePlan(gymId: string, id: string, data: UpdatePlanInput, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const plan = await prisma.plan.findFirst({ where: { id, gymId } });
    if (!plan) throw new AppError('Plan not found', 404);
    return prisma.plan.update({ where: { id }, data });
  }

  async deletePlan(gymId: string, id: string, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const plan = await prisma.plan.findFirst({ where: { id, gymId } });
    if (!plan) throw new AppError('Plan not found', 404);
    const activeSubscriptions = await prisma.subscription.count({ where: { planId: id, status: 'ACTIVE' } });
    if (activeSubscriptions > 0) throw new AppError('Cannot delete plan with active subscriptions', 400);
    await prisma.plan.update({ where: { id }, data: { isActive: false } });
  }
}
