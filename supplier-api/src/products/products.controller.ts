import { Controller, Post, Get, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request, ParseArrayPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Products')
@Controller('api/v1/supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async createProduct(@Request() req, @Body() dto: CreateProductDto) {
    return this.productsService.createProduct(req.user.id, dto);
  }

  @Post('products/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create products' })
  @ApiResponse({ status: 201, description: 'Products created in bulk' })
  async bulkCreateProducts(
    @Request() req,
    @Body(new ParseArrayPipe({ items: CreateProductDto })) dtos: CreateProductDto[],
  ) {
    return this.productsService.bulkCreateProducts(req.user.id, dtos);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get product list' })
  @ApiResponse({ status: 200, description: 'Product list retrieved' })
  async getProducts(
    @Request() req,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.getProducts(req.user.id, { status, search });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Get product detail' })
  @ApiResponse({ status: 200, description: 'Product detail retrieved' })
  async getProductById(@Request() req, @Param('id') id: string) {
    return this.productsService.getProductById(req.user.id, id);
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  async updateProduct(@Request() req, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(req.user.id, id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  async deleteProduct(@Request() req, @Param('id') id: string) {
    return this.productsService.deleteProduct(req.user.id, id);
  }
}
