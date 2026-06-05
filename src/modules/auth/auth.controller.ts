import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { catchAsync } from '../../shared/utils/catchAsync';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import prisma from '../../config/database';

const authService = new AuthService();

/** POST /api/v1/auth/register */
export const register = catchAsync(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.register(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Registration successful', data: { user, ...tokens } });
});

/** POST /api/v1/auth/login */
export const login = catchAsync(async (req: Request, res: Response) => {
  const { user, tokens } = await authService.login(req.body);
  sendSuccess(res, { message: 'Login successful', data: { user, ...tokens } });
});

/** POST /api/v1/auth/refresh-token */
export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const tokens = await authService.refreshTokens(req.body.refreshToken);
  sendSuccess(res, { message: 'Token refreshed', data: tokens });
});

/** POST /api/v1/auth/logout */
export const logout = catchAsync(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  sendSuccess(res, { message: 'Logged out successfully' });
});

/** GET /api/v1/auth/me */
export const getMe = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, createdAt: true },
  });
  sendSuccess(res, { data: user });
});

/** PATCH /api/v1/auth/me */
export const updateProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, avatar } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { name, phone, avatar },
    select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
  });
  sendSuccess(res, { message: 'Profile updated', data: user });
});

/** POST /api/v1/auth/fcm-token */
export const updateFcmToken = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { fcmToken } = req.body;
  if (fcmToken) {
    // Remove this token from any other users to prevent them from getting notifications on this device
    await prisma.user.updateMany({ where: { fcmToken, id: { not: req.userId } }, data: { fcmToken: null } });
  }
  await prisma.user.update({ where: { id: req.userId }, data: { fcmToken } });
  sendSuccess(res, { message: 'FCM token updated' });
});

/** DELETE /api/v1/auth/users/:id */
export const deleteUser = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  await authService.deleteUser(req.params.id as string);
  sendSuccess(res, { message: 'User deleted successfully' });
});

/** PATCH /api/v1/auth/change-password */
export const changePassword = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;
  await authService.changePassword(req.userId as string, oldPassword, newPassword);
  sendSuccess(res, { message: 'Password changed successfully' });
});

/** POST /api/v1/auth/forgot-password */
export const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, { message: 'If an account with that email exists, a password reset link has been sent.' });
});

/** POST /api/v1/auth/reset-password */
export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  sendSuccess(res, { message: 'Password reset successfully' });
});
