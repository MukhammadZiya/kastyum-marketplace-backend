import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();

        const method = req.method;
        const url = req.url;

        let logText = `REQUEST: ${method} ${url}`;

        if (req.body && Object.keys(req.body).length > 0) {
            logText += ` | body: ${this.limit(JSON.stringify(req.body), 200)}`;
        }

        if (req.query && Object.keys(req.query).length > 0) {
            logText += ` | query: ${this.limit(JSON.stringify(req.query), 200)}`;
        }

        if (req.params && Object.keys(req.params).length > 0) {
            logText += ` | params: ${this.limit(JSON.stringify(req.params), 200)}`;
        }

        this.logger.verbose(logText);

        const start = Date.now();

        return next.handle().pipe(
            tap((data) => {
                const duration = Date.now() - start;
                const response = this.limit(JSON.stringify(data), 50);

                this.logger.verbose(
                    `RESPONSE: ${method} ${url} | ${duration}ms | res: ${response}`,
                );
            }),
        );
    }

    private limit(str: string, max: number): string {
        if (!str) return '';
        return str.length > max ? str.slice(0, max) + '...' : str;
    }
}
