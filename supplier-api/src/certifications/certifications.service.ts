import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateCertificationDto, UpdateCertificationDto } from './dto/create-certification.dto';

@Injectable()
export class CertificationsService {
  private readonly logger = new Logger(CertificationsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async createCertification(supplierId: string, dto: CreateCertificationDto) {
    const supabase = this.supabaseService.getAdminClient();

    const row: Record<string, any> = {
      supplier_id: supplierId,
      name: dto.name,
      type: dto.type || null,
      issuer: dto.issuer || null,
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
}
