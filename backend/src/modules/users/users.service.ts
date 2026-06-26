import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { UpdatePrivacyDto, UpdateProfileDto } from './dto';

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  status: true,
  lastSeenAt: true,
  createdAt: true,
  profile: {
    select: {
      displayName: true,
      bio: true,
      avatarUrl: true,
      lastSeenPrivacy: true,
      profilePhotoPrivacy: true,
      bioPrivacy: true,
      readReceiptsEnabled: true,
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...publicUserSelect, settings: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getById(userId: string, viewerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');

    const online = await this.redis.isOnline(userId);
    const lastSeen = online ? null : await this.redis.getLastSeen(userId);

    return this.applyPrivacy(user, viewerId, { online, lastSeen });
  }

  async search(query: string, viewerId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: viewerId } },
          { isActive: true },
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { email: { equals: query, mode: 'insensitive' } },
              { profile: { displayName: { contains: query, mode: 'insensitive' } } },
            ],
          },
        ],
      },
      select: publicUserSelect,
      take: 20,
    });

    // Exclude users who blocked the viewer or whom the viewer blocked.
    const blocks = await this.prisma.contact.findMany({
      where: {
        status: 'BLOCKED',
        OR: [{ ownerId: viewerId }, { targetId: viewerId }],
      },
      select: { ownerId: true, targetId: true },
    });
    const blockedIds = new Set(
      blocks.flatMap((b) => [b.ownerId, b.targetId]).filter((id) => id !== viewerId),
    );

    return users.filter((u) => !blockedIds.has(u.id));
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.profile.update({ where: { userId }, data: dto });
    await this.redis.del(`cache:user:${userId}`);
    return this.getMe(userId);
  }

  async updatePrivacy(userId: string, dto: UpdatePrivacyDto) {
    await this.prisma.profile.update({ where: { userId }, data: dto });
    return this.getMe(userId);
  }

  /** Hides fields the viewer is not allowed to see based on privacy settings. */
  private async applyPrivacy(
    user: any,
    viewerId: string,
    presence: { online: boolean; lastSeen: number | null },
  ) {
    const isContact = await this.areContacts(viewerId, user.id);
    const allowed = (level: string) => level === 'EVERYONE' || (level === 'CONTACTS' && isContact);

    const profile = { ...user.profile };
    if (!allowed(profile.bioPrivacy)) profile.bio = null;
    if (!allowed(profile.profilePhotoPrivacy)) profile.avatarUrl = null;

    const showLastSeen = allowed(profile.lastSeenPrivacy);
    return {
      ...user,
      profile,
      isOnline: showLastSeen ? presence.online : false,
      lastSeenAt: showLastSeen && presence.lastSeen ? new Date(presence.lastSeen) : null,
    };
  }

  private async areContacts(a: string, b: string) {
    const count = await this.prisma.contact.count({
      where: { ownerId: a, targetId: b, status: 'ACCEPTED' },
    });
    return count > 0;
  }
}
