import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { I18nService } from 'nestjs-i18n';

import { AppModule } from './app.module';
import { ApiVersions } from './common/constants/api-versions.constant';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { buildSwaggerDocument, swaggerCustomOptions } from './config/swagger.config';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  const i18nService = app.get<I18nService<Record<string, unknown>>>(I18nService);
  app.useGlobalFilters(new HttpExceptionFilter(configService, i18nService));
  app.useGlobalInterceptors(new TransformInterceptor());

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      //* ================== FOR SWAGGER ===================*//
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          //*==============================================*//
        },
      },
    }),
  );

  const corsOriginsRaw = configService.get<string>('app.corsOrigins', '["http://localhost:3000"]');
  let corsOrigin: CorsOptions['origin'] = true;

  try {
    const parsed = JSON.parse(corsOriginsRaw);
    if (Array.isArray(parsed)) {
      corsOrigin = parsed;
    } else if (typeof parsed === 'string') {
      corsOrigin = [parsed];
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Failed to parse CORS origins JSON, falling back to CSV list: ${corsOriginsRaw}. Reason: ${reason}`,
    );
    corsOrigin = corsOriginsRaw.split(',').map((item) => item.trim());
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const port = configService.get<number>('app.port', 3000);
  const host = configService.get<string>('app.host', '0.0.0.0');

  const document = SwaggerModule.createDocument(
    app,
    buildSwaggerDocument({
      host: configService.get<string>('app.swaggerHost', `http://${host}:${port}`),
      globalPrefix,
      versionPrefix,
    }),
  );
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document, swaggerCustomOptions);

  await app.listen(port, host);
}

bootstrap();
