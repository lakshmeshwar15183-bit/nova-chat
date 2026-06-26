import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';

/** Per-user, per-conversation message drafts (auto-saved client side). */
@Injectable()
export class DraftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
  ) {}

  async save(conversationId: string, userId: string, content: string) {
    await this.conversations.assertMember(conversationId, userId);
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      await this.remove(conversationId, userId);
      return { conversationId, content: '' };
    }
    return this.prisma.draft.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      update: { content: trimmed },
      create: { conversationId, userId, content: trimmed },
    });
  }

  get(conversationId: string, userId: string) {
    return this.prisma.draft.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
  }

  listForUser(userId: string) {
    return this.prisma.draft.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async remove(conversationId: string, userId: string) {
    await this.prisma.draft.deleteMany({ where: { conversationId, userId } });
    return { conversationId, deleted: true };
  }
}
