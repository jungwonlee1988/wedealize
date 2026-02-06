import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateCertificationDto, UpdateCertificationDto } from './dto/create-certification.dto';
import { CreateRenewalDto } from './dto/create-renewal.dto';

@Injectable()
export class CertificationsService {
  private readonly logger = new Logger(CertificationsService.name);

  constructor(private supabaseService: SupabaseService) {}

  private async autoExpireCertifications(supabase: any, supplierId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('supplier_certifications')
      .update({ status: 'expired' })
      .eq('supplier_id', supplierId)
      .in('status', ['valid', 'pending'])
      .not('expiry_date', 'is', null)
      .lt('expiry_date', today);

    if (error) {
      this.logger.warn('Auto-expire check failed:', error);
    }
  }

  async createCertification(supplierId: string, dto: CreateCertificationDto) {
    const supabase = this.supabaseService.getAdminClient();

    const row: Record<string, any> = {
      supplier_id: supplierId,
      name: dto.name,
      type: dto.type || null,
      issuer: dto.issuer || null,
      certificate_number: dto.certificateNumber || null,
      issue_date: dto.issueDate || null,
      expiry_date: dto.expiryDate || null,
      document_url: dto.documentUrl || null,
      status: dto.status || 'valid',
    };

    const { data, error } = await supabase
      .from('supplier_certifications')
      .insert(row)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create certification:', error);
      throw new BadRequestException('Failed to create certification');
    }

    return data;
  }

  async getCertifications(supplierId: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Auto-expire: update certs past expiry_date
    await this.autoExpireCertifications(supabase, supplierId);

    const { data, error } = await supabase
      .from('supplier_certifications')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch certifications:', error);
      throw new BadRequestException('Failed to fetch certifications');
    }

    return { certifications: data || [] };
  }

  async getCertification(supplierId: string, certId: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Auto-expire: update certs past expiry_date
    await this.autoExpireCertifications(supabase, supplierId);

    const { data, error } = await supabase
      .from('supplier_certifications')
      .select('*')
      .eq('id', certId)
      .eq('supplier_id', supplierId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Certification not found');
    }

    return data;
  }

  async updateCertification(supplierId: string, certId: string, dto: UpdateCertificationDto) {
    const supabase = this.supabaseService.getAdminClient();

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('supplier_certifications')
      .select('id')
      .eq('id', certId)
      .eq('supplier_id', supplierId)
      .single();

    if (findError || !existing) {
      throw new NotFoundException('Certification not found');
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.issuer !== undefined) updateData.issuer = dto.issuer;
    if (dto.certificateNumber !== undefined) updateData.certificate_number = dto.certificateNumber;
    if (dto.issueDate !== undefined) updateData.issue_date = dto.issueDate;
    if (dto.expiryDate !== undefined) updateData.expiry_date = dto.expiryDate;
    if (dto.documentUrl !== undefined) updateData.document_url = dto.documentUrl;
    if (dto.status !== undefined) updateData.status = dto.status;

    const { data, error } = await supabase
      .from('supplier_certifications')
      .update(updateData)
      .eq('id', certId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update certification:', error);
      throw new BadRequestException('Failed to update certification');
    }

    return data;
  }

  async deleteCertification(supplierId: string, certId: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('supplier_certifications')
      .select('id')
      .eq('id', certId)
      .eq('supplier_id', supplierId)
      .single();

    if (findError || !existing) {
      throw new NotFoundException('Certification not found');
    }

    const { error } = await supabase
      .from('supplier_certifications')
      .delete()
      .eq('id', certId);

    if (error) {
      this.logger.error('Failed to delete certification:', error);
      throw new BadRequestException('Failed to delete certification');
    }

    return { message: 'Certification deleted successfully' };
  }

  async getRenewals(supplierId: string, certId: string) {
    const supabase = this.supabaseService.getAdminClient();

    // Verify ownership
    const { data: existing, error: findError } = await supabase
      .from('supplier_certifications')
      .select('id')
      .eq('id', certId)
      .eq('supplier_id', supplierId)
      .single();

    if (findError || !existing) {
      throw new NotFoundException('Certification not found');
    }

    const { data, error } = await supabase
      .from('certification_renewals')
      .select('*')
      .eq('certification_id', certId)
      .order('renewed_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch renewals:', error);
      throw new BadRequestException('Failed to fetch renewals');
    }

    return { renewals: data || [] };
  }

  async createRenewal(supplierId: string, certId: string, dto: CreateRenewalDto) {
    const supabase = this.supabaseService.getAdminClient();

    // Verify ownership and get current cert
    const { data: cert, error: findError } = await supabase
      .from('supplier_certifications')
      .select('*')
      .eq('id', certId)
      .eq('supplier_id', supplierId)
      .single();

    if (findError || !cert) {
      throw new NotFoundException('Certification not found');
    }

    // Create renewal record
    const renewalRow = {
      certification_id: certId,
      previous_expiry_date: cert.expiry_date || null,
      new_expiry_date: dto.newExpiryDate,
      notes: dto.notes || null,
    };

    const { data: renewal, error: renewalError } = await supabase
      .from('certification_renewals')
      .insert(renewalRow)
      .select()
      .single();

    if (renewalError) {
      this.logger.error('Failed to create renewal:', renewalError);
      throw new BadRequestException('Failed to create renewal');
    }

    // Update certification expiry_date and status
    const { error: updateError } = await supabase
      .from('supplier_certifications')
      .update({ expiry_date: dto.newExpiryDate, status: 'valid' })
      .eq('id', certId);

    if (updateError) {
      this.logger.error('Failed to update certification after renewal:', updateError);
      throw new BadRequestException('Renewal created but failed to update certification');
    }

    return renewal;
  }
}
