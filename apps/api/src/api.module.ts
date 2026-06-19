import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { ComponentsModule } from './components/components.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    // Global rate limiting: 20 requests per 60 seconds per IP by default.
    // Auth-heavy endpoints use @Throttle({ auth: ... }) to apply stricter limits.
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 60 },
      { name: 'auth', ttl: 60000, limit: 10 },
    ]),
    ComponentsModule,
  ],
  controllers: [ApiController],
  providers: [
    ApiService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class ApiModule { }
