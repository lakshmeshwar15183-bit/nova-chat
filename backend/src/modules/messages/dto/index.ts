import { MessageType, AttachmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Sanitize } from '@/common/security/sanitize';

export class AttachmentInput {
  @IsEnum(AttachmentType)
  type: AttachmentType;

  @IsString()
  url: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(0)
  size: number;

  @IsOptional()
  @IsInt()
  width?: number;

  @IsOptional()
  @IsInt()
  height?: number;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class SendMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType = MessageType.TEXT;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  @Sanitize()
  content?: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentInput)
  attachments?: AttachmentInput[];
}

export class EditMessageDto {
  @IsString()
  @MaxLength(10000)
  @Sanitize()
  content: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  version?: number;
}

export class ForwardMessageDto {
  @IsArray()
  @IsUUID('all', { each: true })
  conversationIds: string[];
}

export class ReactDto {
  @IsString()
  @MaxLength(8)
  emoji: string;
}

export class ListMessagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 30;

  @IsOptional()
  @IsString()
  cursor?: string;
}
