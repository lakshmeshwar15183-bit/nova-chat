import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationType, GroupRole, MessageType } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  AddMembersDto,
  CreateGroupDto,
  CreateInviteDto,
  UpdateGroupDto,
  UpdateMemberRoleDto,
} from './dto';

const inviteCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10);

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(userId: string, dto: CreateGroupDto) {
    const memberIds = Array.from(new Set([userId, ...dto.memberIds]));

    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        lastMessageAt: new Date(),
        participants: { create: memberIds.map((id) => ({ userId: id })) },
        group: {
          create: {
            name: dto.name,
            description: dto.description,
            avatarUrl: dto.avatarUrl,
            ownerId: userId,
            members: {
              create: memberIds.map((id) => ({
                userId: id,
                role: id === userId ? GroupRole.OWNER : GroupRole.MEMBER,
              })),
            },
          },
        },
      },
      include: { group: { include: { members: true } } },
    });

    await this.systemMessage(conversation.id, 'Group created');
    this.realtime.emitToUsers(memberIds, 'group_created', { conversationId: conversation.id });
    return this.getGroup(conversation.group!.id, userId);
  }

  async getGroup(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
        },
        inviteLinks: { where: { revoked: false } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');
    await this.assertMember(group.id, userId);
    return group;
  }

  async update(groupId: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.requireGroup(groupId);
    await this.assertCanEditInfo(group, userId);
    await this.prisma.group.update({ where: { id: groupId }, data: dto });
    this.realtime.emitToConversation(group.conversationId, 'group_updated', { groupId });
    return this.getGroup(groupId, userId);
  }

  async addMembers(groupId: string, userId: string, dto: AddMembersDto) {
    const group = await this.requireGroup(groupId);
    await this.assertAdmin(group.id, userId);

    for (const memberId of dto.memberIds) {
      await this.prisma.groupMember.upsert({
        where: { groupId_userId: { groupId, userId: memberId } },
        update: {},
        create: { groupId, userId: memberId, role: GroupRole.MEMBER },
      });
      await this.prisma.conversationParticipant.upsert({
        where: {
          conversationId_userId: { conversationId: group.conversationId, userId: memberId },
        },
        update: {},
        create: { conversationId: group.conversationId, userId: memberId },
      });
    }
    await this.systemMessage(group.conversationId, `${dto.memberIds.length} member(s) added`);
    this.realtime.emitToConversation(group.conversationId, 'group_members_changed', { groupId });
    return this.getGroup(groupId, userId);
  }

  async removeMember(groupId: string, userId: string, memberId: string) {
    const group = await this.requireGroup(groupId);
    await this.assertAdmin(group.id, userId);
    if (memberId === group.ownerId) {
      throw new BadRequestException('The owner cannot be removed');
    }
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId: memberId } });
    await this.prisma.conversationParticipant.deleteMany({
      where: { conversationId: group.conversationId, userId: memberId },
    });
    this.realtime.emitToConversation(group.conversationId, 'group_members_changed', { groupId });
    this.realtime.emitToUser(memberId, 'removed_from_group', { groupId });
    return { message: 'Member removed' };
  }

  async leave(groupId: string, userId: string) {
    const group = await this.requireGroup(groupId);
    if (group.ownerId === userId) {
      throw new BadRequestException('Transfer ownership before leaving the group');
    }
    await this.prisma.groupMember.deleteMany({ where: { groupId, userId } });
    await this.prisma.conversationParticipant.deleteMany({
      where: { conversationId: group.conversationId, userId },
    });
    return { message: 'You left the group' };
  }

  async updateRole(groupId: string, userId: string, memberId: string, dto: UpdateMemberRoleDto) {
    const group = await this.requireGroup(groupId);
    if (group.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can change roles');
    }
    if (dto.role === GroupRole.OWNER) {
      // Transfer ownership.
      await this.prisma.$transaction([
        this.prisma.groupMember.updateMany({
          where: { groupId, userId },
          data: { role: GroupRole.ADMIN },
        }),
        this.prisma.groupMember.updateMany({
          where: { groupId, userId: memberId },
          data: { role: GroupRole.OWNER },
        }),
        this.prisma.group.update({ where: { id: groupId }, data: { ownerId: memberId } }),
      ]);
    } else {
      await this.prisma.groupMember.updateMany({
        where: { groupId, userId: memberId },
        data: { role: dto.role },
      });
    }
    this.realtime.emitToConversation(group.conversationId, 'group_members_changed', { groupId });
    return this.getGroup(groupId, userId);
  }

  // ---- Invite links --------------------------------------------------------

  async createInvite(groupId: string, userId: string, dto: CreateInviteDto) {
    const group = await this.requireGroup(groupId);
    await this.assertAdmin(group.id, userId);
    return this.prisma.groupInviteLink.create({
      data: {
        groupId,
        code: inviteCode(),
        createdBy: userId,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresInSeconds ? new Date(Date.now() + dto.expiresInSeconds * 1000) : null,
      },
    });
  }

  async revokeInvite(groupId: string, userId: string, inviteId: string) {
    const group = await this.requireGroup(groupId);
    await this.assertAdmin(group.id, userId);
    await this.prisma.groupInviteLink.updateMany({
      where: { id: inviteId, groupId },
      data: { revoked: true },
    });
    return { message: 'Invite revoked' };
  }

  async joinByInvite(code: string, userId: string) {
    const invite = await this.prisma.groupInviteLink.findUnique({
      where: { code },
      include: { group: true },
    });
    if (!invite || invite.revoked) throw new NotFoundException('Invalid invite link');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite link has expired');
    }
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new BadRequestException('This invite link has reached its usage limit');
    }

    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: invite.groupId, userId } },
    });
    if (!existing) {
      await this.prisma.groupMember.create({
        data: { groupId: invite.groupId, userId, role: GroupRole.MEMBER },
      });
      await this.prisma.conversationParticipant.create({
        data: { conversationId: invite.group.conversationId, userId },
      });
      await this.prisma.groupInviteLink.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      });
      await this.systemMessage(invite.group.conversationId, 'A new member joined via invite link');
      this.realtime.emitToConversation(invite.group.conversationId, 'group_members_changed', {
        groupId: invite.groupId,
      });
    }
    return { conversationId: invite.group.conversationId, groupId: invite.groupId };
  }

  // ---- Helpers -------------------------------------------------------------

  private async requireGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async assertMember(groupId: string, userId: string) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!member) throw new ForbiddenException('You are not a member of this group');
    return member;
  }

  private async assertAdmin(groupId: string, userId: string) {
    const member = await this.assertMember(groupId, userId);
    if (member.role === GroupRole.MEMBER) {
      throw new ForbiddenException('Admin privileges required');
    }
    return member;
  }

  private async assertCanEditInfo(
    group: { id: string; onlyAdminsCanEditInfo: boolean },
    userId: string,
  ) {
    if (group.onlyAdminsCanEditInfo) return this.assertAdmin(group.id, userId);
    return this.assertMember(group.id, userId);
  }

  private async systemMessage(conversationId: string, content: string) {
    const msg = await this.prisma.message.create({
      data: { conversationId, type: MessageType.SYSTEM, content },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: msg.createdAt },
    });
    this.realtime.emitToConversation(conversationId, 'message_received', {
      id: msg.id,
      conversationId,
      type: 'SYSTEM',
      content,
      createdAt: msg.createdAt,
      senderId: null,
    });
  }
}
