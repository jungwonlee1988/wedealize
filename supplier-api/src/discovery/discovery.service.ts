import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateInquiryDto, UpdateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryStatus } from './discovery.constants';

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private supabaseService: SupabaseService) {}

  // ==================== Products ====================

  async getCompletedProducts(supplierId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, category, images, status, completeness')
      .eq('supplier_id', supplierId)
      .eq('status', 'completed')
      .order('name');

    if (error) {
      this.logger.error('Failed to fetch completed products', error);
      throw error;
    }

    return { products: data || [] };
  }

  // ==================== Inquiry CRUD ====================

  async createInquiry(supplierId: string, dto: CreateInquiryDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: inquiry, error } = await supabase
      .from('buyer_inquiries')
      .insert({
        supplier_id: supplierId,
        buyer_company: dto.buyerCompany,
        buyer_contact: dto.buyerContact || null,
        buyer_email: dto.buyerEmail || null,
        buyer_phone: dto.buyerPhone || null,
        buyer_country: dto.buyerCountry || null,
        message: dto.message || null,
        status: InquiryStatus.ACTIVE,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create inquiry', error);
      throw error;
    }

    // Link products if provided
    if (dto.productIds && dto.productIds.length > 0) {
      await this.linkProducts(inquiry.id, dto.productIds);
    }

    return this.getInquiryById(supplierId, inquiry.id);
  }

  async getInquiries(supplierId: string, filters: { status?: string; search?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let query = supabase
      .from('buyer_inquiries')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.search) {
      query = query.or(
        `buyer_company.ilike.%${filters.search}%,buyer_contact.ilike.%${filters.search}%,buyer_email.ilike.%${filters.search}%`,
      );
    }

    const { data: inquiries, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch inquiries', error);
      throw error;
    }

    // Fetch linked products for each inquiry
    const result = await Promise.all(
      (inquiries || []).map(async (inquiry) => {
        const products = await this.getInquiryProducts(inquiry.id);
        return { ...inquiry, products };
      }),
    );

    return { inquiries: result };
  }

  async getInquiryById(supplierId: string, inquiryId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: inquiry, error } = await supabase
      .from('buyer_inquiries')
      .select('*')
      .eq('id', inquiryId)
      .eq('supplier_id', supplierId)
      .single();

    if (error || !inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    const products = await this.getInquiryProducts(inquiry.id);

    return { ...inquiry, products };
  }

  async updateInquiry(supplierId: string, inquiryId: string, dto: UpdateInquiryDto) {
    const supabase = this.supabaseService.getAdminClient();

    // Verify ownership
    await this.getInquiryById(supplierId, inquiryId);

    const updateData: Record<string, any> = {};
    if (dto.buyerCompany !== undefined) updateData.buyer_company = dto.buyerCompany;
    if (dto.buyerContact !== undefined) updateData.buyer_contact = dto.buyerContact;
    if (dto.buyerEmail !== undefined) updateData.buyer_email = dto.buyerEmail;
    if (dto.buyerPhone !== undefined) updateData.buyer_phone = dto.buyerPhone;
    if (dto.buyerCountry !== undefined) updateData.buyer_country = dto.buyerCountry;
    if (dto.message !== undefined) updateData.message = dto.message;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('buyer_inquiries')
        .update(updateData)
        .eq('id', inquiryId)
        .eq('supplier_id', supplierId);

      if (error) {
        this.logger.error('Failed to update inquiry', error);
        throw error;
      }
    }

    // Replace products if provided
    if (dto.productIds !== undefined) {
      await this.replaceProducts(inquiryId, dto.productIds);
    }

    return this.getInquiryById(supplierId, inquiryId);
  }

  async deleteInquiry(supplierId: string, inquiryId: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Verify ownership
    await this.getInquiryById(supplierId, inquiryId);

    const { error } = await supabase
      .from('buyer_inquiries')
      .delete()
      .eq('id', inquiryId)
      .eq('supplier_id', supplierId);

    if (error) {
      this.logger.error('Failed to delete inquiry', error);
      throw error;
    }

    return { message: 'Inquiry deleted successfully' };
  }

  // ==================== Private Helpers ====================

  private async getInquiryProducts(inquiryId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('buyer_inquiry_products')
      .select('product_id, products(id, name, sku, category)')
      .eq('inquiry_id', inquiryId);

    if (error) {
      this.logger.error('Failed to fetch inquiry products', error);
      return [];
    }

    return (data || []).map((row: any) => row.products).filter(Boolean);
  }

  private async linkProducts(inquiryId: string, productIds: string[]) {
    const supabase = this.supabaseService.getAdminClient();

    const rows = productIds.map((productId) => ({
      inquiry_id: inquiryId,
      product_id: productId,
    }));

    const { error } = await supabase
      .from('buyer_inquiry_products')
      .insert(rows);

    if (error) {
      this.logger.error('Failed to link products to inquiry', error);
    }
  }

  private async replaceProducts(inquiryId: string, productIds: string[]) {
    const supabase = this.supabaseService.getAdminClient();

    // Delete existing
    await supabase
      .from('buyer_inquiry_products')
      .delete()
      .eq('inquiry_id', inquiryId);

    // Insert new
    if (productIds.length > 0) {
      await this.linkProducts(inquiryId, productIds);
    }
  }
}
