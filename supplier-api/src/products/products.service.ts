import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private supabaseService: SupabaseService,
    private activityLogsService: ActivityLogsService,
  ) {}

  private calculateCompleteness(product: Record<string, any>): number {
    const fields = ['name', 'sku', 'category', 'description', 'min_price', 'max_price', 'moq', 'moq_unit'];
    const filled = fields.filter((f) => product[f] != null && product[f] !== '').length;
    const hasCerts = Array.isArray(product.certifications) && product.certifications.length > 0;
    const total = fields.length + 1; // +1 for certifications
    return Math.round(((filled + (hasCerts ? 1 : 0)) / total) * 100);
  }

  async createProduct(supplierId: string, dto: CreateProductDto, actorEmail?: string) {
    const supabase = this.supabaseService.getAdminClient();

    const row: Record<string, any> = {
      supplier_id: supplierId,
      name: dto.name,
      sku: dto.sku || null,
      category: dto.category || null,
      description: dto.description || null,
      min_price: dto.minPrice ?? null,
      max_price: dto.maxPrice ?? null,
      moq: dto.moq ?? null,
      moq_unit: dto.moqUnit || null,
      certifications: dto.certifications || [],
      lead_time: dto.leadTime ?? null,
      notes: dto.notes || null,
      status: dto.status || 'active',
    };
    row.completeness = this.calculateCompleteness(row);

    const { data, error } = await supabase
      .from('products')
      .insert(row)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create product:', error);
      throw new BadRequestException('Failed to create product');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'product.create',
        category: 'product',
        description: `created product '${dto.name}'`,
        targetId: data.id,
        targetName: dto.name,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return data;
  }

  async bulkCreateProducts(supplierId: string, dtos: CreateProductDto[], actorEmail?: string) {
    const supabase = this.supabaseService.getAdminClient();

    const rows = dtos.map((dto) => {
      const row: Record<string, any> = {
        supplier_id: supplierId,
        name: dto.name,
        sku: dto.sku || null,
        category: dto.category || null,
        description: dto.description || null,
        min_price: dto.minPrice ?? null,
        max_price: dto.maxPrice ?? null,
        moq: dto.moq ?? null,
        moq_unit: dto.moqUnit || null,
        certifications: dto.certifications || [],
        status: dto.status || 'active',
      };
      row.completeness = this.calculateCompleteness(row);
      return row;
    });

    const { data, error } = await supabase
      .from('products')
      .insert(rows)
      .select();

    if (error) {
      this.logger.error('Failed to bulk create products:', error);
      throw new BadRequestException('Failed to bulk create products');
    }

    const count = (data || []).length;

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'product.bulk_create',
        category: 'product',
        description: `bulk created ${count} products from catalog`,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return { products: data || [], count };
  }

  async getProducts(supplierId: string, query: { status?: string; search?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let qb = supabase
      .from('products')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (query.status) {
      qb = qb.eq('status', query.status);
    }

    if (query.search) {
      qb = qb.or(
        `name.ilike.%${query.search}%,sku.ilike.%${query.search}%,category.ilike.%${query.search}%`,
      );
    }

    const { data, error } = await qb;

    if (error) {
      this.logger.error('Failed to fetch products:', error);
      throw new BadRequestException('Failed to fetch products');
    }

    return { products: data || [] };
  }

  async getProductById(supplierId: string, productId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('supplier_id', supplierId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Product not found');
    }

    return data;
  }

  async updateProduct(supplierId: string, productId: string, dto: UpdateProductDto, actorEmail?: string) {
    const supabase = this.supabaseService.getAdminClient();

    await this.getProductById(supplierId, productId);

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.minPrice !== undefined) updateData.min_price = dto.minPrice;
    if (dto.maxPrice !== undefined) updateData.max_price = dto.maxPrice;
    if (dto.moq !== undefined) updateData.moq = dto.moq;
    if (dto.moqUnit !== undefined) updateData.moq_unit = dto.moqUnit;
    if (dto.certifications !== undefined) updateData.certifications = dto.certifications;
    if (dto.leadTime !== undefined) updateData.lead_time = dto.leadTime;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    // Recalculate completeness: merge existing + update
    const existing = await this.getProductById(supplierId, productId);
    const merged = { ...existing, ...updateData };
    updateData.completeness = this.calculateCompleteness(merged);

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update product:', error);
      throw new BadRequestException('Failed to update product');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'product.update',
        category: 'product',
        description: `updated product '${data.name}'`,
        targetId: productId,
        targetName: data.name,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return data;
  }

  async deleteProduct(supplierId: string, productId: string, actorEmail?: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const product = await this.getProductById(supplierId, productId);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      this.logger.error('Failed to delete product:', error);
      throw new BadRequestException('Failed to delete product');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'product.delete',
        category: 'product',
        description: `deleted product '${product.name}'`,
        targetId: productId,
        targetName: product.name,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return { message: 'Product deleted successfully' };
  }
}
