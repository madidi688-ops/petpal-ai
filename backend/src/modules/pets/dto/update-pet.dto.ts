import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Species } from './create-pet.dto';

export class UpdatePetDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

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
