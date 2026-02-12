import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ConfirmFileUploadDto {
  @ApiProperty({ example: 12345 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number;

  @ApiProperty({ example: 'https://bucket.s3.amazonaws.com/key' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  url?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isUsed?: boolean;
}
