import { GroupRole } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  memberIds: string[];
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsBoolean()
  onlyAdminsCanMessage?: boolean;

  @IsOptional()
  @IsBoolean()
  onlyAdminsCanEditInfo?: boolean;
}

export class AddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  memberIds: string[];
}

export class UpdateMemberRoleDto {
  @IsEnum(GroupRole)
  role: GroupRole;
}

export class CreateInviteDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  expiresInSeconds?: number;
}
