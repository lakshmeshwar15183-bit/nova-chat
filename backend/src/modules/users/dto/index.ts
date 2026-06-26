import { PrivacyLevel } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;
}

export class UpdatePrivacyDto {
  @IsOptional()
  @IsEnum(PrivacyLevel)
  lastSeenPrivacy?: PrivacyLevel;

  @IsOptional()
  @IsEnum(PrivacyLevel)
  profilePhotoPrivacy?: PrivacyLevel;

  @IsOptional()
  @IsEnum(PrivacyLevel)
  bioPrivacy?: PrivacyLevel;

  @IsOptional()
  @IsBoolean()
  readReceiptsEnabled?: boolean;
}

export class SearchUsersDto {
  @IsString()
  @MinLength(2)
  q: string;
}
