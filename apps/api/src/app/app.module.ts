import { Module } from '@nestjs/common';

import { ConfigModule } from './config';
import { ToolsController } from './controllers';
import { ZenGraphQLModule } from './graphql';
import { JwtModule } from './jwt';
import { PrismaModule } from './prisma';

@Module({
  imports: [ConfigModule, JwtModule, ZenGraphQLModule, PrismaModule],
  controllers: [ToolsController],
})
export class AppModule {}