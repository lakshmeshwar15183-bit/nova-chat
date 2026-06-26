import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { ScheduledMessagesController } from './scheduled-messages.controller';
import { ScheduledMessagesService } from './scheduled-messages.service';

@Module({
  imports: [ConversationsModule, MessagesModule],
  controllers: [ScheduledMessagesController],
  providers: [ScheduledMessagesService],
})
export class ScheduledMessagesModule {}
