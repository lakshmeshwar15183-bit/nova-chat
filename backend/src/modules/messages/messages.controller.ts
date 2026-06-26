import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import {
  EditMessageDto,
  ForwardMessageDto,
  ListMessagesDto,
  ReactDto,
  SendMessageDto,
} from './dto';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations/:conversationId/messages')
  list(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
    @Query() dto: ListMessagesDto,
  ) {
    return this.messagesService.list(conversationId, userId, dto);
  }

  @Post('conversations/:conversationId/messages')
  send(
    @Param('conversationId') conversationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.send(conversationId, userId, dto);
  }

  @Get('messages/starred')
  starred(@CurrentUser('id') userId: string) {
    return this.messagesService.listStarred(userId);
  }

  @Patch('messages/:id')
  edit(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: EditMessageDto) {
    return this.messagesService.edit(id, userId, dto);
  }

  @Delete('messages/:id/me')
  deleteForMe(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.deleteForMe(id, userId);
  }

  @Delete('messages/:id/everyone')
  deleteForEveryone(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.deleteForEveryone(id, userId);
  }

  @Post('messages/:id/forward')
  forward(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ForwardMessageDto,
  ) {
    return this.messagesService.forward(id, userId, dto);
  }

  @Post('messages/:id/react')
  react(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: ReactDto) {
    return this.messagesService.react(id, userId, dto);
  }

  @Post('messages/:id/star')
  star(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.toggleStar(id, userId);
  }
}
