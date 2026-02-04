import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';

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
      .select('id, email, company_name, country, category, created_at, email_verified', { count: 'exact' });

    // Apply search filter
    if (search) {
      queryBuilder = queryBuilder.or(`company_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply country filter
    if (country) {
      queryBuilder = queryBuilder.eq('country', country);
    }

    // Apply category filter
    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
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

    // Get unique categories
    const categories = [...new Set(data.map(d => d.category).filter(Boolean))];
    return categories.sort();
  }
}
