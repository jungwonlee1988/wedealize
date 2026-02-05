import { Controller, Post, Get, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
// Note: GET /products moved to ProductsController
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';
import { CreateInquiryDto, UpdateInquiryDto } from './dto/create-inquiry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Discovery - Buyer Inquiries')
@Controller('api/v1/supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiscoveryController {
  constructor(private discoveryService: DiscoveryService) {}

  // ==================== Inquiry CRUD ====================

  @Post('inquiries')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a buyer inquiry' })
  @ApiResponse({ status: 201, description: 'Inquiry created' })
  async createInquiry(@Request() req, @Body() dto: CreateInquiryDto) {
    return this.discoveryService.createInquiry(req.user.id, dto);
  }

  @Get('inquiries')
  @ApiOperation({ summary: 'Get inquiry list' })
  @ApiResponse({ status: 200, description: 'Inquiry list retrieved' })
  async getInquiries(
    @Request() req,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.discoveryService.getInquiries(req.user.id, { status, search });
  }

  @Get('inquiries/:id')
  @ApiOperation({ summary: 'Get inquiry detail' })
  @ApiResponse({ status: 200, description: 'Inquiry detail retrieved' })
  async getInquiryById(@Request() req, @Param('id') id: string) {
    return this.discoveryService.getInquiryById(req.user.id, id);
  }

  @Patch('inquiries/:id')
  @ApiOperation({ summary: 'Update inquiry' })
  @ApiResponse({ status: 200, description: 'Inquiry updated' })
  async updateInquiry(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateInquiryDto,
  ) {
    return this.discoveryService.updateInquiry(req.user.id, id, dto);
  }

  @Delete('inquiries/:id')
  @ApiOperation({ summary: 'Delete inquiry' })
  @ApiResponse({ status: 200, description: 'Inquiry deleted' })
  async deleteInquiry(@Request() req, @Param('id') id: string) {
    return this.discoveryService.deleteInquiry(req.user.id, id);
  }
}
