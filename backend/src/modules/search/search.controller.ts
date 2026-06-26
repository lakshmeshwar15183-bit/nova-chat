import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  searchAll(@CurrentUser('id') userId: string, @Query('q') q: string) {
    return this.searchService.searchAll(userId, q || '');
  }

  @Get('messages')
  messages(@CurrentUser('id') userId: string, @Query('q') q: string) {
    return this.searchService.messages(userId, q || '');
  }

  @Get('media/:conversationId')
  conversationMedia(
    @CurrentUser('id') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.searchService.conversationMedia(userId, conversationId);
  }
}
