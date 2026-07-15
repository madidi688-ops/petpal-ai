import { IsEnum, IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';

export enum BehaviorType {
  eat = 'eat',
  drink = 'drink',
  sleep = 'sleep',
  play = 'play',
  groom = 'groom',
  toilet = 'toilet',
  other = 'other',
}

export class CreateBehaviorDto {
  @IsEnum(BehaviorType)
  type!: BehaviorType;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  moodTag?: string;
}
