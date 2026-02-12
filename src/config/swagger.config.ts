import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

import { ApiVersions } from '../common/constants/api-versions.constant';

interface BuildSwaggerDocumentOptions {
  host?: string;
  port?: any;
  globalPrefix?: string;
  versionPrefix?: string;
}

const normalizePathSegment = (value?: string): string => {
  if (!value) {
    return '';
  }

  return value.replace(/^\/+|\/+$/g, '');
};

export const buildSwaggerDocument = ({
  host = process.env.SWAGGER_APPHOST ?? 'http://localhost:3000',
  globalPrefix = process.env.APP_PREFIX ?? 'api',
  versionPrefix = process.env.API_VERSION_PREFIX ?? 'v',
}: BuildSwaggerDocumentOptions = {}) => {
  const normalizedPrefix = normalizePathSegment(globalPrefix);
  const normalizedVersionPrefix = normalizePathSegment(versionPrefix);

  const baseBuilder = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE ?? 'Nest Monolith Starter')
    .setDescription(process.env.SWAGGER_DESCRIPTION ?? 'API documentation')
    .setVersion(process.env.SWAGGER_VERSION ?? '1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    );

  const builderWithServers = Object.values(ApiVersions).reduce((builder, version) => {
    const pathSegments = [normalizedPrefix, `${normalizedVersionPrefix}${version}`].filter(Boolean);
    const path = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';

    let finalHost = host.trim();

    // Ensure host has a scheme; default to http if missing
    if (!/^(https|http)?:\/\//i.test(finalHost)) {
      finalHost = `https://${finalHost}`;
    }

    if (finalHost.endsWith('/')) {
      finalHost = finalHost.slice(0, -1);
    }

    return builder.addServer(`${finalHost}${path}`, `API v${version}`);
  }, baseBuilder);

  return builderWithServers.build();
};

export const swaggerCustomOptions: SwaggerCustomOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
  },
  customSiteTitle: process.env.SWAGGER_TITLE ?? 'Nest Monolith Starter',
  patchDocumentOnRequest: (req, _res, doc) => {
    const copyDocument = JSON.parse(JSON.stringify(doc)); // Deep copy to avoid modifying the original
    for (const route in copyDocument.paths) {
      // Remove the version prefix from the path
      const newRoute = route.replace(/^\/api\/v[0-9]+\//, '/');
      if (newRoute !== route) {
        copyDocument.paths[newRoute] = copyDocument.paths[route];
        delete copyDocument.paths[route];
      }
    }
    return copyDocument;
  },
};
