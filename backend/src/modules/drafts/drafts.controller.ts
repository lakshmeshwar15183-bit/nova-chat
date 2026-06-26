import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Sanitize } from '@/common/security/sanitize';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DraftsService } from './drafts.service';

class SaveDraftDto {
  @IsString()
  @MaxLength(10000)
  @Sanitize()
  content: string;
}

@ApiTags('drafts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Get('drafts')
  list(@CurrentUser('id') userId: string) {
    return this.draftsService.listForUser(userId);
  }

  @Get('conversations/:conversationId/draft')
  get(@Param('conversationId') conversationId: string, @CurrentUser('id') userId: string) {
    return this.draftsService.get(conversationId, userId);
  }

  @Put('conversations/:conversationId/draft')
  save(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SaveDraftDto,
  ) {
    return this.draftsService.save(conversationId, userId, dto.content);
  }

  @Delete('conversations/:conversationId/draft')
  remove(@Param('conversationId') conversationId: string, @CurrentUser('id') userId: string) {
    return this.draftsService.remove(conversationId, userId);
  }
}
