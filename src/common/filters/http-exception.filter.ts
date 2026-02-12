import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

import { ErrorMessages } from '../constants/error-messages.constant';

@Catch()
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
  ) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : ErrorMessages.ERRORS.INTERNAL;

    // Translate the message if it's an i18n key (contains dot notation like 'auth.email_taken')
    // or if it's an object with a message property that might be an i18n key
    let translatedMessage = exceptionResponse;

    // Get language from request (set by AcceptLanguageResolver or locale middleware)
    const lang = (request.i18nLang || request.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en').toLowerCase();

    if (typeof exceptionResponse === 'string') {
      // Check if it looks like an i18n key (contains dots)
      if (exceptionResponse.includes('.')) {
        try {
          translatedMessage = await this.i18nService.translate(exceptionResponse, { lang });
        } catch {
          // If translation fails, use the original message (might be plain text)
          translatedMessage = exceptionResponse;
        }
      }
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      // Handle object responses (like ValidationError or HttpException with options)
      const responseObj = exceptionResponse as {
        message?: string | string[];
        error?: string;
        args?: Record<string, any>;
      };

      if (responseObj.message) {
        if (typeof responseObj.message === 'string' && responseObj.message.includes('.')) {
          try {
            // Translate with parameters if provided
            const translated = await this.i18nService.translate(responseObj.message, {
              lang,
              args: responseObj.args || {},
            });
            translatedMessage = {
              ...responseObj,
              message: translated,
            };
          } catch {
            // Use original if translation fails
            translatedMessage = exceptionResponse;
          }
        } else if (Array.isArray(responseObj.message)) {
          // Translate array of messages
          const translatedMessages = await Promise.all(
            responseObj.message.map(async (msg) => {
              if (typeof msg === 'string' && msg.includes('.')) {
                try {
                  return await this.i18nService.translate(msg, { lang });
                } catch {
                  return msg;
                }
              }
              return msg;
            }),
          );
          translatedMessage = {
            ...responseObj,
            message: translatedMessages,
          };
        } else {
          translatedMessage = exceptionResponse;
        }
      } else {
        translatedMessage = exceptionResponse;
      }
    }

    const message = translatedMessage;

    const isDevelopment = this.configService.get<string>('app.env') === 'dev';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(isDevelopment && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Build detailed log message
    const logMessage = `${request.method} ${request.url} - ${status} - ${JSON.stringify(message)}`;

    if (isDevelopment) {
      // Detailed logging for development environment
      const logDetails = {
        statusCode: status,
        method: request.method,
        url: request.url,
        path: request.path,
        query: request.query,
        params: request.params,
        body: this.sanitizeRequestBody(request.body),
        headers: this.sanitizeHeaders(request.headers),
        ip: request.ip || request.connection?.remoteAddress,
        userAgent: request.get('user-agent'),
        user: request.user || undefined,
        timestamp: new Date().toISOString(),
        error: {
          message: exception instanceof Error ? exception.message : String(exception),
          name: exception instanceof Error ? exception.name : 'Unknown',
          stack: exception instanceof Error ? exception.stack : undefined,
        },
      };

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error('═══════════════════════════════════════════════════════════');
        this.logger.error(`❌ INTERNAL SERVER ERROR: ${logMessage}`);
        this.logger.error('───────────────────────────────────────────────────────────');
        this.logger.error(JSON.stringify(logDetails, null, 2));
        this.logger.error('═══════════════════════════════════════════════════════════');
      } else if (status >= HttpStatus.BAD_REQUEST) {
        this.logger.warn('═══════════════════════════════════════════════════════════');
        this.logger.warn(`⚠️  CLIENT ERROR: ${logMessage}`);
        this.logger.warn('───────────────────────────────────────────────────────────');
        this.logger.warn(JSON.stringify(logDetails, null, 2));
        this.logger.warn('═══════════════════════════════════════════════════════════');
      } else {
        this.logger.debug(`ℹ️  ${logMessage}`);
        this.logger.debug(JSON.stringify(logDetails, null, 2));
      }
    } else {
      // Production logging (less verbose)
      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(
          logMessage,
          exception instanceof Error ? exception.stack : JSON.stringify(exception),
        );
      } else if (status >= HttpStatus.BAD_REQUEST) {
        this.logger.warn(logMessage);
      } else {
        this.logger.debug(logMessage);
      }
    }

    response.status(status).json(errorResponse);
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'authorization',
      'apiKey',
      'accessToken',
      'refreshToken',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers || typeof headers !== 'object') {
      return headers;
    }

    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-access-token'];
    const sanitized = { ...headers };

    for (const header of sensitiveHeaders) {
      const lowerHeader = header.toLowerCase();
      for (const key in sanitized) {
        if (key.toLowerCase() === lowerHeader) {
          sanitized[key] = '***REDACTED***';
        }
      }
    }

    return sanitized;
  }
}
