import { Response } from 'express';
import { GymsService } from './gyms.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../middleware/authenticate';

const gymsService = new GymsService();

export const getGyms = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const gyms = await gymsService.getGyms(req.userId!, req.userRole);
  sendSuccess(res, { data: gyms });
});

export const getGym = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const gym = await gymsService.getGymById(req.params.id as string, req.userId!);
  sendSuccess(res, { data: gym });
});

export const createGym = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const gym = await gymsService.createGym(req.body, req.userId!);
  sendSuccess(res, { statusCode: 201, message: 'Gym created successfully', data: gym });
});

export const updateGym = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const gym = await gymsService.updateGym(req.params.id as string, req.body, req.userId!);
  sendSuccess(res, { message: 'Gym updated successfully', data: gym });
});

export const deleteGym = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  await gymsService.deleteGym(req.params.id as string, req.userId!);
  sendSuccess(res, { message: 'Gym deleted successfully' });
});

export const getDashboard = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await gymsService.getDashboardStats(req.params.id as string, req.userId!);
  sendSuccess(res, { data: stats });
});

export const toggleStatus = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { durationDays, planType, startDate } = req.body;
  const gym = await gymsService.toggleGymStatus(req.params.id as string, durationDays, planType, startDate);
  sendSuccess(res, { message: 'Gym status updated successfully', data: gym });
});
