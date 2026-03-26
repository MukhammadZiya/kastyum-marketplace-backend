import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        let status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : { message: exception.message };

        const formattedError = {
            code:
                (errorResponse as any)?.code ||
                (errorResponse as any)?.statusCode ||
                exception.code ||
                'INTERNAL_SERVER_ERROR',
            message:
                (errorResponse as any)?.message ||
                exception.message ||
                'Something went wrong',
        };
        console.log('ERROR:', formattedError);

        response.status(status).json(formattedError);
    }
}
