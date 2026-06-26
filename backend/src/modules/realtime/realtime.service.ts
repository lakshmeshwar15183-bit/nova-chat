import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * Decouples the REST layer from the WebSocket gateway. The gateway registers its
 * Socket.IO server here on init; services emit through this facade so they never
 * import the gateway directly (avoids circular dependencies).
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  static conversationRoom(conversationId: string) {
    return `conversation:${conversationId}`;
  }

  static userRoom(userId: string) {
    return `user:${userId}`;
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(RealtimeService.conversationRoom(conversationId)).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(RealtimeService.userRoom(userId)).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: string, payload: unknown) {
    for (const id of userIds) this.emitToUser(id, event, payload);
  }
}
