import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PollsService } from './polls.service';
import { CreatePollDto, VotePollDto } from './dto';

@ApiTags('polls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post('conversations/:conversationId/polls')
  create(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePollDto,
  ) {
    return this.pollsService.create(conversationId, userId, dto);
  }

  @Get('polls/:id')
  results(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.pollsService.getResults(id, userId);
  }

  @Post('polls/:id/vote')
  vote(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: VotePollDto) {
    return this.pollsService.vote(id, userId, dto);
  }

  @Post('polls/:id/close')
  close(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.pollsService.close(id, userId);
  }
}
