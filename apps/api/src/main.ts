import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ApiModule } from './api.module';
import { HttpExceptionFilter } from './libs/filters/http-exception.filter';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiModule);

  app.useStaticAssets(join(__dirname, '../../..', 'uploads'), { prefix: '/uploads' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
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
