import { Request, Response } from 'express';
import { SystemPlansService } from './system-plans.service';
import { AppError } from '../../shared/utils/AppError';

const systemPlansService = new SystemPlansService();

export class SystemPlansController {
  async getSystemPlans(req: Request, res: Response) {
    // If Super Admin, return all. Otherwise, only active plans.
    const userRole = (req as any).userRole;
    let plans;
    if (userRole === 'SUPER_ADMIN') {
      plans = await systemPlansService.getSystemPlans();
    } else {
      plans = await systemPlansService.getActiveSystemPlans();
    }
    res.json({ success: true, data: plans });
  }

  async createSystemPlan(req: Request, res: Response) {
    const plan = await systemPlansService.createSystemPlan(req.body);
    res.status(201).json({ success: true, data: plan });
  }

  async updateSystemPlan(req: Request, res: Response) {
    const plan = await systemPlansService.updateSystemPlan(req.params.id as string, req.body);
    res.json({ success: true, data: plan });
  }

  async deleteSystemPlan(req: Request, res: Response) {
    await systemPlansService.deleteSystemPlan(req.params.id as string);
    res.json({ success: true, message: 'System Plan deleted successfully' });
  }
}
