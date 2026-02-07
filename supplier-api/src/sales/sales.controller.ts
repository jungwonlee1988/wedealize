import { Controller, Post, Get, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreatePIDto, UpdatePIDto } from './dto/create-pi.dto';
import { CreatePODto, UpdatePODto } from './dto/create-po.dto';
import { CreateCreditDto, UpdateCreditDto } from './dto/create-credit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Sales - PO, PI & Credits')
@Controller('api/v1/supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private salesService: SalesService) {}

  // ==================== PO Endpoints ====================

  @Post('po')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a purchase order' })
  @ApiResponse({ status: 201, description: 'PO created' })
  async createPO(@Request() req, @Body() dto: CreatePODto) {
    return this.salesService.createPO(req.user.id, dto);
  }

  @Get('po')
  @ApiOperation({ summary: 'Get PO list' })
  @ApiResponse({ status: 200, description: 'PO list retrieved' })
  async getPOList(
    @Request() req,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.salesService.getPOList(req.user.id, { status, search });
  }

  @Get('po/:id')
  @ApiOperation({ summary: 'Get PO detail' })
  @ApiResponse({ status: 200, description: 'PO detail retrieved' })
  async getPOById(@Request() req, @Param('id') id: string) {
    return this.salesService.getPOById(req.user.id, id);
  }

  @Patch('po/:id')
  @ApiOperation({ summary: 'Update PO' })
  @ApiResponse({ status: 200, description: 'PO updated' })
  async updatePO(@Request() req, @Param('id') id: string, @Body() dto: UpdatePODto) {
    return this.salesService.updatePO(req.user.id, id, dto);
  }

  @Post('po/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm PO' })
  @ApiResponse({ status: 200, description: 'PO confirmed' })
  async confirmPO(@Request() req, @Param('id') id: string) {
    return this.salesService.confirmPO(req.user.id, id);
  }

  @Delete('po/:id')
  @ApiOperation({ summary: 'Delete PO' })
  @ApiResponse({ status: 200, description: 'PO deleted' })
  async deletePO(@Request() req, @Param('id') id: string) {
    return this.salesService.deletePO(req.user.id, id);
  }

  // ==================== PI Endpoints ====================

  @Post('pi')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a proforma invoice' })
  @ApiResponse({ status: 201, description: 'PI created' })
  async createPI(@Request() req, @Body() dto: CreatePIDto) {
    return this.salesService.createPI(req.user.id, dto, req.user.email);
  }

  @Get('pi')
  @ApiOperation({ summary: 'Get PI list' })
  @ApiResponse({ status: 200, description: 'PI list retrieved' })
  async getPIList(
    @Request() req,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.salesService.getPIList(req.user.id, { status, paymentStatus, search });
  }

  @Get('pi/:id')
  @ApiOperation({ summary: 'Get PI detail' })
  @ApiResponse({ status: 200, description: 'PI detail retrieved' })
  async getPIById(@Request() req, @Param('id') id: string) {
    return this.salesService.getPIById(req.user.id, id);
  }

  @Patch('pi/:id')
  @ApiOperation({ summary: 'Update PI' })
  @ApiResponse({ status: 200, description: 'PI updated' })
  async updatePI(@Request() req, @Param('id') id: string, @Body() dto: UpdatePIDto) {
    return this.salesService.updatePI(req.user.id, id, dto, req.user.email);
  }

  @Post('pi/:id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send PI to buyer (draft → sent)' })
  @ApiResponse({ status: 200, description: 'PI sent' })
  async sendPI(@Request() req, @Param('id') id: string) {
    return this.salesService.sendPI(req.user.id, id, req.user.email);
  }

  @Delete('pi/:id')
  @ApiOperation({ summary: 'Delete/cancel PI' })
  @ApiResponse({ status: 200, description: 'PI deleted' })
  async deletePI(@Request() req, @Param('id') id: string) {
    return this.salesService.deletePI(req.user.id, id, req.user.email);
  }

  // ==================== Credit Endpoints ====================

  @Post('credits')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a credit' })
  @ApiResponse({ status: 201, description: 'Credit created' })
  async createCredit(@Request() req, @Body() dto: CreateCreditDto) {
    return this.salesService.createCredit(req.user.id, dto, req.user.email);
  }

  @Get('credits')
  @ApiOperation({ summary: 'Get credit list' })
  @ApiResponse({ status: 200, description: 'Credit list retrieved' })
  async getCreditList(
    @Request() req,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.salesService.getCreditList(req.user.id, { status, search });
  }

  @Get('credits/buyer/:name')
  @ApiOperation({ summary: 'Get available credits for a buyer' })
  @ApiResponse({ status: 200, description: 'Buyer credits retrieved' })
  async getCreditsByBuyer(@Request() req, @Param('name') buyerName: string) {
    return this.salesService.getCreditsByBuyer(req.user.id, decodeURIComponent(buyerName));
  }

  @Get('credits/:id')
  @ApiOperation({ summary: 'Get credit detail' })
  @ApiResponse({ status: 200, description: 'Credit detail retrieved' })
  async getCreditById(@Request() req, @Param('id') id: string) {
    return this.salesService.getCreditById(req.user.id, id);
  }

  @Patch('credits/:id')
  @ApiOperation({ summary: 'Update credit' })
  @ApiResponse({ status: 200, description: 'Credit updated' })
  async updateCredit(@Request() req, @Param('id') id: string, @Body() dto: UpdateCreditDto) {
    return this.salesService.updateCredit(req.user.id, id, dto);
  }

  @Delete('credits/:id')
  @ApiOperation({ summary: 'Delete credit' })
  @ApiResponse({ status: 200, description: 'Credit deleted' })
  async deleteCredit(@Request() req, @Param('id') id: string) {
    return this.salesService.deleteCredit(req.user.id, id, req.user.email);
  }
}
