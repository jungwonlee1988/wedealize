import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async createAccount(supplierId: string, dto: CreateAccountDto) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        supplier_id: supplierId,
        company_name: dto.companyName,
        country: dto.country || null,
        address: dto.address || null,
        contact_name: dto.contactName || null,
        contact_position: dto.contactPosition || null,
        email: dto.email || null,
        phone: dto.phone || null,
        currency: dto.currency || 'USD',
        incoterms: dto.incoterms || null,
        payment_terms: dto.paymentTerms || null,
        notes: dto.notes || null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create account:', error);
      throw new BadRequestException('Failed to create account');
    }

    return data;
  }

  async getAccounts(supplierId: string, query: { search?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let qb = supabase
      .from('accounts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (query.search) {
      qb = qb.or(
        `company_name.ilike.%${query.search}%,contact_name.ilike.%${query.search}%,email.ilike.%${query.search}%`,
      );
    }

    const { data, error } = await qb;

    if (error) {
      this.logger.error('Failed to fetch accounts:', error);
      throw new BadRequestException('Failed to fetch accounts');
    }

    return data || [];
  }

  async getAccountById(supplierId: string, accountId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('supplier_id', supplierId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Account not found');
    }

    return data;
  }

  async updateAccount(supplierId: string, accountId: string, dto: UpdateAccountDto) {
    const supabase = this.supabaseService.getAdminClient();

    await this.getAccountById(supplierId, accountId);

    const updateData: Record<string, unknown> = {};
    if (dto.companyName !== undefined) updateData.company_name = dto.companyName;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.contactName !== undefined) updateData.contact_name = dto.contactName;
    if (dto.contactPosition !== undefined) updateData.contact_position = dto.contactPosition;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.incoterms !== undefined) updateData.incoterms = dto.incoterms;
    if (dto.paymentTerms !== undefined) updateData.payment_terms = dto.paymentTerms;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const { data, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update account:', error);
      throw new BadRequestException('Failed to update account');
    }

    return data;
  }

  async deleteAccount(supplierId: string, accountId: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    await this.getAccountById(supplierId, accountId);

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      this.logger.error('Failed to delete account:', error);
      throw new BadRequestException('Failed to delete account');
    }

    return { message: 'Account deleted successfully' };
  }
}
