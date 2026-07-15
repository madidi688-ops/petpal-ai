import { IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';

export class SendChatDto {
  @IsString()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
