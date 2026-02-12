import { registerAs } from '@nestjs/config';

import { requireEnv, requireEnvVars } from '../common/utils/config-utils';

export default registerAs('database', () => {
  requireEnvVars(['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME']);

  const host = requireEnv('DB_HOST', 'localhost');
  const username = requireEnv('DB_USERNAME', 'root');
  const password = requireEnv('DB_PASSWORD', '');
  const database = requireEnv('DB_NAME', 'nest_monolit');

  return {
    dialect: 'mysql',
    host,
    port: parseInt(requireEnv('DB_PORT', '3306'), 10),
    username,
    password,
    database,
    logging: process.env.DB_LOGGING === 'true',
  };
});
