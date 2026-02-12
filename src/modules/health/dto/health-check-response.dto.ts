import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 123.45 })
  uptime!: number;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  timestamp!: string;
}
