import {
  Controller, Get, Patch, Delete, Query, Param, Body, Header, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminService, SupplierListQuery } from './admin.service';
import { UpdateSupplierDto } from './dto/admin-supplier.dto';
import { AdminKeyGuard } from './guards/admin-key.guard';

@ApiTags('Admin')
@Controller('api/v1/admin')
@UseGuards(AdminKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ───── Supplier List & Filters ─────

  @Get('suppliers')
  @ApiOperation({ summary: 'Get list of suppliers with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getSuppliers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
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
  async getSupplierStats() {
    return this.adminService.getSupplierStats();
  }

  @Get('suppliers/countries')
  @ApiOperation({ summary: 'Get list of unique countries' })
  async getCountries() {
    return this.adminService.getCountries();
  }

  @Get('suppliers/categories')
  @ApiOperation({ summary: 'Get list of unique categories' })
  async getCategories() {
    return this.adminService.getCategories();
  }

  // ───── Export (must be before :id) ─────

  @Get('suppliers/export')
  @ApiOperation({ summary: 'Export suppliers as CSV' })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=suppliers.csv')
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  async exportSuppliers(
    @Query('search') search?: string,
    @Query('country') country?: string,
    @Query('category') category?: string,
  ) {
    return this.adminService.exportSuppliers({ search, country, category });
  }

  // ───── Supplier Detail / Update / Delete ─────

  @Get('suppliers/:id')
  @ApiOperation({ summary: 'Get supplier detail with related counts' })
  @ApiParam({ name: 'id', type: String })
  async getSupplierDetail(@Param('id') id: string) {
    return this.adminService.getSupplierDetail(id);
  }

  @Patch('suppliers/:id')
  @ApiOperation({ summary: 'Update supplier info' })
  @ApiParam({ name: 'id', type: String })
  async updateSupplier(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.adminService.updateSupplier(id, dto);
  }

  @Patch('suppliers/:id/status')
  @ApiOperation({ summary: 'Toggle supplier active status' })
  @ApiParam({ name: 'id', type: String })
  async toggleSupplierStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.toggleSupplierStatus(id, isActive);
  }

  @Delete('suppliers/:id')
  @ApiOperation({ summary: 'Permanently delete a supplier' })
  @ApiParam({ name: 'id', type: String })
  async deleteSupplier(@Param('id') id: string) {
    return this.adminService.deleteSupplier(id);
  }

  // ───── Platform Stats & Analytics ─────

  @Get('stats/platform')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('stats/signup-trends')
  @ApiOperation({ summary: 'Get signup trends chart data' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly'] })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getSignupTrends(
    @Query('period') period?: string,
    @Query('days') days?: string,
  ) {
    return this.adminService.getSignupTrends(
      period || 'daily',
      days ? parseInt(days, 10) : 30,
    );
  }

  @Get('stats/distributions')
  @ApiOperation({ summary: 'Get category and country distribution data' })
  async getDistributions() {
    return this.adminService.getDistributions();
  }

  // ───── Activity Feed ─────

  @Get('activity/recent')
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentActivity(@Query('limit') limit?: string) {
    return this.adminService.getRecentActivity(limit ? parseInt(limit, 10) : 20);
  }
}
