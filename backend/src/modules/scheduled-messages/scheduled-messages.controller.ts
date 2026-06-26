import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { CreateScheduledMessageDto } from './dto';

@ApiTags('scheduled-messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ScheduledMessagesController {
  constructor(private readonly scheduledService: ScheduledMessagesService) {}

  @Get('scheduled-messages')
  list(@CurrentUser('id') userId: string) {
    return this.scheduledService.list(userId);
  }

  @Post('conversations/:conversationId/scheduled-messages')
  create(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateScheduledMessageDto,
  ) {
    return this.scheduledService.create(conversationId, userId, dto);
  }

  @Delete('scheduled-messages/:id')
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.scheduledService.cancel(id, userId);
  }
}
