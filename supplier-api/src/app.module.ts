import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { SalesModule } from './sales/sales.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { AccountsModule } from './accounts/accounts.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    AdminModule,
    SalesModule,
    DiscoveryModule,
    AccountsModule,
    ProductsModule,
  ],
})
export class AppModule {}
