import 'reflect-metadata';
import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@gpm/backend/dist/app.module';

let appContext: INestApplicationContext | null = null;

export async function getAppContext(): Promise<INestApplicationContext> {
  if (!appContext) {
    appContext = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
  }
  return appContext;
}

export async function closeAppContext(): Promise<void> {
  if (appContext) {
    await appContext.close();
    appContext = null;
  }
}
