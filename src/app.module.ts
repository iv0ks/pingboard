import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller.js';
import { HealthController } from './health.controller.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [HealthController, AuthController],
})
export class AppModule {}
