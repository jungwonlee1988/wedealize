import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SalesModule } from './sales/sales.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { AccountsModule } from './accounts/accounts.module';
import { ProductsModule } from './products/products.module';
import { CatalogUploadsModule } from './catalog-uploads/catalog-uploads.module';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    AdminModule,
    SalesModule,
    DiscoveryModule,
    AccountsModule,
    ProductsModule,
    CatalogUploadsModule,
  ],
})
export class AppModule {}
