import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    data?: Prisma.InputJsonValue,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, data },
    });
    this.realtime.emitToUser(userId, 'notification', notification);
    return notification;
  }

  list(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    return { id, isRead: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  // ---- Device registration for push notifications --------------------------

  registerDevice(userId: string, pushToken: string, platform: any, name?: string) {
    return this.prisma.device.upsert({
      where: { userId_pushToken: { userId, pushToken } },
      update: { lastActiveAt: new Date(), name },
      create: { userId, pushToken, platform, name },
    });
  }

  async unregisterDevice(userId: string, pushToken: string) {
    await this.prisma.device.deleteMany({ where: { userId, pushToken } });
    return { message: 'Device unregistered' };
  }
}
