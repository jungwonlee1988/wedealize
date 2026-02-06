import { Controller, Post, Get, Patch, Delete, Body, Param, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogUploadsService } from './catalog-uploads.service';
import { CreateCatalogUploadDto, UpdateCatalogUploadDto } from './dto/create-catalog-upload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Catalog Uploads')
@Controller('api/v1/supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CatalogUploadsController {
  constructor(private catalogUploadsService: CatalogUploadsService) {}

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
