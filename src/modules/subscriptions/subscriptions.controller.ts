import { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { AuthenticatedRequest } from '../../middleware/authenticate';

const subscriptionsService = new SubscriptionsService();

export const getSubscriptions = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const query = parsePagination(req);
  const status = req.query.status as string | undefined;
  const { subscriptions, total } = await subscriptionsService.getSubscriptions(req.params.gymId as string, req.userId!, query, status);
  sendSuccess(res, { data: subscriptions, pagination: buildPaginationMeta(total, query) });
});

export const getExpiringSubscriptions = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const data = await subscriptionsService.getExpiringSubscriptions(req.params.gymId as string, req.userId!);
  sendSuccess(res, { data });
});

export const getExpiredSubscriptions = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const query = parsePagination(req);
  const { subscriptions, total } = await subscriptionsService.getExpiredSubscriptions(req.params.gymId as string, req.userId!, query);
  sendSuccess(res, { data: subscriptions, pagination: buildPaginationMeta(total, query) });
});

export const createSubscription = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const subscription = await subscriptionsService.createSubscription(req.params.gymId as string, req.body, req.userId!);
  sendSuccess(res, { statusCode: 201, message: 'Subscription created successfully', data: subscription });
});

export const updateSubscription = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const subscription = await subscriptionsService.updateSubscription(req.params.gymId as string, req.params.id as string, req.body.status, req.userId!);
  sendSuccess(res, { message: 'Subscription updated successfully', data: subscription });
});
