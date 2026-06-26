import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';

@Module({
  imports: [ConversationsModule],
  controllers: [PollsController],
  providers: [PollsService],
})
export class PollsModule {}
