import { ApiProperty } from '@nestjs/swagger';

export class DeleteFileResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
