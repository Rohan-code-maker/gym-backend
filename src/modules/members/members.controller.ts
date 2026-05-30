import { Response } from 'express';
import { MembersService } from './members.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { AuthenticatedRequest } from '../../middleware/authenticate';

const membersService = new MembersService();

export const getMembers = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const query = parsePagination(req);
  const status = req.query.status as string | undefined;
  const { members, total } = await membersService.getMembers(req.params.gymId as string, req.userId!, query, status);
  sendSuccess(res, { data: members, pagination: buildPaginationMeta(total, query) });
});

export const getMember = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const member = await membersService.getMemberById(req.params.gymId as string, req.params.id as string, req.userId!);
  sendSuccess(res, { data: member });
});

export const createMember = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const member = await membersService.createMember(req.params.gymId as string, req.body, req.userId!);
  sendSuccess(res, { statusCode: 201, message: 'Member added successfully', data: member });
});

export const updateMember = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const member = await membersService.updateMember(req.params.gymId as string, req.params.id as string, req.body, req.userId!);
  sendSuccess(res, { message: 'Member updated successfully', data: member });
});

export const deleteMember = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  await membersService.deleteMember(req.params.gymId as string, req.params.id as string, req.userId!);
  sendSuccess(res, { message: 'Member removed successfully' });
});

export const deleteMembers = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { ids } = req.body;
  await membersService.deleteMembers(req.params.gymId as string, ids, req.userId!);
  sendSuccess(res, { message: 'Members removed successfully' });
});
