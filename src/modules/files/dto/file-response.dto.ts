import { ApiProperty } from '@nestjs/swagger';

import { FileStatus } from '../models';

export class FileResponseDto {
  @ApiProperty({ example: 42 })
  id!: number;

  @ApiProperty({ example: 10 })
  userId!: number;

  @ApiProperty({ example: 'my-bucket' })
  bucket!: string;

  @ApiProperty({ example: '123/avatars/uuid-filename.png' })
  key!: string;

  @ApiProperty({ example: 'avatar.png' })
  fileName!: string;

  @ApiProperty({ example: 'image/png' })
  mimeType!: string;

  @ApiProperty({ example: 102400, nullable: true })
  size?: number | null;

  @ApiProperty({
    example: 'https://my-bucket.s3.amazonaws.com/123/avatars/uuid-filename.png',
    nullable: true,
  })
  url?: string | null;

  @ApiProperty({ enum: FileStatus, example: FileStatus.COMPLETED })
  status!: FileStatus;

  @ApiProperty({ example: true })
  isUsed!: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-01T00:05:00.000Z' })
  updatedAt!: Date;
}
