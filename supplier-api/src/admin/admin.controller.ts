import { Controller, Get, Query, UnauthorizedException, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AdminService, SupplierListQuery } from './admin.service';

@ApiTags('Admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  private validateAdminKey(adminKey: string): void {
    const validKey = this.configService.get<string>('adminKey') || 'wedealize-admin-2024';
    if (adminKey !== validKey) {
      throw new UnauthorizedException('Invalid admin key');
    }
  }

  @Get('suppliers')
  @ApiOperation({ summary: 'Get list of suppliers with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by company name or email' })
  @ApiQuery({ name: 'country', required: false, type: String, description: 'Filter by country' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Filter by start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Filter by end date (ISO format)' })
  @ApiResponse({ status: 200, description: 'List of suppliers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSuppliers(
    @Headers('x-admin-key') adminKey: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.validateAdminKey(adminKey);

    const query: SupplierListQuery = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      country,
      category,
      startDate,
      endDate,
    };

    return this.adminService.getSuppliers(query);
  }

  @Get('suppliers/stats')
  @ApiOperation({ summary: 'Get supplier statistics' })
  @ApiResponse({ status: 200, description: 'Supplier statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSupplierStats(@Headers('x-admin-key') adminKey: string) {
    this.validateAdminKey(adminKey);
    return this.adminService.getSupplierStats();
  }

  @Get('suppliers/countries')
  @ApiOperation({ summary: 'Get list of unique countries' })
  @ApiResponse({ status: 200, description: 'List of countries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCountries(@Headers('x-admin-key') adminKey: string) {
    this.validateAdminKey(adminKey);
    return this.adminService.getCountries();
  }

  @Get('suppliers/categories')
  @ApiOperation({ summary: 'Get list of unique categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCategories(@Headers('x-admin-key') adminKey: string) {
    this.validateAdminKey(adminKey);
    return this.adminService.getCategories();
  }
}
