import { registerAs } from '@nestjs/config';

import { requireEnv } from '../common/utils/config-utils';

export default registerAs('aws', () => {
  return {
    s3: {
      bucket: requireEnv('AWS_S3_BUCKET', ''),
      region: requireEnv('AWS_REGION', 'us-east-1'),
      accessKeyId: requireEnv('AWS_ACCESS_KEY_ID', ''),
      secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY', ''),
      presignedExpiresIn: parseInt(requireEnv('AWS_PRESIGNED_EXPIRES_IN', '900'), 10),
    },
  };
});
