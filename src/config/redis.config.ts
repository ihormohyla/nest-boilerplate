import { registerAs } from '@nestjs/config';

import { requireEnv } from '../common/utils/config-utils';

export default registerAs('redis', () => {
  return {
    host: requireEnv('REDIS_HOST', 'localhost'),
    port: parseInt(requireEnv('REDIS_PORT', '6379'), 10),
    password: process.env.REDIS_PASSWORD, // Optional - only if Redis has password protection
    ttlSeconds: parseInt(requireEnv('REDIS_TTL_SECONDS', '3600'), 10),
  };
});
