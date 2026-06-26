import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupsService } from './groups.service';
import {
  AddMembersDto,
  CreateGroupDto,
  CreateInviteDto,
  UpdateGroupDto,
  UpdateMemberRoleDto,
} from './dto';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(userId, dto);
  }

  @Post('join/:code')
  join(@Param('code') code: string, @CurrentUser('id') userId: string) {
    return this.groupsService.joinByInvite(code, userId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.getGroup(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, userId, dto);
  }

  @Post(':id/members')
  addMembers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.groupsService.addMembers(id, userId, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.groupsService.removeMember(id, userId, memberId);
  }

  @Patch(':id/members/:memberId/role')
  updateRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groupsService.updateRole(id, userId, memberId, dto);
  }

  @Post(':id/leave')
  leave(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.groupsService.leave(id, userId);
  }

  @Post(':id/invites')
  createInvite(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.groupsService.createInvite(id, userId, dto);
  }

  @Delete(':id/invites/:inviteId')
  revokeInvite(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.groupsService.revokeInvite(id, userId, inviteId);
  }
}
