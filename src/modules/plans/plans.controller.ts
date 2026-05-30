import { Response } from 'express';
import { PlansService } from './plans.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../middleware/authenticate';

const plansService = new PlansService();

export const getPlans = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const plans = await plansService.getPlans(req.params.gymId as string, req.userId!);
  sendSuccess(res, { data: plans });
});

export const getPlan = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const plan = await plansService.getPlanById(req.params.gymId as string, req.params.id as string, req.userId!);
  sendSuccess(res, { data: plan });
});

export const createPlan = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const plan = await plansService.createPlan(req.params.gymId as string, req.body, req.userId!);
  sendSuccess(res, { statusCode: 201, message: 'Plan created successfully', data: plan });
});

export const updatePlan = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const plan = await plansService.updatePlan(req.params.gymId as string, req.params.id as string, req.body, req.userId!);
  sendSuccess(res, { message: 'Plan updated successfully', data: plan });
});

export const deletePlan = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  await plansService.deletePlan(req.params.gymId as string, req.params.id as string, req.userId!);
  sendSuccess(res, { message: 'Plan deleted successfully' });
});
