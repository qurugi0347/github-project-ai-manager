import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const port = parseInt(process.env.GPM_PORT || '6170', 10);
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();
