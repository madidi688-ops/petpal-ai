import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const isDev = process.env.NODE_ENV !== 'production';
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('http://') || s.startsWith('https://') ? s : `https://${s}`));

  app.enableCors({
    // 开发态允许手机局域网源；生产用 CORS_ORIGIN 白名单（可带或不带 https://）
    origin: isDev ? true : corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const port = Number(process.env.PORT ?? 4000);
  // 0.0.0.0：允许手机通过局域网 IP 访问
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`PetPal API listening on http://0.0.0.0:${port} (LAN phones OK)`);
}

bootstrap();
