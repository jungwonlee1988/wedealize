import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { UpdateSupplierDto } from './dto/admin-supplier.dto';

export interface SupplierListQuery {
  page?: number;
  limit?: number;
  search?: string;
  country?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

export interface SupplierListResponse {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupplierStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private supabaseService: SupabaseService) {}

  async getSuppliers(query: SupplierListQuery): Promise<SupplierListResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      country,
      category,
      startDate,
      endDate,
    } = query;

    const supabase = this.supabaseService.getAdminClient();
    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = supabase
      .from('suppliers')
      .select('id, email, company_name, country, category, created_at, email_verified, is_active', { count: 'exact' });

    // Apply search filter
    if (search) {
      queryBuilder = queryBuilder.or(`company_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply country filter
    if (country) {
      queryBuilder = queryBuilder.eq('country', country);
    }

    // Apply category filter (TEXT[] column)
    if (category) {
      queryBuilder = queryBuilder.contains('category', [category]);
    }

    // Apply date range filter
    if (startDate) {
      queryBuilder = queryBuilder.gte('created_at', startDate);
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('created_at', endDate);
    }

    // Apply pagination and ordering
    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to fetch suppliers:', error);
      throw new Error('Failed to fetch suppliers');
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data || [],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getSupplierStats(): Promise<SupplierStats> {
    const supabase = this.supabaseService.getAdminClient();

    // Get current timestamps
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get total count
    const { count: total } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true });

    // Get today's signups
    const { count: today } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    // Get this week's signups
    const { count: thisWeek } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekStart.toISOString());

    // Get this month's signups
    const { count: thisMonth } = await supabase
      .from('suppliers')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart);

    return {
      total: total || 0,
      today: today || 0,
      thisWeek: thisWeek || 0,
      thisMonth: thisMonth || 0,
    };
  }

  async getCountries(): Promise<string[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('suppliers')
      .select('country')
      .not('country', 'is', null);

    if (!data) return [];

    // Get unique countries
    const countries = [...new Set(data.map(d => d.country).filter(Boolean))];
    return countries.sort();
  }

  async getCategories(): Promise<string[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data } = await supabase
      .from('suppliers')
      .select('category')
      .not('category', 'is', null);

    if (!data) return [];

    // Flatten TEXT[] arrays → unique list
    const all: string[] = [];
    data.forEach(d => {
      if (Array.isArray(d.category)) {
        d.category.forEach((c: string) => { if (c) all.push(c); });
      } else if (d.category) {
        all.push(d.category);
      }
    });
    return [...new Set(all)].sort();
  }

  // ───── New Methods ─────

  async getSupplierDetail(id: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Get related counts in parallel
    const [products, orders, pis, inquiries, accounts, teamMembers] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('supplier_id', id),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('supplier_id', id),
      supabase.from('proforma_invoices').select('*', { count: 'exact', head: true }).eq('supplier_id', id),
      supabase.from('buyer_inquiries').select('*', { count: 'exact', head: true }).eq('supplier_id', id),
      supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('supplier_id', id),
      supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('supplier_id', id),
    ]);

    return {
      ...supplier,
      counts: {
        products: products.count || 0,
        orders: orders.count || 0,
        proformaInvoices: pis.count || 0,
        inquiries: inquiries.count || 0,
        accounts: accounts.count || 0,
        teamMembers: teamMembers.count || 0,
      },
    };
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    const supabase = this.supabaseService.getAdminClient();

    // Check existence
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }

    // Build update object (camelCase → snake_case)
    const updateData: Record<string, any> = {};
    if (dto.companyName !== undefined) updateData.company_name = dto.companyName;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.categories !== undefined) updateData.category = dto.categories;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.yearEstablished !== undefined) updateData.year_established = dto.yearEstablished;
    if (dto.employees !== undefined) updateData.employees = dto.employees;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update supplier:', error);
      throw new Error('Failed to update supplier');
    }

    return data;
  }

  async toggleSupplierStatus(id: string, isActive: boolean) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to toggle supplier status:', error);
      throw new Error('Failed to toggle supplier status');
    }

    return data;
  }

  async deleteSupplier(id: string) {
    const supabase = this.supabaseService.getAdminClient();

    const { data: existing } = await supabase
      .from('suppliers')
      .select('id, company_name')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Supplier not found');
    }

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error('Failed to delete supplier:', error);
      throw new Error('Failed to delete supplier');
    }

    return { message: `Supplier "${existing.company_name}" deleted successfully` };
  }

  async getPlatformStats() {
    const supabase = this.supabaseService.getAdminClient();

    const [suppliers, products, orders, pis, inquiries, credits] = await Promise.all([
      supabase.from('suppliers').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('proforma_invoices').select('*', { count: 'exact', head: true }),
      supabase.from('buyer_inquiries').select('*', { count: 'exact', head: true }),
      supabase.from('credits').select('*', { count: 'exact', head: true }),
    ]);

    return {
      suppliers: suppliers.count || 0,
      products: products.count || 0,
      orders: orders.count || 0,
      proformaInvoices: pis.count || 0,
      inquiries: inquiries.count || 0,
      credits: credits.count || 0,
    };
  }

  async getSignupTrends(period: string = 'daily', days: number = 30) {
    const supabase = this.supabaseService.getAdminClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('suppliers')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    // Group by period
    const groups: Record<string, number> = {};

    data.forEach(row => {
      const date = new Date(row.created_at);
      let key: string;

      if (period === 'weekly') {
        // ISO week start (Monday)
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(date);
        weekStart.setDate(diff);
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // daily
        key = date.toISOString().split('T')[0];
      }

      groups[key] = (groups[key] || 0) + 1;
    });

    // Fill missing dates for daily
    if (period === 'daily') {
      const result: { date: string; count: number }[] = [];
      const current = new Date(startDate);
      const today = new Date();

      while (current <= today) {
        const key = current.toISOString().split('T')[0];
        result.push({ date: key, count: groups[key] || 0 });
        current.setDate(current.getDate() + 1);
      }
      return result;
    }

    return Object.entries(groups).map(([date, count]) => ({ date, count }));
  }

  async getDistributions() {
    const supabase = this.supabaseService.getAdminClient();

    const [categoryData, countryData] = await Promise.all([
      supabase.from('suppliers').select('category').not('category', 'is', null),
      supabase.from('suppliers').select('country').not('country', 'is', null),
    ]);

    // Category distribution (TEXT[] column)
    const categoryGroups: Record<string, number> = {};
    (categoryData.data || []).forEach(row => {
      if (Array.isArray(row.category)) {
        row.category.forEach((c: string) => {
          if (c) categoryGroups[c] = (categoryGroups[c] || 0) + 1;
        });
      } else if (row.category) {
        categoryGroups[row.category] = (categoryGroups[row.category] || 0) + 1;
      }
    });

    // Country distribution
    const countryGroups: Record<string, number> = {};
    (countryData.data || []).forEach(row => {
      if (row.country) {
        countryGroups[row.country] = (countryGroups[row.country] || 0) + 1;
      }
    });

    return {
      categories: Object.entries(categoryGroups)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      countries: Object.entries(countryGroups)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async getRecentActivity(limit: number = 20) {
    const supabase = this.supabaseService.getAdminClient();

    // Fetch recent items from multiple tables in parallel
    const [suppliers, products, orders, pis] = await Promise.all([
      supabase
        .from('suppliers')
        .select('id, company_name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('products')
        .select('id, name, supplier_id, created_at, suppliers!inner(company_name)')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('orders')
        .select('id, po_number, supplier_id, buyer_name, created_at, suppliers!inner(company_name)')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('proforma_invoices')
        .select('id, pi_number, supplier_id, buyer_name, created_at, suppliers!inner(company_name)')
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    // Merge and sort
    const activities: any[] = [];

    (suppliers.data || []).forEach(s => {
      activities.push({
        type: 'supplier_signup',
        message: `New supplier "${s.company_name}" registered`,
        email: s.email,
        timestamp: s.created_at,
      });
    });

    (products.data || []).forEach(p => {
      activities.push({
        type: 'product_added',
        message: `Product "${p.name}" added by ${(p as any).suppliers?.company_name || 'Unknown'}`,
        timestamp: p.created_at,
      });
    });

    (orders.data || []).forEach(o => {
      activities.push({
        type: 'order_created',
        message: `Order ${o.po_number} created for ${o.buyer_name}`,
        supplier: (o as any).suppliers?.company_name,
        timestamp: o.created_at,
      });
    });

    (pis.data || []).forEach(pi => {
      activities.push({
        type: 'pi_created',
        message: `PI ${pi.pi_number} created for ${pi.buyer_name}`,
        supplier: (pi as any).suppliers?.company_name,
        timestamp: pi.created_at,
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  }

  async exportSuppliers(filters: SupplierListQuery) {
    const supabase = this.supabaseService.getAdminClient();

    let queryBuilder = supabase
      .from('suppliers')
      .select('id, email, company_name, country, category, phone, website, employees, email_verified, is_active, created_at');

    if (filters.search) {
      queryBuilder = queryBuilder.or(`company_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters.country) {
      queryBuilder = queryBuilder.eq('country', filters.country);
    }
    if (filters.category) {
      queryBuilder = queryBuilder.contains('category', [filters.category]);
    }
    if (filters.startDate) {
      queryBuilder = queryBuilder.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      queryBuilder = queryBuilder.lte('created_at', filters.endDate);
    }

    const { data, error } = await queryBuilder.order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to export suppliers:', error);
      throw new Error('Failed to export suppliers');
    }

    // Build CSV
    const headers = ['ID', 'Email', 'Company Name', 'Country', 'Category', 'Phone', 'Website', 'Employees', 'Email Verified', 'Active', 'Registered'];
    const rows = (data || []).map(s => [
      s.id,
      s.email,
      `"${(s.company_name || '').replace(/"/g, '""')}"`,
      s.country || '',
      Array.isArray(s.category) ? s.category.join('; ') : (s.category || ''),
      s.phone || '',
      s.website || '',
      s.employees || '',
      s.email_verified ? 'Yes' : 'No',
      s.is_active !== false ? 'Yes' : 'No',
      s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '',
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }
}
