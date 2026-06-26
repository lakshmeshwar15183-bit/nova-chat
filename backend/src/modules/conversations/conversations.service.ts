import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationType } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { UpdateParticipantStateDto } from './dto';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Returns the existing direct conversation between two users, or creates one. */
  async getOrCreateDirect(userId: string, participantId: string) {
    if (userId === participantId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }
    const other = await this.prisma.user.findUnique({ where: { id: participantId } });
    if (!other) throw new NotFoundException('User not found');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
    });
    if (existing) return this.getById(existing.id, userId);

    const created = await this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        participants: { create: [{ userId }, { userId: participantId }] },
      },
    });
    return this.getById(created.id, userId);
  }

  async list(userId: string, includeArchived = false) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
      include: {
        conversation: {
          include: {
            group: true,
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    status: true,
                    lastSeenAt: true,
                    profile: { select: { displayName: true, avatarUrl: true } },
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: { sender: { select: { id: true, username: true } } },
            },
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { conversation: { lastMessageAt: 'desc' } }],
    });

    return Promise.all(participants.map(async (p) => this.shape(p, userId)));
  }

  async getById(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
      include: {
        conversation: {
          include: {
            group: { include: { members: true } },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    status: true,
                    lastSeenAt: true,
                    profile: { select: { displayName: true, avatarUrl: true } },
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: { sender: { select: { id: true, username: true } } },
            },
          },
        },
      },
    });
    return this.shape(participant!, userId);
  }

  async updateState(conversationId: string, userId: string, dto: UpdateParticipantStateDto) {
    await this.assertMember(conversationId, userId);
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: dto,
    });
    return this.getById(conversationId, userId);
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    const now = new Date();
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: now },
    });
    // Mark all delivered messages as read for this user.
    await this.prisma.messageReceipt.updateMany({
      where: { userId, message: { conversationId }, readAt: null },
      data: { status: 'READ', readAt: now },
    });
    return { conversationId, lastReadAt: now };
  }

  async assertMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!member) throw new ForbiddenException('Not a participant of this conversation');
    return member;
  }

  async participantIds(conversationId: string): Promise<string[]> {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return parts.map((p) => p.userId);
  }

  private async shape(participant: any, userId: string) {
    const convo = participant.conversation;
    const isGroup = convo.type === ConversationType.GROUP;

    const others = convo.participants.filter((p: any) => p.user.id !== userId);
    const counterpart = others[0]?.user;

    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: convo.id,
        senderId: { not: userId },
        createdAt: participant.lastReadAt ? { gt: participant.lastReadAt } : undefined,
      },
    });

    let online = false;
    if (!isGroup && counterpart) {
      online = await this.redis.isOnline(counterpart.id);
    }

    return {
      id: convo.id,
      type: convo.type,
      title: isGroup ? convo.group?.name : counterpart?.profile?.displayName,
      avatarUrl: isGroup ? convo.group?.avatarUrl : counterpart?.profile?.avatarUrl,
      counterpart: isGroup ? null : counterpart,
      group: convo.group ?? null,
      participants: convo.participants.map((p: any) => p.user),
      lastMessage: convo.messages?.[0] ?? null,
      lastMessageAt: convo.lastMessageAt,
      isPinned: participant.isPinned,
      isArchived: participant.isArchived,
      isMuted: participant.isMuted,
      lastReadAt: participant.lastReadAt,
      unreadCount,
      online,
    };
  }
}
