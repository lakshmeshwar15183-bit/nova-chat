import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AddContactDto {
  @IsUUID()
  targetId: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  alias?: string;
}

export class BlockUserDto {
  @IsUUID()
  targetId: string;
}
