import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from '../config/supabase.service';
import { EmailService } from './email.service';
import { RegisterDto, SendVerificationDto, VerifyEmailDto } from './dto/register.dto';
import { LoginDto, GoogleAuthDto, ForgotPasswordDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  // Generate 6-digit verification code
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code
  async sendVerificationCode(dto: SendVerificationDto): Promise<{ message: string }> {
    const { email, companyName } = dto;

    const supabase = this.supabaseService.getAdminClient();

    // Check if email already registered
    const { data: existingUser } = await supabase
      .from('suppliers')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Generate verification code
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing verification codes for this email
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email);

    // Store verification code in database
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code,
        company_name: companyName,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      this.logger.error('Failed to store verification code:', insertError);
      throw new BadRequestException('Failed to send verification code');
    }

    // Send email
    const sent = await this.emailService.sendVerificationEmail(email, code, companyName);

    if (!sent) {
      this.logger.warn(`Email service unavailable, verification code for ${email}: ${code}`);
    }

    return { message: 'Verification code sent' };
  }

  // Verify email and complete registration
  async verifyEmailAndRegister(dto: VerifyEmailDto): Promise<{ access_token: string; supplier_id: string; email: string; company_name: string }> {
    const { email, code, companyName, password, country, category } = dto;

    const supabase = this.supabaseService.getAdminClient();

    // Get verification code from database
    const { data: stored, error: fetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !stored) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (new Date() > new Date(stored.expires_at)) {
      // Delete expired code
      await supabase.from('verification_codes').delete().eq('email', email);
      throw new BadRequestException('Verification code expired. Please request a new one.');
    }

    if (stored.code !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    // Code verified, create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        email,
        password: hashedPassword,
        company_name: companyName,
        country,
        category,
        email_verified: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create supplier:', error);
      throw new BadRequestException('Failed to create account');
    }

    // Clean up verification code
    await supabase.from('verification_codes').delete().eq('email', email);

    // Generate JWT
    const token = this.generateToken(supplier);

    return {
      access_token: token,
      supplier_id: supplier.id,
      email: supplier.email,
      company_name: supplier.company_name,
    };
  }

  // Login
  async login(dto: LoginDto): Promise<{ access_token: string; supplier_id: string; email: string; company_name: string }> {
    const { email, password } = dto;

    const supabase = this.supabaseService.getAdminClient();
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !supplier) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, supplier.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(supplier);

    return {
      access_token: token,
      supplier_id: supplier.id,
      email: supplier.email,
      company_name: supplier.company_name,
    };
  }

  // Google OAuth
  async googleAuth(dto: GoogleAuthDto): Promise<{ access_token: string; supplier_id: string; email: string; company_name: string }> {
    const { credential } = dto;

    try {
      // Decode JWT token (in production, verify with Google's public keys)
      const decoded = this.jwtService.decode(credential) as any;

      if (!decoded || !decoded.email) {
        throw new UnauthorizedException('Invalid Google credential');
      }

      const { email, name, picture, sub: googleId } = decoded;

      const supabase = this.supabaseService.getAdminClient();

      // Check if user exists
      let { data: supplier } = await supabase
        .from('suppliers')
        .select('*')
        .eq('email', email)
        .single();

      if (!supplier) {
        // Create new user
        const { data: newSupplier, error } = await supabase
          .from('suppliers')
          .insert({
            email,
            company_name: name,
            google_id: googleId,
            profile_image: picture,
            email_verified: true,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw new BadRequestException('Failed to create account');
        }

        supplier = newSupplier;
      } else if (!supplier.google_id) {
        // Link Google account
        await supabase
          .from('suppliers')
          .update({ google_id: googleId, profile_image: picture })
          .eq('id', supplier.id);
      }

      const token = this.generateToken(supplier);

      return {
        access_token: token,
        supplier_id: supplier.id,
        email: supplier.email,
        company_name: supplier.company_name,
      };
    } catch (error) {
      this.logger.error('Google auth error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  // Forgot password
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = dto;

    const supabase = this.supabaseService.getAdminClient();
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, company_name')
      .eq('email', email)
      .single();

    if (!supplier) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link will be sent' };
    }

    // Generate reset token
    const resetToken = this.jwtService.sign(
      { sub: supplier.id, email, type: 'password_reset' },
      { expiresIn: '24h' },
    );

    const frontendUrl = this.configService.get<string>('frontendUrl');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    await this.emailService.sendPasswordResetEmail(email, resetLink);

    return { message: 'If the email exists, a reset link will be sent' };
  }

  // Validate user from JWT
  async validateUser(payload: any): Promise<any> {
    const supabase = this.supabaseService.getAdminClient();
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, email, company_name')
      .eq('id', payload.sub)
      .single();

    return supplier;
  }

  // Generate JWT token
  private generateToken(supplier: any): string {
    const payload = {
      sub: supplier.id,
      email: supplier.email,
      company_name: supplier.company_name,
    };

    return this.jwtService.sign(payload);
  }
}
