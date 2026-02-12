import { INestApplication, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import helmet from 'helmet';
import { I18nService } from 'nestjs-i18n';

import { AppModule } from '../../../src/app.module';
import { ApiVersions } from '../../../src/common/constants/api-versions.constant';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor';

const logger = new Logger('E2EAppHelper');

export async function createTestApp(): Promise<INestApplication> {
  try {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    const configService = app.get(ConfigService);

    const globalPrefix = configService.get<string>('app.prefix', 'api');
    const versionPrefix = configService.get<string>('app.versionPrefix', 'v');

    app.setGlobalPrefix(globalPrefix);

    app.enableVersioning({
      type: VersioningType.URI,
      prefix: versionPrefix,
      defaultVersion: ApiVersions.V1,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    const i18nService = app.get(I18nService) as I18nService<Record<string, unknown>>;
    app.useGlobalFilters(new HttpExceptionFilter(configService, i18nService));
    app.useGlobalInterceptors(new TransformInterceptor());

    app.use(
      helmet({
        crossOriginResourcePolicy: false,
      }),
    );

    app.enableCors({
      origin: true,
      credentials: true,
    });

    await app.init();
    // Ensure HTTP adapter is ready
    const httpAdapter = app.getHttpAdapter();
    if (!httpAdapter) {
      throw new Error('HTTP adapter not found');
    }
    return app;
  } catch (error) {
    logger.error('Failed to create test app', error as Error);
    throw error;
  }
}
