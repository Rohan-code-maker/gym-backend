import prisma from '../../config/database';
import { AppError } from '../../shared/utils/AppError';
import { PaginationQuery } from '../../shared/utils/pagination';
import { CreateMemberInput, UpdateMemberInput } from './members.validation';

const memberInclude = {
  subscriptions: {
    where: { status: 'ACTIVE' as const },
    include: { plan: { select: { id: true, name: true, price: true, durationDays: true } } },
    take: 1,
    orderBy: { createdAt: 'desc' as const },
  },
};

export class MembersService {
  /** Verify gym belongs to owner */
  private async verifyGymOwner(gymId: string, ownerId: string) {
    const gym = await prisma.gym.findFirst({ where: { id: gymId, ownerId, isActive: true } });
    if (!gym) throw new AppError('Gym not found', 404);
    return gym;
  }

  /** Get paginated, searchable members list */
  async getMembers(gymId: string, ownerId: string, query: PaginationQuery, status?: string) {
    await this.verifyGymOwner(gymId, ownerId);

    const where: Record<string, unknown> = {
      gymId,
      ...(status === 'active' && { isActive: true }),
      ...(status === 'inactive' && { isActive: false }),
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
    await prisma.member.delete({ where: { id } });
  }

  /** Bulk hard-delete members */
  async deleteMembers(gymId: string, ids: string[], ownerId: string) {
    await this.verifyGymOwner(gymId, ownerId);
    await prisma.member.deleteMany({
      where: {
        gymId,
        id: { in: ids }
      }
    });
  }
}
