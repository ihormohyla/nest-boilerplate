import { registerAs } from '@nestjs/config';

import { getEnvWithDefault } from '../common/utils/config-utils';

export default registerAs('app', () => {
  return {
    env: getEnvWithDefault('APP_ENV', 'dev'),
    host: getEnvWithDefault('APP_HOST', '0.0.0.0'),
    swaggerHost: getEnvWithDefault('SWAGGER_APPHOST', 'http://localhost:3000'),
    port: parseInt(getEnvWithDefault('APP_PORT', '3000'), 10),
    prefix: getEnvWithDefault('APP_PREFIX', 'api'),
    corsOrigins: getEnvWithDefault('APP_CORS_ORIGINS', '["http://localhost:3000"]'),
    versionPrefix: getEnvWithDefault('APP_VERSION_PREFIX', 'v'),
    // CSRF Protection (disabled by default for JWT-based APIs)
    enableCsrf: getEnvWithDefault('APP_ENABLE_CSRF', 'false'),
    csrfCookieName: getEnvWithDefault('APP_CSRF_COOKIE_NAME', 'XSRF-TOKEN'),
    csrfHeaderName: getEnvWithDefault('APP_CSRF_HEADER_NAME', 'X-XSRF-TOKEN'),
  };
});
