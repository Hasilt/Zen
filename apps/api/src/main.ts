import { Logger, NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import * as helmet from 'helmet';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

async function bootstrap() {
  const port = process.env.PORT || environment.expressPort;
  const nestOptions: NestApplicationOptions = {
    cors: environment.production ? undefined : { credentials: true, origin: true },
  };

  const app = await NestFactory.create(AppModule, nestOptions);
  app.use(cookieParser());
  app.use(helmet());

  await app.listen(port, () => {
    Logger.log(`Listening at http://localhost:${port}`);
  });
}

bootstrap();