import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module.js';
import express, { Request, Response } from 'express';

const server = express();

let app: any;

async function bootstrap() {
  if (!app) {
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

    nestApp.enableCors({
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://supplier.wedealize.com',
        'https://wedealize.vercel.app',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
    });

    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await nestApp.init();
    app = nestApp;
  }

  return server;
}

export default async (req: Request, res: Response) => {
  const serverInstance = await bootstrap();
  return serverInstance(req, res);
};
