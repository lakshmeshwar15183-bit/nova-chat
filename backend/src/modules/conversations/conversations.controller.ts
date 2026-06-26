import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { CreateDirectConversationDto, UpdateParticipantStateDto } from './dto';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('archived') archived?: string) {
    return this.conversationsService.list(userId, archived === 'true');
  }

  @Post('direct')
  createDirect(@CurrentUser('id') userId: string, @Body() dto: CreateDirectConversationDto) {
    return this.conversationsService.getOrCreateDirect(userId, dto.participantId);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversationsService.getById(id, userId);
  }

  @Patch(':id/state')
  updateState(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateParticipantStateDto,
  ) {
    return this.conversationsService.updateState(id, userId, dto);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.conversationsService.markRead(id, userId);
  }
}
