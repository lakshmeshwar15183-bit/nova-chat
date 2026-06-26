import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Sanitize } from '@/common/security/sanitize';

export class CreatePollDto {
  @IsString()
  @MaxLength(300)
  @Sanitize()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  options: string[];

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean = false;

  @IsOptional()
  @IsInt()
  @Min(60)
  closesInSeconds?: number;
}

export class VotePollDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  optionIds: string[];
}
