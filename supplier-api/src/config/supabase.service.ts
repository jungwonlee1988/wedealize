import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url') || '';
    const supabaseAnonKey = this.configService.get<string>('supabase.anonKey') || '';
    const supabaseServiceKey = this.configService.get<string>('supabase.serviceKey') || '';

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    return this.supabaseAdmin;
  }
}
