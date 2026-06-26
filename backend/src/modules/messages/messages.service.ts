import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RealtimeService } from '../realtime/realtime.service';
import { MentionsService } from './mentions.service';
import {
  EditMessageDto,
  ForwardMessageDto,
  ListMessagesDto,
  ReactDto,
  SendMessageDto,
} from './dto';

const messageInclude = {
  sender: {
    select: {
      id: true,
      username: true,
      profile: { select: { displayName: true, avatarUrl: true } },
    },
  },
  attachments: true,
  reactions: { include: { user: { select: { id: true, username: true } } } },
  replyTo: {
    select: {
      id: true,
      content: true,
      type: true,
      senderId: true,
      sender: { select: { username: true, profile: { select: { displayName: true } } } },
    },
  },
  receipts: true,
  poll: { select: { id: true } },
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly realtime: RealtimeService,
    private readonly mentions: MentionsService,
  ) {}

  async list(conversationId: string, userId: string, dto: ListMessagesDto) {
    await this.conversations.assertMember(conversationId, userId);

    const deletedIds = await this.prisma.messageDeletion
      .findMany({ where: { userId, message: { conversationId } }, select: { messageId: true } })
      .then((rows) => rows.map((r) => r.messageId));

    const messages = await this.prisma.message.findMany({
      where: { conversationId, id: { notIn: deletedIds } },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take: dto.limit + 1,
      ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > dto.limit;
    const page = hasMore ? messages.slice(0, dto.limit) : messages;

    const starred = await this.prisma.starredMessage.findMany({
      where: { userId, messageId: { in: page.map((m) => m.id) } },
      select: { messageId: true },
    });
    const starredSet = new Set(starred.map((s) => s.messageId));

    return {
      items: page.map((m) => this.shape(m, starredSet)).reverse(),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore,
    };
  }

  async send(conversationId: string, userId: string, dto: SendMessageDto) {
    await this.conversations.assertMember(conversationId, userId);
    await this.assertCanPostToGroup(conversationId, userId);

    const participantIds = await this.conversations.participantIds(conversationId);
    const recipients = participantIds.filter((id) => id !== userId);

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: dto.type ?? MessageType.TEXT,
          content: dto.content,
          replyToId: dto.replyToId,
          attachments: dto.attachments?.length ? { create: dto.attachments } : undefined,
          receipts: { create: recipients.map((id) => ({ userId: id, status: 'SENT' })) },
        },
        include: messageInclude,
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });
      return created;
    });

    const payload = this.shape(message, new Set());
    this.realtime.emitToConversation(conversationId, 'message_received', payload);
    await this.mentions.process({
      messageId: message.id,
      conversationId,
      senderId: userId,
      content: dto.content,
    });
    return payload;
  }

  async edit(messageId: string, userId: string, dto: EditMessageDto, expectedVersion?: number) {
    const message = await this.getOwnedMessage(messageId, userId);
    if (message.deletedForEveryone) throw new ForbiddenException('Cannot edit a deleted message');

    // Optimistic locking: if a version is supplied it must match the current row.
    if (expectedVersion !== undefined && expectedVersion !== message.version) {
      throw new ConflictException('Message was modified by another action; please retry');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Preserve the previous content for the edit-history trail.
      await tx.messageEditHistory.create({
        data: { messageId, previousContent: message.content },
      });
      // Conditional update enforces the optimistic lock atomically.
      const result = await tx.message.updateMany({
        where: { id: messageId, version: message.version },
        data: {
          content: dto.content,
          isEdited: true,
          editedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (result.count === 0) {
        throw new ConflictException('Message was modified concurrently; please retry');
      }
      return tx.message.findUniqueOrThrow({ where: { id: messageId }, include: messageInclude });
    });

    const payload = this.shape(updated, new Set());
    this.realtime.emitToConversation(message.conversationId, 'message_updated', payload);
    return payload;
  }

  async getEditHistory(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.conversations.assertMember(message.conversationId, userId);
    return this.prisma.messageEditHistory.findMany({
      where: { messageId },
      orderBy: { editedAt: 'desc' },
    });
  }

  async togglePin(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.conversations.assertMember(message.conversationId, userId);

    const existing = await this.prisma.pinnedMessage.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });
    if (existing) {
      await this.prisma.pinnedMessage.delete({ where: { id: existing.id } });
      this.realtime.emitToConversation(message.conversationId, 'message_unpinned', { messageId });
      return { messageId, pinned: false };
    }
    await this.prisma.pinnedMessage.create({ data: { messageId, userId } });
    this.realtime.emitToConversation(message.conversationId, 'message_pinned', { messageId });
    return { messageId, pinned: true };
  }

  async listPinned(conversationId: string, userId: string) {
    await this.conversations.assertMember(conversationId, userId);
    const pinned = await this.prisma.pinnedMessage.findMany({
      where: { userId, message: { conversationId } },
      include: { message: { include: messageInclude } },
      orderBy: { createdAt: 'desc' },
    });
    return pinned.map((p) => this.shape(p.message, new Set()));
  }

  async deleteForMe(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.conversations.assertMember(message.conversationId, userId);

    await this.prisma.messageDeletion.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: {},
      create: { messageId, userId },
    });
    return { messageId, deletedForMe: true };
  }

  async deleteForEveryone(messageId: string, userId: string) {
    const message = await this.getOwnedMessage(messageId, userId);
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedForEveryone: true, content: null, type: MessageType.SYSTEM },
    });
    await this.prisma.attachment.deleteMany({ where: { messageId } });

    this.realtime.emitToConversation(message.conversationId, 'message_deleted', {
      messageId,
      conversationId: message.conversationId,
    });
    return { messageId, deletedForEveryone: true, updatedAt: updated.updatedAt };
  }

  async forward(messageId: string, userId: string, dto: ForwardMessageDto) {
    const source = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { attachments: true },
    });
    if (!source) throw new NotFoundException('Message not found');
    await this.conversations.assertMember(source.conversationId, userId);

    const results: any[] = [];
    for (const conversationId of dto.conversationIds) {
      await this.conversations.assertMember(conversationId, userId);
      const recipients = (await this.conversations.participantIds(conversationId)).filter(
        (id) => id !== userId,
      );
      const created = await this.prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: source.type,
          content: source.content,
          forwardedFromId: source.id,
          attachments: source.attachments.length
            ? {
                create: source.attachments.map((a) => ({
                  type: a.type,
                  url: a.url,
                  fileName: a.fileName,
                  mimeType: a.mimeType,
                  size: a.size,
                  width: a.width,
                  height: a.height,
                  duration: a.duration,
                  thumbnailUrl: a.thumbnailUrl,
                })),
              }
            : undefined,
          receipts: { create: recipients.map((id) => ({ userId: id, status: 'SENT' })) },
        },
        include: messageInclude,
      });
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });
      const payload = this.shape(created, new Set());
      this.realtime.emitToConversation(conversationId, 'message_received', payload);
      results.push(payload);
    }
    return results;
  }

  async react(messageId: string, userId: string, dto: ReactDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.conversations.assertMember(message.conversationId, userId);

    const existing = await this.prisma.reaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji: dto.emoji } },
    });
    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.reaction.create({ data: { messageId, userId, emoji: dto.emoji } });
    }

    const reactions = await this.prisma.reaction.findMany({
      where: { messageId },
      include: { user: { select: { id: true, username: true } } },
    });
    this.realtime.emitToConversation(message.conversationId, 'message_reaction', {
      messageId,
      reactions,
    });
    return reactions;
  }

  async toggleStar(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.conversations.assertMember(message.conversationId, userId);

    const existing = await this.prisma.starredMessage.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });
    if (existing) {
      await this.prisma.starredMessage.delete({ where: { id: existing.id } });
      return { messageId, starred: false };
    }
    await this.prisma.starredMessage.create({ data: { messageId, userId } });
    return { messageId, starred: true };
  }

  listStarred(userId: string) {
    return this.prisma.starredMessage.findMany({
      where: { userId },
      include: { message: { include: messageInclude } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---- Helpers -------------------------------------------------------------

  private async getOwnedMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only modify your own messages');
    }
    return message;
  }

  private async assertCanPostToGroup(conversationId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { conversationId },
      include: { members: { where: { userId } } },
    });
    if (!group) return; // direct conversation
    if (group.onlyAdminsCanMessage) {
      const member = group.members[0];
      if (!member || member.role === 'MEMBER') {
        throw new ForbiddenException('Only admins can send messages in this group');
      }
    }
  }

  private shape(message: any, starredSet: Set<string>) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: message.sender,
      type: message.type,
      content: message.deletedForEveryone ? null : message.content,
      deletedForEveryone: message.deletedForEveryone,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      replyTo: message.replyTo ?? null,
      forwardedFromId: message.forwardedFromId ?? null,
      attachments: message.attachments ?? [],
      reactions: message.reactions ?? [],
      receipts: message.receipts ?? [],
      status: message.status,
      version: message.version,
      pollId: message.poll?.id ?? null,
      starred: starredSet.has(message.id),
      createdAt: message.createdAt,
    };
  }
}
