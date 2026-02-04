import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AppConfigModule } from '../config/config.module';

@Module({
  imports: [AppConfigModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
