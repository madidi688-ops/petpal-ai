import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<{ headersSent?: boolean }>();
    return next.handle().pipe(
      map((data) => {
        // SSE / 手动写响应时不再包一层 { ok, data }
        if (res.headersSent) return data;
        if (data && typeof data === 'object' && 'ok' in (data as object)) {
          return data;
        }
        return { ok: true, data };
      }),
    );
  }
}
