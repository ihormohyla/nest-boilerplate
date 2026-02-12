import { Injectable } from '@nestjs/common';

import { HealthCheckResponseDto } from './dto/health-check-response.dto';

@Injectable()
export class HealthService {
  async check(): Promise<HealthCheckResponseDto> {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
