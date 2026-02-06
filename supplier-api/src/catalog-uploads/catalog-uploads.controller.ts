import { Controller, Post, Get, Patch, Delete, Body, Param, HttpCode, HttpStatus, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogUploadsService } from './catalog-uploads.service';
import { CatalogExtractionService } from './catalog-extraction.service';
import { CreateCatalogUploadDto, UpdateCatalogUploadDto } from './dto/create-catalog-upload.dto';
import { ExtractCatalogDto } from './dto/extract-catalog.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Catalog Uploads')
@Controller('api/v1/supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CatalogUploadsController {
  private readonly logger = new Logger(CatalogUploadsController.name);

  constructor(
    private catalogUploadsService: CatalogUploadsService,
    private catalogExtractionService: CatalogExtractionService,
  ) {}

  @Post('catalog/extract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extract products from catalog images using AI' })
  @ApiResponse({ status: 200, description: 'Products extracted' })
  async extractCatalog(@Request() req, @Body() dto: ExtractCatalogDto) {
    this.logger.log(`Extracting catalog for supplier ${req.user.id}, ${dto.images.length} images, batch ${dto.batchIndex ?? 0}/${dto.totalBatches ?? 1}`);
    const products = await this.catalogExtractionService.extractProducts(dto.images, dto.fileName);
    return {
      products,
      batchIndex: dto.batchIndex ?? 0,
      totalBatches: dto.totalBatches ?? 1,
      count: products.length,
    };
  }

  @Post('catalog-uploads')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a catalog upload' })
  @ApiResponse({ status: 201, description: 'Upload recorded' })
  async create(@Request() req, @Body() dto: CreateCatalogUploadDto) {
    return this.catalogUploadsService.create(req.user.id, dto);
  }

  @Get('catalog-uploads')
  @ApiOperation({ summary: 'Get upload history' })
  @ApiResponse({ status: 200, description: 'Upload history retrieved' })
  async findAll(@Request() req) {
    return this.catalogUploadsService.findAll(req.user.id);
  }

  @Patch('catalog-uploads/:id')
  @ApiOperation({ summary: 'Update upload record' })
  @ApiResponse({ status: 200, description: 'Upload updated' })
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdateCatalogUploadDto) {
    return this.catalogUploadsService.update(req.user.id, id, dto);
  }

  @Delete('catalog-uploads/:id')
  @ApiOperation({ summary: 'Delete upload record' })
  @ApiResponse({ status: 200, description: 'Upload deleted' })
  async remove(@Request() req, @Param('id') id: string) {
    return this.catalogUploadsService.remove(req.user.id, id);
  }
}
