import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const MENTION_PATTERN = /@([a-zA-Z0-9_.]{3,30})/g;

/**
 * Extracts `@username` mentions from message content, persists them and notifies
 * the mentioned users (only those who are participants of the conversation).
 */
@Injectable()
export class MentionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Returns the distinct usernames referenced in the content. */
  static extractUsernames(content: string | null | undefined): string[] {
    if (!content) return [];
    const matches = content.matchAll(MENTION_PATTERN);
    return Array.from(new Set(Array.from(matches, (m) => m[1].toLowerCase())));
  }

  async process(params: {
    messageId: string;
    conversationId: string;
    senderId: string;
    content: string | null | undefined;
  }): Promise<void> {
    const usernames = MentionsService.extractUsernames(params.content);
    if (usernames.length === 0) return;

    // Only mention users who actually belong to the conversation.
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: params.conversationId,
        user: { username: { in: usernames } },
      },
      select: { userId: true, user: { select: { username: true } } },
    });

    const targets = participants.filter((p) => p.userId !== params.senderId);
    if (targets.length === 0) return;

    await this.prisma.mention.createMany({
      data: targets.map((t) => ({ messageId: params.messageId, userId: t.userId })),
      skipDuplicates: true,
    });

    await Promise.all(
      targets.map((t) =>
        this.notifications.create(
          t.userId,
          NotificationType.MENTION,
          'You were mentioned',
          undefined,
          { conversationId: params.conversationId, messageId: params.messageId },
        ),
      ),
    );
  }
}
