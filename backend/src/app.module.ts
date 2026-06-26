import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { CsrfGuard } from './common/security/csrf.guard';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { MailModule } from './common/mail/mail.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { GroupsModule } from './modules/groups/groups.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ChatModule } from './modules/chat/chat.module';
import { AuditModule } from './modules/audit/audit.module';
import { DraftsModule } from './modules/drafts/drafts.module';
import { ScheduledMessagesModule } from './modules/scheduled-messages/scheduled-messages.module';
import { PollsModule } from './modules/polls/polls.module';
import { LinkPreviewModule } from './modules/link-preview/link-preview.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('app.env') === 'production' ? 'info' : 'debug',
          transport:
            config.get('app.env') === 'production'
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl')! * 1000,
            limit: config.get<number>('throttle.limit')!,
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),

    // Infrastructure (global)
    PrismaModule,
    RedisModule,
    MailModule,
    RealtimeModule,

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    ContactsModule,
    ConversationsModule,
    MessagesModule,
    GroupsModule,
    UploadsModule,
    SearchModule,
    NotificationsModule,
    SettingsModule,
    ChatModule,
    AuditModule,
    DraftsModule,
    ScheduledMessagesModule,
    PollsModule,
    LinkPreviewModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
