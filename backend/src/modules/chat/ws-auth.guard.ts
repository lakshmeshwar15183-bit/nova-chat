import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Ensures a socket has been authenticated during the connection handshake before
 * it can emit privileged events. The `userId` is set by ChatGateway.handleConnection.
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket & { userId?: string }>();
    if (!client.userId) {
      throw new WsException('Unauthorized');
    }
    return true;
  }
}
