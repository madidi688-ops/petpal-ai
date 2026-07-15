import { IsOptional, IsDateString } from 'class-validator';

export class GenerateDiaryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
