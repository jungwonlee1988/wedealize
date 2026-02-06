import { Module } from '@nestjs/common';
import { CatalogUploadsController } from './catalog-uploads.controller';
import { CatalogUploadsService } from './catalog-uploads.service';
import { CatalogExtractionService } from './catalog-extraction.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CatalogUploadsController],
  providers: [CatalogUploadsService, CatalogExtractionService],
  exports: [CatalogUploadsService],
})
export class CatalogUploadsModule {}
