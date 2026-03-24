import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GithubExceptionFilter } from './filters/github-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GithubExceptionFilter());
  const port = parseInt(process.env.GPM_PORT || '6170', 10);
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();
