import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreatePIDto, UpdatePIDto } from './dto/create-pi.dto';
import { CreatePODto, UpdatePODto } from './dto/create-po.dto';
import { CreateCreditDto, UpdateCreditDto } from './dto/create-credit.dto';
import { PIStatus, POStatus, CreditStatus } from './sales.constants';

interface PIItemInput {
  productId?: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

interface POItemInput {
  productId?: string;
  productName: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
}

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private supabaseService: SupabaseService,
    private activityLogsService: ActivityLogsService,
  ) {}

  // ==================== Private Helpers ====================

  private async generateDocumentNumber(
    supplierId: string,
    table: string,
    field: string,
    prefix: string,
    padding: number,
  ): Promise<string> {
    const supabase = this.supabaseService.getAdminClient();
    const year = new Date().getFullYear();
    const fullPrefix = `${prefix}-${year}-`;

    const { data: latest } = await supabase
      .from(table)
      .select(field)
      .eq('supplier_id', supplierId)
      .like(field, `${fullPrefix}%`)
      .order(field, { ascending: false })
      .limit(1)
      .single();

    let seq = 1;
    if (latest?.[field]) {
      const lastSeq = parseInt(latest[field].replace(fullPrefix, ''), 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${fullPrefix}${String(seq).padStart(padding, '0')}`;
  }

  private mapPIItems(piId: string, items: PIItemInput[]) {
    return items.map(item => ({
      pi_id: piId,
      product_id: item.productId || null,
      product_name: item.productName,
      product_sku: item.productSku || null,
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      unit_price: item.unitPrice,
      subtotal: item.quantity * item.unitPrice,
    }));
  }

  private async verifyOwnership(
    table: string,
    id: string,
    supplierId: string,
    entityName: string,
  ): Promise<{ id: string; status: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existing } = await supabase
      .from(table)
      .select('id, status')
      .eq('id', id)
      .eq('supplier_id', supplierId)
      .single();

    if (!existing) {
      throw new NotFoundException(`${entityName} not found`);
    }

    return existing;
  }

  private mapPOItems(orderId: string, items: POItemInput[]) {
    return items.map(item => ({
      order_id: orderId,
      product_id: item.productId || null,
      product_name: item.productName,
      quantity: item.quantity,
      unit: item.unit || 'pcs',
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice,
    }));
  }

  // ==================== PO CRUD ====================

  async createPO(supplierId: string, dto: CreatePODto, actorEmail?: string) {
    const supabase = this.supabaseService.getAdminClient();

    const totalAmount = dto.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const poNumber = dto.poNumber || await this.generateDocumentNumber(supplierId, 'orders', 'po_number', 'PO', 4);
    const status = dto.status || POStatus.PENDING;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        po_number: poNumber,
        supplier_id: supplierId,
        buyer_name: dto.buyerName,
        buyer_email: dto.buyerEmail || null,
        buyer_contact: dto.buyerContact || null,
        buyer_phone: dto.buyerPhone || null,
        buyer_address: dto.buyerAddress || null,
        buyer_country: dto.buyerCountry || null,
        order_date: dto.orderDate || new Date().toISOString(),
        total_amount: totalAmount,
        currency: dto.currency || 'USD',
        incoterms: dto.incoterms || null,
        payment_terms: dto.paymentTerms || null,
        notes: dto.notes || null,
        status,
        created_by: supplierId,
      })
      .select()
      .single();

    if (orderError) {
      this.logger.error('Failed to create PO:', orderError);
      throw new BadRequestException('Failed to create purchase order');
    }

    const itemsToInsert = this.mapPOItems(order.id, dto.items);

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) {
      this.logger.error('Failed to create PO items:', itemsError);
      await supabase.from('orders').delete().eq('id', order.id);
      throw new BadRequestException('Failed to create purchase order items');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'po.create',
        category: 'po',
        description: `created PO #${poNumber}`,
        targetId: order.id,
        targetName: poNumber,
      }).catch(err => this.logger.warn('Activity log failed:', err));
    }

    return { ...order, items: itemsToInsert };
  }

  async getPOList(supplierId: string, query: { status?: string; search?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let qb = supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (query.status && query.status !== 'all') {
      qb = qb.eq('status', query.status);
    }

    if (query.search) {
      qb = qb.or(`po_number.ilike.%${query.search}%,buyer_name.ilike.%${query.search}%`);
    }

    const { data, error } = await qb;

    if (error) {
      this.logger.error('Failed to fetch PO list:', error);
      throw new BadRequestException('Failed to fetch purchase orders');
    }

    return data || [];
  }

  async getPOById(supplierId: string, poId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', poId)
      .eq('supplier_id', supplierId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Purchase order not found');
    }

    return data;
  }

  async updatePO(supplierId: string, poId: string, dto: UpdatePODto, actorEmail?: string) {
    const supabase = this.supabaseService.getAdminClient();

    await this.verifyOwnership('orders', poId, supplierId, 'Purchase order');

    const updateData: Record<string, unknown> = {};
    if (dto.poNumber !== undefined) updateData.po_number = dto.poNumber;
    if (dto.buyerName !== undefined) updateData.buyer_name = dto.buyerName;
    if (dto.buyerEmail !== undefined) updateData.buyer_email = dto.buyerEmail;
    if (dto.buyerContact !== undefined) updateData.buyer_contact = dto.buyerContact;
    if (dto.buyerPhone !== undefined) updateData.buyer_phone = dto.buyerPhone;
    if (dto.buyerAddress !== undefined) updateData.buyer_address = dto.buyerAddress;
    if (dto.buyerCountry !== undefined) updateData.buyer_country = dto.buyerCountry;
    if (dto.orderDate !== undefined) updateData.order_date = dto.orderDate;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.incoterms !== undefined) updateData.incoterms = dto.incoterms;
    if (dto.paymentTerms !== undefined) updateData.payment_terms = dto.paymentTerms;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.items) {
      const totalAmount = dto.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      updateData.total_amount = totalAmount;

      await supabase.from('order_items').delete().eq('order_id', poId);

      const itemsToInsert = this.mapPOItems(poId, dto.items);
      await supabase.from('order_items').insert(itemsToInsert);
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', poId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update PO:', error);
      throw new BadRequestException('Failed to update purchase order');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'po.update',
        category: 'po',
        description: `updated PO #${data.po_number || poId}`,
        targetId: poId,
        targetName: data.po_number || poId,
      }).catch(err => this.logger.warn('Activity log failed:', err));
    }

    return data;
  }

  async deletePO(supplierId: string, poId: string, actorEmail?: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const po = await this.getPOById(supplierId, poId);

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', poId);

    if (error) {
      this.logger.error('Failed to delete PO:', error);
      throw new BadRequestException('Failed to delete purchase order');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'po.delete',
        category: 'po',
        description: `deleted PO #${po.po_number || poId}`,
        targetId: poId,
        targetName: po.po_number || poId,
      }).catch(err => this.logger.warn('Activity log failed:', err));
    }

    return { message: 'Purchase order deleted successfully' };
  }

  async confirmPO(supplierId: string, poId: string) {
    return this.updatePO(supplierId, poId, { status: POStatus.CONFIRMED } as UpdatePODto);
  }

  // ==================== PI CRUD ====================

  async createPI(supplierId: string, dto: CreatePIDto, actorEmail?: string) {
    const supabase = this.supabaseService.getAdminClient();

    const subtotal = dto.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    let creditDiscount = 0;
    if (dto.appliedCredits && dto.appliedCredits.length > 0) {
      for (const ac of dto.appliedCredits) {
        const { data: credit, error } = await supabase
          .from('credits')
          .select('*')
          .eq('id', ac.creditId)
          .eq('supplier_id', supplierId)
          .eq('status', CreditStatus.APPROVED)
          .single();

        if (error || !credit) {
          throw new BadRequestException(`Credit ${ac.creditId} is not available for application`);
        }

        if (ac.amount > credit.amount) {
          throw new BadRequestException(`Applied amount exceeds credit ${credit.credit_number} amount`);
        }

        if (credit.buyer_name !== dto.buyerName) {
          throw new BadRequestException(`Credit ${credit.credit_number} does not belong to buyer ${dto.buyerName}`);
        }

        creditDiscount += ac.amount;
      }
    }

    const totalAmount = Math.max(0, subtotal - creditDiscount);
    const piNumber = await this.generateDocumentNumber(supplierId, 'proforma_invoices', 'pi_number', 'PI', 4);
    const status = dto.status || PIStatus.DRAFT;

    const { data: pi, error: piError } = await supabase
      .from('proforma_invoices')
      .insert({
        pi_number: piNumber,
        supplier_id: supplierId,
        po_number: dto.poNumber || null,
        order_id: dto.orderId || null,
        buyer_name: dto.buyerName,
        buyer_email: dto.buyerEmail || null,
        buyer_country: dto.buyerCountry || null,
        pi_date: dto.piDate || new Date().toISOString().split('T')[0],
        valid_until: dto.validUntil || null,
        subtotal,
        credit_discount: creditDiscount,
        total_amount: totalAmount,
        currency: dto.currency || 'USD',
        incoterms: dto.incoterms || null,
        payment_method: dto.paymentMethod || null,
        remarks: dto.remarks || null,
        status,
        created_by: supplierId,
      })
      .select()
      .single();

    if (piError) {
      this.logger.error('Failed to create PI:', piError);
      throw new BadRequestException('Failed to create proforma invoice');
    }

    const itemsToInsert = this.mapPIItems(pi.id, dto.items);

    const { error: itemsError } = await supabase
      .from('proforma_invoice_items')
      .insert(itemsToInsert);

    if (itemsError) {
      this.logger.error('Failed to create PI items:', itemsError);
      await supabase.from('proforma_invoices').delete().eq('id', pi.id);
      throw new BadRequestException('Failed to create proforma invoice items');
    }

    if (dto.appliedCredits && dto.appliedCredits.length > 0) {
      await this.applyCreditsToPI(supabase, pi.id, dto.appliedCredits);
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'pi.create',
        category: 'pi',
        description: `created PI #${piNumber}`,
        targetId: pi.id,
        targetName: piNumber,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return { ...pi, items: itemsToInsert };
  }

  private async applyCreditsToPI(supabase: ReturnType<SupabaseService['getAdminClient']>, piId: string, appliedCredits: { creditId: string; amount: number }[]): Promise<void> {
    for (const ac of appliedCredits) {
      const { error: appError } = await supabase
        .from('credit_applications')
        .insert({
          credit_id: ac.creditId,
          pi_id: piId,
          amount: ac.amount,
        });

      if (appError) {
        this.logger.error('Failed to apply credit:', appError);
        throw new BadRequestException('Failed to apply credit');
      }

      await supabase
        .from('credits')
        .update({ status: CreditStatus.USED, applied_to_pi_id: piId })
        .eq('id', ac.creditId);
    }
  }

  async getPIList(supplierId: string, query: { status?: string; paymentStatus?: string; search?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let qb = supabase
      .from('proforma_invoices')
      .select('*, proforma_invoice_items(*)')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (query.status && query.status !== 'all') {
      qb = qb.eq('status', query.status);
    }

    if (query.paymentStatus && query.paymentStatus !== 'all') {
      qb = qb.eq('payment_status', query.paymentStatus);
    }

    if (query.search) {
      qb = qb.or(`pi_number.ilike.%${query.search}%,buyer_name.ilike.%${query.search}%,po_number.ilike.%${query.search}%`);
    }

    const { data, error } = await qb;

    if (error) {
      this.logger.error('Failed to fetch PI list:', error);
      throw new BadRequestException('Failed to fetch proforma invoices');
    }

    return data || [];
  }

  async getPIById(supplierId: string, piId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('proforma_invoices')
      .select('*, proforma_invoice_items(*), credit_applications(*, credits(*))')
      .eq('id', piId)
      .eq('supplier_id', supplierId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Proforma invoice not found');
    }

    return data;
  }

  async updatePI(supplierId: string, piId: string, dto: UpdatePIDto, actorEmail?: string) {
    const supabase = this.supabaseService.getAdminClient();

    await this.verifyOwnership('proforma_invoices', piId, supplierId, 'Proforma invoice');

    const updateData: Record<string, unknown> = {};
    if (dto.buyerName !== undefined) updateData.buyer_name = dto.buyerName;
    if (dto.buyerEmail !== undefined) updateData.buyer_email = dto.buyerEmail;
    if (dto.buyerCountry !== undefined) updateData.buyer_country = dto.buyerCountry;
    if (dto.validUntil !== undefined) updateData.valid_until = dto.validUntil;
    if (dto.currency !== undefined) updateData.currency = dto.currency;
    if (dto.incoterms !== undefined) updateData.incoterms = dto.incoterms;
    if (dto.paymentMethod !== undefined) updateData.payment_method = dto.paymentMethod;
    if (dto.remarks !== undefined) updateData.remarks = dto.remarks;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.paymentStatus !== undefined) updateData.payment_status = dto.paymentStatus;

    if (dto.items) {
      const subtotal = dto.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      updateData.subtotal = subtotal;

      await supabase.from('proforma_invoice_items').delete().eq('pi_id', piId);

      const itemsToInsert = this.mapPIItems(piId, dto.items);
      await supabase.from('proforma_invoice_items').insert(itemsToInsert);

      const { data: currentPI } = await supabase
        .from('proforma_invoices')
        .select('credit_discount')
        .eq('id', piId)
        .single();

      const creditDiscount = currentPI?.credit_discount || 0;
      updateData.total_amount = Math.max(0, subtotal - creditDiscount);
    }

    if (dto.appliedCredits !== undefined) {
      await this.removeCreditsFromPI(supabase, piId);

      let creditDiscount = 0;
      if (dto.appliedCredits.length > 0) {
        await this.applyCreditsToPI(supabase, piId, dto.appliedCredits);
        creditDiscount = dto.appliedCredits.reduce((sum, ac) => sum + ac.amount, 0);
      }

      updateData.credit_discount = creditDiscount;
      const currentSubtotal = (updateData.subtotal as number) ?? (await supabase.from('proforma_invoices').select('subtotal').eq('id', piId).single()).data?.subtotal ?? 0;
      updateData.total_amount = Math.max(0, currentSubtotal - creditDiscount);
    }

    const { data, error } = await supabase
      .from('proforma_invoices')
      .update(updateData)
      .eq('id', piId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update PI:', error);
      throw new BadRequestException('Failed to update proforma invoice');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'pi.update',
        category: 'pi',
        description: `updated PI #${data.pi_number}`,
        targetId: piId,
        targetName: data.pi_number,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return data;
  }

  async sendPI(supplierId: string, piId: string, actorEmail?: string) {
    const data = await this.updatePI(supplierId, piId, { status: PIStatus.SENT });

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'pi.send',
        category: 'pi',
        description: `sent PI #${data.pi_number}`,
        targetId: piId,
        targetName: data.pi_number,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return data;
  }

  async deletePI(supplierId: string, piId: string, actorEmail?: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const pi = await this.getPIById(supplierId, piId);

    await this.removeCreditsFromPI(supabase, piId);

    const { error } = await supabase
      .from('proforma_invoices')
      .delete()
      .eq('id', piId);

    if (error) {
      this.logger.error('Failed to delete PI:', error);
      throw new BadRequestException('Failed to delete proforma invoice');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'pi.delete',
        category: 'pi',
        description: `deleted PI #${pi.pi_number}`,
        targetId: piId,
        targetName: pi.pi_number,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return { message: 'Proforma invoice deleted successfully' };
  }

  private async removeCreditsFromPI(supabase: ReturnType<SupabaseService['getAdminClient']>, piId: string): Promise<void> {
    const { data: applications } = await supabase
      .from('credit_applications')
      .select('credit_id')
      .eq('pi_id', piId);

    if (applications && applications.length > 0) {
      const creditIds = applications.map((a: { credit_id: string }) => a.credit_id);
      await supabase
        .from('credits')
        .update({ status: CreditStatus.APPROVED, applied_to_pi_id: null })
        .in('id', creditIds);

      await supabase
        .from('credit_applications')
        .delete()
        .eq('pi_id', piId);
    }
  }

  // ==================== Credit CRUD ====================

  async createCredit(supplierId: string, dto: CreateCreditDto, actorEmail?: string) {
    const supabase = this.supabaseService.getAdminClient();

    const creditNumber = await this.generateDocumentNumber(supplierId, 'credits', 'credit_number', 'CR', 3);
    const status = dto.status || CreditStatus.DRAFT;

    const { data, error } = await supabase
      .from('credits')
      .insert({
        credit_number: creditNumber,
        supplier_id: supplierId,
        invoice_number: dto.invoiceNumber || null,
        invoice_id: dto.invoiceId || null,
        buyer_name: dto.buyerName,
        product_name: dto.productName || null,
        product_sku: dto.productSku || null,
        reason: dto.reason,
        affected_quantity: dto.affectedQuantity || null,
        amount: dto.amount,
        description: dto.description || null,
        status,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create credit:', error);
      throw new BadRequestException('Failed to create credit');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'credit.create',
        category: 'credit',
        description: `created credit $${dto.amount.toLocaleString()} for ${dto.buyerName}`,
        targetId: data.id,
        targetName: creditNumber,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return data;
  }

  async getCreditList(supplierId: string, query: { status?: string; search?: string }) {
    const supabase = this.supabaseService.getAdminClient();

    let qb = supabase
      .from('credits')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (query.status && query.status !== 'all') {
      qb = qb.eq('status', query.status);
    }

    if (query.search) {
      qb = qb.or(`credit_number.ilike.%${query.search}%,buyer_name.ilike.%${query.search}%,product_name.ilike.%${query.search}%`);
    }

    const { data, error } = await qb;

    if (error) {
      this.logger.error('Failed to fetch credit list:', error);
      throw new BadRequestException('Failed to fetch credits');
    }

    return data || [];
  }

  async getCreditById(supplierId: string, creditId: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('credits')
      .select('*, credit_applications(*, proforma_invoices(pi_number, buyer_name))')
      .eq('id', creditId)
      .eq('supplier_id', supplierId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Credit not found');
    }

    return data;
  }

  async updateCredit(supplierId: string, creditId: string, dto: UpdateCreditDto) {
    const supabase = this.supabaseService.getAdminClient();

    const existing = await this.verifyOwnership('credits', creditId, supplierId, 'Credit');

    if (existing.status === CreditStatus.USED && dto.status !== CreditStatus.APPROVED) {
      throw new BadRequestException('Cannot modify a used credit. Cancel the PI application first.');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.buyerName !== undefined) updateData.buyer_name = dto.buyerName;
    if (dto.productName !== undefined) updateData.product_name = dto.productName;
    if (dto.productSku !== undefined) updateData.product_sku = dto.productSku;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.affectedQuantity !== undefined) updateData.affected_quantity = dto.affectedQuantity;
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;

    const { data, error } = await supabase
      .from('credits')
      .update(updateData)
      .eq('id', creditId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update credit:', error);
      throw new BadRequestException('Failed to update credit');
    }

    return data;
  }

  async deleteCredit(supplierId: string, creditId: string, actorEmail?: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    const existing = await this.verifyOwnership('credits', creditId, supplierId, 'Credit');

    if (existing.status === CreditStatus.USED) {
      throw new BadRequestException('Cannot delete a used credit. Cancel the PI application first.');
    }

    // Fetch credit details before deleting
    const credit = await this.getCreditById(supplierId, creditId);

    const { error } = await supabase
      .from('credits')
      .delete()
      .eq('id', creditId);

    if (error) {
      this.logger.error('Failed to delete credit:', error);
      throw new BadRequestException('Failed to delete credit');
    }

    if (actorEmail) {
      this.activityLogsService.log({
        supplierId,
        actorEmail,
        actionType: 'credit.delete',
        category: 'credit',
        description: `deleted credit $${credit.amount}`,
        targetId: creditId,
        targetName: credit.credit_number,
      }).catch(err => this.logger.warn('Activity log failed:', err.message));
    }

    return { message: 'Credit deleted successfully' };
  }

  async getCreditsByBuyer(supplierId: string, buyerName: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('credits')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('buyer_name', buyerName)
      .eq('status', CreditStatus.APPROVED)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch buyer credits:', error);
      throw new BadRequestException('Failed to fetch credits for buyer');
    }

    return data || [];
  }
}
