import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T } | T> {
  private readonly skipRoutes = [
    '/health',
    '/api/v1/health',
    '/files/download',
    '/api/v1/files/download',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T } | T> {
    const request = context.switchToHttp().getRequest();
    const path = request.url?.split('?')[0] || ''; // Remove query string

    // Skip transformation for specific routes
    if (this.skipRoutes.some((route) => path.includes(route))) {
      return next.handle();
    }

    // Skip if response is already wrapped (from exception filter or other interceptor)
    return next.handle().pipe(
      map((data) => {
        // If data is null or undefined, return as-is
        if (data == null) {
          return data;
        }

        // Skip wrapping for error responses (has statusCode or error)
        if (
          typeof data === 'object' &&
          ('statusCode' in data || 'error' in data)
        ) {
          return data;
        }

        // Skip wrapping for paginated responses (has both data and meta properties)
        // PaginatedResponseDto structure: { data: T[], meta: PaginationMetaDto }
        if (
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data &&
          Array.isArray((data as { data: unknown[]; meta: unknown }).data) &&
          typeof (data as { data: unknown[]; meta: unknown }).meta === 'object'
        ) {
          return data;
        }

        // Skip wrapping if already wrapped in { data: ... } structure
        // But not if it's a paginated response (checked above)
        if (
          typeof data === 'object' &&
          'data' in data &&
          !('meta' in data)
        ) {
          return data;
        }

        // Wrap regular responses in { data: ... }
        return { data };
      }),
    );
  }
}
