import { ApiProperty } from '@nestjs/swagger';

export class PresignedUploadResponseDto {
  @ApiProperty({ example: 'https://s3.amazonaws.com/bucket/key?signature=...' })
  uploadUrl!: string;

  @ApiProperty({ example: '123/avatars/uuid-filename.png' })
  key!: string;

  @ApiProperty({ example: 42 })
  fileId!: number;
}
