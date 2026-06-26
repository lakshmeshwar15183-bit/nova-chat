import { MessageType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Sanitize } from '@/common/security/sanitize';

export class CreateScheduledMessageDto {
  @IsString()
  @MaxLength(10000)
  @Sanitize()
  content: string;

  /** ISO-8601 timestamp in the future. */
  @IsDateString()
  scheduledFor: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;
}
