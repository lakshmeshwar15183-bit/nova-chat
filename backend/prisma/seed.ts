/* eslint-disable no-console */
import { PrismaClient, ConversationType, MessageType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding NovaChat database...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@novachat.dev' },
    update: {},
    create: {
      email: 'alice@novachat.dev',
      username: 'alice',
      passwordHash,
      emailVerified: true,
      profile: { create: { displayName: 'Alice Johnson', bio: 'Coffee & code ☕' } },
      settings: { create: {} },
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@novachat.dev' },
    update: {},
    create: {
      email: 'bob@novachat.dev',
      username: 'bob',
      passwordHash,
      emailVerified: true,
      profile: { create: { displayName: 'Bob Smith', bio: 'Building things.' } },
      settings: { create: {} },
    },
  });

  // Mutual contacts
  await prisma.contact.upsert({
    where: { ownerId_targetId: { ownerId: alice.id, targetId: bob.id } },
    update: {},
    create: { ownerId: alice.id, targetId: bob.id, status: 'ACCEPTED' },
  });
  await prisma.contact.upsert({
    where: { ownerId_targetId: { ownerId: bob.id, targetId: alice.id } },
    update: {},
    create: { ownerId: bob.id, targetId: alice.id, status: 'ACCEPTED' },
  });

  // Direct conversation
  const conversation = await prisma.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      lastMessageAt: new Date(),
      participants: {
        create: [{ userId: alice.id }, { userId: bob.id }],
      },
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: alice.id,
      type: MessageType.TEXT,
      content: 'Hey Bob! Welcome to NovaChat 👋',
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: bob.id,
      type: MessageType.TEXT,
      content: 'Thanks Alice! This looks great.',
    },
  });

  console.log('✅ Seed complete. Demo login: alice@novachat.dev / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
