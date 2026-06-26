import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { DraftsController } from './drafts.controller';
import { DraftsService } from './drafts.service';

@Module({
  imports: [ConversationsModule],
  controllers: [DraftsController],
  providers: [DraftsService],
})
export class DraftsModule {}
