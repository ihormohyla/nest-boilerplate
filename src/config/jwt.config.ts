import { Logger } from '@nestjs/common';
import { registerAs } from '@nestjs/config';

import { requireEnv, getEnvWithDefault } from '../common/utils/config-utils';

const logger = new Logger('JwtConfig');

export default registerAs('jwt', () => {
  const accessSecret = requireEnv('JWT_ACCESS_SECRET', 'change_me');

  if (accessSecret && (accessSecret.length < 32 || accessSecret === 'change_me')) {
    logger.warn('⚠️  WARNING: Using weak JWT secret.');
  }

  return {
    accessSecret,
    accessExpiresIn: getEnvWithDefault('JWT_ACCESS_EXPIRES_IN', '3600s'),
    refreshExpiresIn: getEnvWithDefault('JWT_REFRESH_EXPIRES_IN', '7d'),
  };
});
