import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    AdminModule,
  ],
})
export class AppModule {}
