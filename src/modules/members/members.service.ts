import prisma from '../../config/database';
import { AppError } from '../../shared/utils/AppError';
import { PaginationQuery } from '../../shared/utils/pagination';
import { CreateMemberInput, UpdateMemberInput } from './members.validation';
import { cloudinary } from '../../config/cloudinary';

const extractPublicId = (url: string) => {
  try {
    const splitUrl = url.split('/upload/');
    if (splitUrl.length < 2) return null;
    const pathParts = splitUrl[1].split('/');
    if (pathParts[0].match(/^v\d+$/)) {
      pathParts.shift();
    }
    const fullPath = pathParts.join('/');
    const lastDotIndex = fullPath.lastIndexOf('.');
    return lastDotIndex !== -1 ? fullPath.substring(0, lastDotIndex) : fullPath;
  } catch (e) {
    return null;
  }
};

const memberInclude = {
  subscriptions: {
    include: { plan: { select: { id: true, name: true, price: true, durationDays: true } } },
    take: 1,
    orderBy: { createdAt: 'desc' as const },
  },
};

export class MembersService {
  /** Verify gym belongs to owner */
  private async verifyGymOwner(gymId: string, ownerId: string) {
    const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerId } });
    if (!gym) throw new AppError('Gym not found', 404);
    if (!gym.isActive) throw new AppError('GYM_DEACTIVATED', 403);
    return gym;
  }

  /** Get paginated, searchable members list */
  async getMembers(gymId: string, ownerId: string, query: PaginationQuery, status?: string) {
    await this.verifyGymOwner(gymId, ownerId);

    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = {
      gymId,
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
      ...(status === 'ACTIVE' && {
        subscriptions: {
          some: { status: 'ACTIVE', endDate: { gte: now } }
        }
      }),
      ...(status === 'INACTIVE' && {
        NOT: {
          subscriptions: {
            some: {
              OR: [
                { status: 'ACTIVE' },
                { status: 'EXPIRED' }
              ]
            }
          }
        }
      }),
      ...(status === 'EXPIRED' && {
        OR: [
          {
            subscriptions: {
              some: { status: 'EXPIRED' }
            }
          },
          {
            subscriptions: {
              some: { status: 'ACTIVE', endDate: { lt: now } }
            }
          }
        ],
        NOT: {
          subscriptions: {
            some: { status: 'ACTIVE', endDate: { gte: now } }
          }
        }
      }),
      ...(status === 'EXPIRING' && {
        subscriptions: {
          some: { status: 'ACTIVE', endDate: { gte: now, lte: sevenDaysLater } }
        }
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search } },
        ],
      }),
    };

    const [members, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: memberInclude,
      }),
      prisma.member.count({ where }),
    ]);

    return { members, total };
  }

  /** Get single member by ID */
  async getMemberById(gymId: string, id: string, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const member = await prisma.member.findFirst({
      where: { id, gymId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: { orderBy: { paidAt: 'desc' }, take: 10 },
      },
    });
    if (!member) throw new AppError('Member not found', 404);
    return member;
  }

  async createMember(gymId: string, data: CreateMemberInput, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);

    // Check for duplicate phone number in this gym
    const existing = await prisma.member.findFirst({ where: { gymId, phone: data.phone } });
    if (existing) {
      throw new AppError('A member with this mobile number already exists in this gym', 409);
    }

    return prisma.member.create({
      data: {
        ...data,
        email: data.email || undefined,
        gymId,
      },
      include: memberInclude,
    });
  }

  async updateMember(gymId: string, id: string, data: UpdateMemberInput, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const member = await prisma.member.findFirst({ where: { id, gymId } });
    if (!member) throw new AppError('Member not found', 404);

    if (data.phone && data.phone !== member.phone) {
      const existing = await prisma.member.findFirst({ where: { gymId, phone: data.phone } });
      if (existing) {
        throw new AppError('A member with this mobile number already exists in this gym', 409);
      }
    }

    if (data.avatar && member.avatar && data.avatar !== member.avatar) {
      const publicId = extractPublicId(member.avatar);
      if (publicId) {
        cloudinary.uploader.destroy(publicId).catch(err => console.error('Cloudinary delete error:', err));
      }
    }

    return prisma.member.update({
      where: { id },
      data: {
        ...data,
      },
      include: memberInclude,
    });
  }

  /** Hard-delete a member */
  async deleteMember(gymId: string, id: string, ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    const member = await prisma.member.findFirst({ where: { id, gymId } });
    if (!member) throw new AppError('Member not found', 404);

    if (member.avatar) {
      const publicId = extractPublicId(member.avatar);
      if (publicId) {
        cloudinary.uploader.destroy(publicId).catch(err => console.error('Cloudinary delete error:', err));
      }
    }

    await prisma.member.delete({ where: { id } });
  }

  /** Bulk hard-delete members */
  async deleteMembers(gymId: string, ids: string[], ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);

    const members = await prisma.member.findMany({ where: { gymId, id: { in: ids } } });
    for (const member of members) {
      if (member.avatar) {
        const publicId = extractPublicId(member.avatar);
        if (publicId) {
          cloudinary.uploader.destroy(publicId).catch(err => console.error('Cloudinary delete error:', err));
        }
      }
    }

    await prisma.member.deleteMany({
      where: {
        gymId,
        id: { in: ids }
      }
    });
  }
}
