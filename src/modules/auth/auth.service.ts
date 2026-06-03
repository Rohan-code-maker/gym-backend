import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../shared/utils/AppError';
import { RegisterInput, LoginInput } from './auth.validation';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /** Register a new gym owner */
  async register(data: RegisterInput): Promise<{ user: object; tokens: TokenPair }> {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          ...(data.phone ? [{ phone: data.phone }] : [])
        ]
      }
    });
    if (existing) throw new AppError('Email or mobile number already in use', 409);

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        phone: data.phone,
        role: 'GYM_OWNER',
        gyms: {
          create: {
            name: data.name,
            phone: data.phone,
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day trial
            planType: 'TRIAL',
          }
        }
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });

    const tokens = await this.generateTokenPair(user.id, user.role);
    return { user, tokens };
  }

  /** Login with email and password */
  async login(data: LoginInput): Promise<{ user: object; tokens: TokenPair }> {
    const user = await prisma.user.findFirst({ 
      where: {
        OR: [
          { email: data.email },
          { phone: data.email }
        ]
      },
      include: { gyms: true }
    });
    if (!user || !user.isActive) throw new AppError('Invalid email or password', 401);

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) throw new AppError('Invalid email or password', 401);

    if (user.role === 'GYM_OWNER') {
      const gym = user.gyms[0];
      if (gym) {
        if (!gym.isActive) {
          throw new AppError('Your gym account has been deactivated by the Admin.', 403);
        }
        if (gym.validUntil && gym.validUntil < new Date()) {
          // If expired, auto-deactivate
          await prisma.gym.update({ where: { id: gym.id }, data: { isActive: false } });
          throw new AppError('Your plan has expired. Please contact Admin to renew.', 403);
        }
      }
    }

    const tokens = await this.generateTokenPair(user.id, user.role);
    const { password: _, gyms: __, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  /** Rotate refresh token — returns new token pair */
  async refreshTokens(oldRefreshToken: string): Promise<TokenPair> {
    let payload: { userId: string; role: string; family: string };
    try {
      payload = jwt.verify(oldRefreshToken, config.jwt.refreshSecret) as typeof payload;
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: oldRefreshToken } });

    if (!stored || stored.isRevoked) {
      // Reuse detected — revoke entire family
      if (stored?.family) {
        await prisma.refreshToken.updateMany({
          where: { family: stored.family },
          data: { isRevoked: true },
        });
      }
      throw new AppError('Token reuse detected. Please login again.', 401);
    }

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });
      throw new AppError('Refresh token expired. Please login again.', 401);
    }

    // Revoke old token
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });

    // Issue new pair with same family
    return this.generateTokenPair(payload.userId, payload.role, stored.family);
  }

  /** Logout — revoke refresh token family */
  async logout(refreshToken: string): Promise<void> {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { isRevoked: true },
      });
    }
  }

  /** Generate access + refresh token pair and persist refresh token */
  private async generateTokenPair(
    userId: string,
    role: string,
    family?: string
  ): Promise<TokenPair> {
    const tokenFamily = family || crypto.randomUUID();

    const accessToken = jwt.sign(
      { userId, role },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiresIn } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      { userId, role, family: tokenFamily },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions
    );

    // Persist refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: { token: refreshToken, family: tokenFamily, userId, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  /** Admin — delete a user */
  async deleteUser(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);
    
    await prisma.user.delete({ where: { id: userId } });
  }
}
