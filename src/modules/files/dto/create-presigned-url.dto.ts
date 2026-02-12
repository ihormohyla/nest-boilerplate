import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePresignedUrlDto {
  @ApiProperty({ example: 'avatar.png' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'image/png' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  contentType!: string;

  @ApiProperty({ example: 'avatars' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  directory?: string;
}
