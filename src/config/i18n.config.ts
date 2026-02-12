import { registerAs } from '@nestjs/config';

import { getEnvWithDefault } from '../common/utils/config-utils';

export default registerAs('i18n', () => ({
  fallbackLanguage: getEnvWithDefault('I18N_FALLBACK_LANG', 'en'),
}));
