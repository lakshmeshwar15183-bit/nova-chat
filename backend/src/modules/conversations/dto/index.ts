import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateDirectConversationDto {
  @IsUUID()
  participantId: string;
}

export class UpdateParticipantStateDto {
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;
}
