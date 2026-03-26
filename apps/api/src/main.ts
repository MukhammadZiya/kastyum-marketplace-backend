import { NestFactory } from '@nestjs/core';
import { ApiModule } from './api.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './libs/filters/http-exception.filter';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(ApiModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({ origin: true, credentials: true });

  await app.listen(process.env.PORT ?? 3000, () => {
    console.log(`API server is running on http://localhost:${process.env.PORT ?? 3000}`);
  });
}
bootstrap();
