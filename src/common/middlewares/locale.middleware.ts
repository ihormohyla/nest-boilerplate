import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: any, _res: any, next: () => void) {
    const fallback = this.configService.get<string>('i18n.fallbackLanguage', 'en');
    const acceptLanguage = req.headers['accept-language'] as string | undefined;
    const locale = acceptLanguage?.split(',')?.[0]?.toLowerCase() || fallback;

    req.locale = locale;
    req.i18nLang = locale;

    next();
  }
}
