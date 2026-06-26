import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload } from '../auth/tokens.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RealtimeService } from '../realtime/realtime.service';
import { WsAuthGuard } from './ws-auth.guard';

interface AuthedSocket extends Socket {
  userId: string;
  username: string;
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  // Socket.IO is mounted under /socket.io by default; Nginx proxies it.
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly conversations: ConversationsService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
    this.logger.log('WebSocket gateway initialised');
  }

  // ---- Connection lifecycle ------------------------------------------------

  async handleConnection(client: AuthedSocket) {
    try {
      const token = this.extractToken(client);
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get('jwt.accessSecret'),
      });
      client.userId = payload.sub;
      client.username = payload.username;

      // Join personal room + all conversation rooms.
      client.join(RealtimeService.userRoom(client.userId));
      const conversationIds = await this.userConversationIds(client.userId);
      conversationIds.forEach((id) => client.join(RealtimeService.conversationRoom(id)));

      const count = await this.redis.addSocket(client.userId, client.id);
      if (count === 1) {
        await this.prisma.user.update({
          where: { id: client.userId },
          data: { status: 'ONLINE' },
        });
        this.broadcastPresence(client.userId, true);
      }
      this.logger.debug(`User ${client.username} connected (${client.id})`);
    } catch (err) {
      this.logger.warn(`Rejected socket ${client.id}: ${(err as Error).message}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AuthedSocket) {
    if (!client.userId) return;
    const count = await this.redis.removeSocket(client.userId, client.id);
    if (count === 0) {
      const lastSeenAt = new Date();
      await this.prisma.user.update({
        where: { id: client.userId },
        data: { status: 'OFFLINE', lastSeenAt },
      });
      this.broadcastPresence(client.userId, false, lastSeenAt);
    }
  }

  // ---- Typing indicators ---------------------------------------------------

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    client.to(RealtimeService.conversationRoom(body.conversationId)).emit('typing', {
      conversationId: body.conversationId,
      userId: client.userId,
      username: client.username,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('stop_typing')
  async onStopTyping(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    client.to(RealtimeService.conversationRoom(body.conversationId)).emit('stop_typing', {
      conversationId: body.conversationId,
      userId: client.userId,
    });
  }

  // ---- Read receipts -------------------------------------------------------

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('mark_read')
  async onMarkRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    await this.conversations.markRead(body.conversationId, client.userId);
    client.to(RealtimeService.conversationRoom(body.conversationId)).emit('read_receipt', {
      conversationId: body.conversationId,
      userId: client.userId,
      readAt: new Date(),
    });
  }

  // ---- Room management (e.g., after joining a new group) -------------------

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('join_conversation')
  onJoin(@ConnectedSocket() client: AuthedSocket, @MessageBody() body: { conversationId: string }) {
    client.join(RealtimeService.conversationRoom(body.conversationId));
    return { joined: body.conversationId };
  }

  // ---- WebRTC call signaling ----------------------------------------------
  // The gateway only relays SDP/ICE between peers; no media flows through it.

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call_started')
  onCallStarted(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string; type: 'VOICE' | 'VIDEO' },
  ) {
    client.to(RealtimeService.conversationRoom(body.conversationId)).emit('call_started', {
      conversationId: body.conversationId,
      from: client.userId,
      type: body.type,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call_signal')
  onCallSignal(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { to: string; signal: unknown },
  ) {
    this.server.to(RealtimeService.userRoom(body.to)).emit('call_signal', {
      from: client.userId,
      signal: body.signal,
    });
  }

  @UseGuards(WsAuthGuard)
  @SubscribeMessage('call_ended')
  onCallEnded(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { conversationId: string },
  ) {
    client.to(RealtimeService.conversationRoom(body.conversationId)).emit('call_ended', {
      conversationId: body.conversationId,
      from: client.userId,
    });
  }

  // ---- Helpers -------------------------------------------------------------

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token as string | undefined;
    const header = client.handshake.headers?.authorization;
    const headerToken = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const token = authToken || headerToken;
    if (!token) throw new Error('Missing token');
    return token;
  }

  private async userConversationIds(userId: string): Promise<string[]> {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return parts.map((p) => p.conversationId);
  }

  private broadcastPresence(userId: string, online: boolean, lastSeenAt?: Date) {
    this.server.emit(online ? 'user_online' : 'user_offline', {
      userId,
      online,
      lastSeenAt,
    });
  }
}
