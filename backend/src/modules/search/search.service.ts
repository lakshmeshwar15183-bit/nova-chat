import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /** Global search across messages, contacts, groups and media for the user. */
  async searchAll(userId: string, query: string) {
    const [messages, contacts, groups, media] = await Promise.all([
      this.messages(userId, query, 10),
      this.contacts(userId, query),
      this.groups(userId, query),
      this.media(userId, query),
    ]);
    return { messages, contacts, groups, media };
  }

  async messages(userId: string, query: string, limit = 30) {
    const conversationIds = await this.userConversationIds(userId);
    return this.prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        deletedForEveryone: false,
        content: { contains: query, mode: 'insensitive' },
      },
      include: {
        sender: {
          select: { id: true, username: true, profile: { select: { displayName: true } } },
        },
        conversation: { include: { group: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async contacts(userId: string, query: string) {
    const rows = await this.prisma.contact.findMany({
      where: {
        ownerId: userId,
        status: 'ACCEPTED',
        target: {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { profile: { displayName: { contains: query, mode: 'insensitive' } } },
          ],
        },
      },
      include: {
        target: {
          select: {
            id: true,
            username: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      take: 20,
    });
    return rows.map((r) => r.target);
  }

  async groups(userId: string, query: string) {
    return this.prisma.group.findMany({
      where: {
        members: { some: { userId } },
        name: { contains: query, mode: 'insensitive' },
      },
      select: { id: true, conversationId: true, name: true, avatarUrl: true },
      take: 20,
    });
  }

  async media(userId: string, query: string) {
    const conversationIds = await this.userConversationIds(userId);
    return this.prisma.attachment.findMany({
      where: {
        message: { conversationId: { in: conversationIds } },
        fileName: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  /** Media gallery for a single conversation. */
  async conversationMedia(userId: string, conversationId: string) {
    const member = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!member) return [];
    return this.prisma.attachment.findMany({
      where: { message: { conversationId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async userConversationIds(userId: string): Promise<string[]> {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return parts.map((p) => p.conversationId);
  }
}
