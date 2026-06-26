import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AddContactDto } from './dto';

const contactSelect = {
  id: true,
  username: true,
  status: true,
  lastSeenAt: true,
  profile: { select: { displayName: true, bio: true, avatarUrl: true } },
} as const;

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { ownerId: userId, status: 'ACCEPTED' },
      include: { target: { select: contactSelect } },
      orderBy: { createdAt: 'desc' },
    });
    return contacts.map((c) => ({ contactId: c.id, alias: c.alias, ...c.target }));
  }

  async add(userId: string, dto: AddContactDto) {
    if (dto.targetId === userId) {
      throw new BadRequestException('You cannot add yourself');
    }
    const target = await this.prisma.user.findUnique({ where: { id: dto.targetId } });
    if (!target) throw new NotFoundException('User not found');

    const blocked = await this.prisma.contact.findFirst({
      where: { ownerId: dto.targetId, targetId: userId, status: 'BLOCKED' },
    });
    if (blocked) throw new BadRequestException('Unable to add this contact');

    return this.prisma.contact.upsert({
      where: { ownerId_targetId: { ownerId: userId, targetId: dto.targetId } },
      update: { status: 'ACCEPTED', alias: dto.alias },
      create: { ownerId: userId, targetId: dto.targetId, status: 'ACCEPTED', alias: dto.alias },
    });
  }

  async remove(userId: string, targetId: string) {
    await this.prisma.contact.deleteMany({ where: { ownerId: userId, targetId } });
    return { message: 'Contact removed' };
  }

  async block(userId: string, targetId: string) {
    if (targetId === userId) throw new BadRequestException('You cannot block yourself');
    await this.prisma.contact.upsert({
      where: { ownerId_targetId: { ownerId: userId, targetId } },
      update: { status: 'BLOCKED' },
      create: { ownerId: userId, targetId, status: 'BLOCKED' },
    });
    return { message: 'User blocked' };
  }

  async unblock(userId: string, targetId: string) {
    await this.prisma.contact.updateMany({
      where: { ownerId: userId, targetId, status: 'BLOCKED' },
      data: { status: 'ACCEPTED' },
    });
    return { message: 'User unblocked' };
  }

  listBlocked(userId: string) {
    return this.prisma.contact.findMany({
      where: { ownerId: userId, status: 'BLOCKED' },
      include: { target: { select: contactSelect } },
    });
  }
}
