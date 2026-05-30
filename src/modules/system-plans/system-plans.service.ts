import prisma from '../../config/database';
import { AppError } from '../../shared/utils/AppError';
import { CreateSystemPlanInput, UpdateSystemPlanInput } from './system-plans.validation';

export class SystemPlansService {
  async getSystemPlans() {
    return prisma.systemPlan.findMany({
      orderBy: { durationDays: 'asc' },
    });
  }

  async getActiveSystemPlans() {
    return prisma.systemPlan.findMany({
      where: { isActive: true },
      orderBy: { durationDays: 'asc' },
    });
  }

  async createSystemPlan(data: CreateSystemPlanInput) {
    return prisma.systemPlan.create({
      data,
    });
  }

  async updateSystemPlan(id: string, data: UpdateSystemPlanInput) {
    const plan = await prisma.systemPlan.findUnique({ where: { id } });
    if (!plan) throw new AppError('System Plan not found', 404);

    return prisma.systemPlan.update({
      where: { id },
      data,
    });
  }

  async deleteSystemPlan(id: string) {
    const plan = await prisma.systemPlan.findUnique({ where: { id } });
    if (!plan) throw new AppError('System Plan not found', 404);

    await prisma.systemPlan.delete({ where: { id } });
  }
}
