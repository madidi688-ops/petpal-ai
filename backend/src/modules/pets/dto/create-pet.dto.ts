import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum Species {
  cat = 'cat',
  dog = 'dog',
  other = 'other',
}

export class CreatePetDto {
  @IsString()
  @MaxLength(40)
  name!: string;

  @IsOptional()
  @IsEnum(Species)
  species?: Species;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  personalityNotes?: string;
}
