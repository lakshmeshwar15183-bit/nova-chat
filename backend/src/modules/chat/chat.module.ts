import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChatGateway } from './chat.gateway';
import { WsAuthGuard } from './ws-auth.guard';

@Module({
  imports: [AuthModule, ConversationsModule],
  providers: [ChatGateway, WsAuthGuard],
})
export class ChatModule {}
