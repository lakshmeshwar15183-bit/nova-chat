import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CreatePollDto, VotePollDto } from './dto';

@Injectable()
export class PollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(conversationId: string, userId: string, dto: CreatePollDto) {
    await this.conversations.assertMember(conversationId, userId);
    const recipients = (await this.conversations.participantIds(conversationId)).filter(
      (id) => id !== userId,
    );
    const closesAt = dto.closesInSeconds ? new Date(Date.now() + dto.closesInSeconds * 1000) : null;

    const poll = await this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: MessageType.POLL,
          content: dto.question,
          receipts: { create: recipients.map((id) => ({ userId: id, status: 'SENT' })) },
        },
      });
      const created = await tx.poll.create({
        data: {
          messageId: message.id,
          question: dto.question,
          allowMultiple: dto.allowMultiple ?? false,
          closesAt,
          options: {
            create: dto.options.map((text, order) => ({ text: text.trim(), order })),
          },
        },
        include: { options: { orderBy: { order: 'asc' } } },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: message.createdAt },
      });
      return { message, poll: created };
    });

    const result = await this.getResults(poll.poll.id, userId);
    this.realtime.emitToConversation(conversationId, 'message_received', {
      id: poll.message.id,
      conversationId,
      senderId: userId,
      type: MessageType.POLL,
      content: dto.question,
      pollId: result.id,
      poll: result,
      createdAt: poll.message.createdAt,
    });
    return result;
  }

  async vote(pollId: string, userId: string, dto: VotePollDto) {
    const poll = await this.requirePoll(pollId);
    await this.conversations.assertMember(poll.message.conversationId, userId);

    if (poll.closed || (poll.closesAt && poll.closesAt < new Date())) {
      throw new BadRequestException('This poll is closed');
    }

    const validOptionIds = new Set(poll.options.map((o) => o.id));
    const chosen = dto.optionIds.filter((id) => validOptionIds.has(id));
    if (chosen.length === 0) throw new BadRequestException('No valid options selected');
    if (!poll.allowMultiple && chosen.length > 1) {
      throw new BadRequestException('This poll only allows a single choice');
    }

    await this.prisma.$transaction(async (tx) => {
      // Replace the user's previous votes for this poll (idempotent re-vote).
      await tx.pollVote.deleteMany({ where: { pollId, userId } });
      await tx.pollVote.createMany({
        data: chosen.map((optionId) => ({ pollId, optionId, userId })),
        skipDuplicates: true,
      });
    });

    const result = await this.getResults(pollId, userId);
    this.realtime.emitToConversation(poll.message.conversationId, 'poll_updated', {
      messageId: poll.messageId,
      poll: result,
    });
    return result;
  }

  async close(pollId: string, userId: string) {
    const poll = await this.requirePoll(pollId);
    if (poll.message.senderId !== userId) {
      throw new ForbiddenException('Only the poll creator can close it');
    }
    await this.prisma.poll.update({ where: { id: pollId }, data: { closed: true } });
    const result = await this.getResults(pollId, userId);
    this.realtime.emitToConversation(poll.message.conversationId, 'poll_updated', {
      messageId: poll.messageId,
      poll: result,
    });
    return result;
  }

  async getResults(pollId: string, userId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { votes: true } } },
        },
        votes: { where: { userId }, select: { optionId: true } },
      },
    });
    if (!poll) throw new NotFoundException('Poll not found');

    const myVotes = new Set(poll.votes.map((v) => v.optionId));
    const totalVotes = poll.options.reduce((sum, o) => sum + o._count.votes, 0);

    return {
      id: poll.id,
      messageId: poll.messageId,
      question: poll.question,
      allowMultiple: poll.allowMultiple,
      closed: poll.closed || (poll.closesAt ? poll.closesAt < new Date() : false),
      closesAt: poll.closesAt,
      totalVotes,
      options: poll.options.map((o) => ({
        id: o.id,
        text: o.text,
        votes: o._count.votes,
        percentage: totalVotes === 0 ? 0 : Math.round((o._count.votes / totalVotes) * 100),
        votedByMe: myVotes.has(o.id),
      })),
    };
  }

  private async requirePoll(pollId: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: { options: true, message: true },
    });
    if (!poll) throw new NotFoundException('Poll not found');
    return poll;
  }
}
