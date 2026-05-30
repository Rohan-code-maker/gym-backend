import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { AuthenticatedRequest } from '../../middleware/authenticate';

const paymentsService = new PaymentsService();

export const getPayments = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const query = parsePagination(req);
  const { payments, total } = await paymentsService.getPayments(req.params.gymId as string, req.userId!, query);
  sendSuccess(res, { data: payments, pagination: buildPaginationMeta(total, query) });
});

export const recordPayment = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const payment = await paymentsService.recordPayment(req.params.gymId as string, req.userId!, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Payment recorded successfully', data: payment });
});

export const getPaymentStats = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await paymentsService.getPaymentStats(req.params.gymId as string, req.userId!);
  sendSuccess(res, { data: stats });
});
