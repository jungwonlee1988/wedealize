import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';

export interface LogActivityParams {
  supplierId: string;
  actorEmail: string;
  actorName?: string;
  actionType: string;
  category: string;
  description?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(private supabaseService: SupabaseService) {}

  async log(params: LogActivityParams): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    const { error } = await supabase.from('activity_logs').insert({
      supplier_id: params.supplierId,
      actor_email: params.actorEmail,
      actor_name: params.actorName || null,
      action_type: params.actionType,
      category: params.category,
      description: params.description || null,
      target_id: params.targetId || null,
      target_name: params.targetName || null,
      metadata: params.metadata || {},
    });

    if (error) {
      this.logger.warn('Failed to write activity log:', error.message);
    }
  }

  async getActivityLogs(
    supplierId: string,
    filters: { category?: string; page?: number; limit?: number },
  ) {
    const supabase = this.supabaseService.getAdminClient();
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let qb = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.category && filters.category !== 'all') {
      qb = qb.eq('category', filters.category);
    }

    const { data, error, count } = await qb;

    if (error) {
      this.logger.error('Failed to fetch activity logs:', error);
      return { logs: [], total: 0, page, limit };
    }

    return { logs: data || [], total: count || 0, page, limit };
  }

  async getRecentActivity(supplierId: string, limit = 10) {
    const supabase = this.supabaseService.getAdminClient();

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('Failed to fetch recent activity:', error);
      return [];
    }

    return data || [];
  }
}
