import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { HealthCheckResponseDto } from './dto/health-check-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ type: HealthCheckResponseDto })
  check(): Promise<HealthCheckResponseDto> {
    return this.healthService.check();
  }
}
