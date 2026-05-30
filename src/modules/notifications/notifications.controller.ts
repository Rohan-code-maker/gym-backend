import { Response } from 'express';
import { NotificationsService } from './notifications.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { AuthenticatedRequest } from '../../middleware/authenticate';

const notificationsService = new NotificationsService();

export const getNotifications = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const query = parsePagination(req);
  const { notifications, total, unreadCount } = await notificationsService.getNotifications(req.userId!, query);
  sendSuccess(res, { data: { notifications, unreadCount }, pagination: buildPaginationMeta(total, query) });
});

export const markAsRead = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  await notificationsService.markAsRead(req.params.id as string, req.userId!);
  sendSuccess(res, { message: 'Notification marked as read' });
});

export const markAllAsRead = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  await notificationsService.markAllAsRead(req.userId!);
  sendSuccess(res, { message: 'All notifications marked as read' });
});
