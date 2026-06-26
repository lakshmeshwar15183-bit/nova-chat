import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledStatus } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { CreateScheduledMessageDto } from './dto';

@Injectable()
export class ScheduledMessagesService {
  private readonly logger = new Logger(ScheduledMessagesService.name);
  private dispatching = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
  ) {}

  async create(conversationId: string, userId: string, dto: CreateScheduledMessageDto) {
    await this.conversations.assertMember(conversationId, userId);

    const scheduledFor = new Date(dto.scheduledFor);
    if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
      throw new BadRequestException('scheduledFor must be a valid future timestamp');
    }

    return this.prisma.scheduledMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content,
        type: dto.type ?? 'TEXT',
        scheduledFor,
      },
    });
  }

  list(userId: string) {
    return this.prisma.scheduledMessage.findMany({
      where: { senderId: userId, status: ScheduledStatus.PENDING },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async cancel(id: string, userId: string) {
    const scheduled = await this.prisma.scheduledMessage.findUnique({ where: { id } });
    if (!scheduled || scheduled.senderId !== userId) {
      throw new NotFoundException('Scheduled message not found');
    }
    if (scheduled.status !== ScheduledStatus.PENDING) {
      throw new BadRequestException('Only pending messages can be cancelled');
    }
    await this.prisma.scheduledMessage.update({
      where: { id },
      data: { status: ScheduledStatus.CANCELLED },
    });
    return { id, cancelled: true };
  }

  /**
   * Polls for due scheduled messages every 30s and dispatches them through the
   * normal message pipeline (so realtime delivery, receipts and mentions all
   * work). A re-entrancy guard prevents overlapping runs.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async dispatchDue(): Promise<void> {
    if (this.dispatching) return;
    this.dispatching = true;
    try {
      const due = await this.prisma.scheduledMessage.findMany({
        where: { status: ScheduledStatus.PENDING, scheduledFor: { lte: new Date() } },
        take: 50,
        orderBy: { scheduledFor: 'asc' },
      });

      for (const item of due) {
        try {
          const message = await this.messages.send(item.conversationId, item.senderId, {
            content: item.content,
            type: item.type,
          });
          await this.prisma.scheduledMessage.update({
            where: { id: item.id },
            data: { status: ScheduledStatus.SENT, sentMessageId: message.id },
          });
        } catch (err) {
          this.logger.error(
            `Failed to dispatch scheduled message ${item.id}: ${(err as Error).message}`,
          );
          await this.prisma.scheduledMessage.update({
            where: { id: item.id },
            data: { status: ScheduledStatus.FAILED, error: (err as Error).message },
          });
        }
      }
    } finally {
      this.dispatching = false;
    }
  }
}
