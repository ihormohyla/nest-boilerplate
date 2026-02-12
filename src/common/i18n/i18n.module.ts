import { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AcceptLanguageResolver, I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { join } from 'path';

export class AppI18nModule {
  static forRoot(): DynamicModule {
    return I18nModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      resolvers: [AcceptLanguageResolver],
      useFactory: async (configService: ConfigService) => {
        const fallback = configService.get<string>('i18n.fallbackLanguage', 'en');
        return {
          global: true,
          fallbackLanguage: fallback,
          fallbacks: {
            'en-*': 'en',
            'uk-*': 'uk',
          },
          loader: I18nJsonLoader,
          loaderOptions: {
            path: join(__dirname, '..', '..', 'locales'),
            watch: true,
          },
        };
      },
    });
  }
}
