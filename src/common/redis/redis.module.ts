import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.provider';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
