import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateCatalogUploadDto, UpdateCatalogUploadDto } from './dto/create-catalog-upload.dto';

@Injectable()
export class CatalogUploadsService {
  private readonly logger = new Logger(CatalogUploadsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async create(supplierId: string, dto: CreateCatalogUploadDto) {
    const supabase = this.supabaseService.getAdminClient();

    const row: Record<string, any> = {
      supplier_id: supplierId,
      file_name: dto.fileName,
      file_type: dto.fileType || null,
      file_size: dto.fileSize || null,
      status: dto.status || 'pending',
      products_extracted: dto.productsExtracted || 0,
    };

    const { data, error } = await supabase
      .from('catalog_uploads')
      .insert(row)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create catalog upload:', error);
      throw new BadRequestException('Failed to create catalog upload');
    }

    return data;
  }

  async findAll(supplierId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('catalog_uploads')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch catalog uploads:', error);
      throw new BadRequestException('Failed to fetch catalog uploads');
    }

    return { uploads: data || [] };
  }

  async update(supplierId: string, id: string, dto: UpdateCatalogUploadDto) {
    const supabase = this.supabaseService.getAdminClient();

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('catalog_uploads')
      .select('id')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (findError || !existing) {
      throw new NotFoundException('Catalog upload not found');
    }

    const updateData: Record<string, any> = {};
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'processed' || dto.status === 'matched') {
        updateData.completed_at = new Date().toISOString();
      }
    }
    if (dto.productsExtracted !== undefined) {
      updateData.products_extracted = dto.productsExtracted;
    }

    const { data, error } = await supabase
      .from('catalog_uploads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update catalog upload:', error);
      throw new BadRequestException('Failed to update catalog upload');
    }

    return data;
  }

  async remove(supplierId: string, id: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existing, error: findError } = await supabase
      .from('catalog_uploads')
      .select('id')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (findError || !existing) {
      throw new NotFoundException('Catalog upload not found');
    }

    const { error } = await supabase
      .from('catalog_uploads')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error('Failed to delete catalog upload:', error);
      throw new BadRequestException('Failed to delete catalog upload');
    }

    return { message: 'Catalog upload deleted successfully' };
  }
}
