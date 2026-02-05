import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../config/supabase.service';
import { EmailService } from './email.service';
import { RegisterDto, SendVerificationDto, VerifyEmailDto } from './dto/register.dto';
import { LoginDto, GoogleAuthDto, ForgotPasswordDto, ResetPasswordDto } from './dto/login.dto';
import { InviteTeamMemberDto, UpdateTeamMemberDto } from './dto/invite.dto';

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
        throw new UnauthorizedException('No account found for this email. Please register first.');
      }

      if (!supplier.google_id) {
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

  // Reset password with token
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, password } = dto;

    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const supabase = this.supabaseService.getAdminClient();
      const hashedPassword = await bcrypt.hash(password, 10);

      const { error } = await supabase
        .from('suppliers')
        .update({ password: hashedPassword })
        .eq('id', payload.sub);

      if (error) {
        throw new BadRequestException('Failed to reset password');
      }

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired reset token');
    }
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

  // ==================== Team Member Management ====================

  // Invite team member
  async inviteTeamMember(supplierId: string, dto: InviteTeamMemberDto): Promise<{ message: string; member: any }> {
    const supabase = this.supabaseService.getAdminClient();

    // Get inviter info
    const { data: inviter } = await supabase
      .from('suppliers')
      .select('id, email, company_name')
      .eq('id', supplierId)
      .single();

    if (!inviter) {
      throw new BadRequestException('Supplier not found');
    }

    // Check if already a team member
    const { data: existing } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('supplier_id', supplierId)
      .eq('email', dto.email)
      .single();

    if (existing) {
      if (existing.status === 'active') {
        throw new BadRequestException('This user is already a team member');
      }
      if (existing.status === 'pending') {
        throw new BadRequestException('An invitation has already been sent to this email');
      }
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString('hex');

    // Save to database
    const { data: member, error } = await supabase
      .from('team_members')
      .insert({
        supplier_id: supplierId,
        email: dto.email,
        role: dto.role,
        status: 'pending',
        invite_token: inviteToken,
        invited_by: supplierId,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create team member invite:', error);
      throw new BadRequestException('Failed to send invitation');
    }

    // Send invite email
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const inviteLink = `${frontendUrl}/accept-invite?token=${inviteToken}`;

    await this.emailService.sendTeamInviteEmail(
      dto.email,
      inviter.company_name,
      inviter.company_name,
      dto.role,
      dto.message,
      inviteLink,
    );

    return { message: 'Invitation sent successfully', member };
  }

  // Accept team invite
  async acceptInvite(token: string): Promise<{ message: string; supplier_id: string }> {
    const supabase = this.supabaseService.getAdminClient();

    // Find invite by token
    const { data: member, error: fetchError } = await supabase
      .from('team_members')
      .select('*, suppliers!team_members_supplier_id_fkey(company_name)')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !member) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    // Check if invite is expired (7 days)
    const invitedAt = new Date(member.invited_at);
    const now = new Date();
    const diffDays = (now.getTime() - invitedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
      throw new BadRequestException('This invitation has expired');
    }

    // Update team member status
    const { error: updateError } = await supabase
      .from('team_members')
      .update({
        status: 'active',
        joined_at: new Date().toISOString(),
        invite_token: null,
      })
      .eq('id', member.id);

    if (updateError) {
      this.logger.error('Failed to accept invite:', updateError);
      throw new BadRequestException('Failed to accept invitation');
    }

    return {
      message: 'Invitation accepted successfully',
      supplier_id: member.supplier_id,
    };
  }

  // Get team members
  async getTeamMembers(supplierId: string): Promise<any[]> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error('Failed to fetch team members:', error);
      throw new BadRequestException('Failed to fetch team members');
    }

    return members || [];
  }

  // Update team member role
  async updateTeamMember(supplierId: string, memberId: string, dto: UpdateTeamMemberDto): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    // Verify member belongs to this supplier
    const { data: member } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('id', memberId)
      .eq('supplier_id', supplierId)
      .single();

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const { error } = await supabase
      .from('team_members')
      .update({ role: dto.role })
      .eq('id', memberId);

    if (error) {
      this.logger.error('Failed to update team member:', error);
      throw new BadRequestException('Failed to update team member');
    }

    return { message: 'Team member updated successfully' };
  }

  // Remove team member
  async removeTeamMember(supplierId: string, memberId: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    // Verify member belongs to this supplier
    const { data: member } = await supabase
      .from('team_members')
      .select('id')
      .eq('id', memberId)
      .eq('supplier_id', supplierId)
      .single();

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      this.logger.error('Failed to remove team member:', error);
      throw new BadRequestException('Failed to remove team member');
    }

    return { message: 'Team member removed successfully' };
  }

  // Resend team invite
  async resendInvite(supplierId: string, memberId: string): Promise<{ message: string }> {
    const supabase = this.supabaseService.getAdminClient();

    // Get member and verify ownership
    const { data: member } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .eq('supplier_id', supplierId)
      .eq('status', 'pending')
      .single();

    if (!member) {
      throw new NotFoundException('Pending invitation not found');
    }

    // Get inviter info
    const { data: inviter } = await supabase
      .from('suppliers')
      .select('id, company_name')
      .eq('id', supplierId)
      .single();

    if (!inviter) {
      throw new BadRequestException('Supplier not found');
    }

    // Generate new token
    const newToken = randomBytes(32).toString('hex');

    const { error } = await supabase
      .from('team_members')
      .update({
        invite_token: newToken,
        invited_at: new Date().toISOString(),
      })
      .eq('id', memberId);

    if (error) {
      this.logger.error('Failed to resend invite:', error);
      throw new BadRequestException('Failed to resend invitation');
    }

    // Send email
    const frontendUrl = this.configService.get<string>('frontendUrl');
    const inviteLink = `${frontendUrl}/accept-invite?token=${newToken}`;

    await this.emailService.sendTeamInviteEmail(
      member.email,
      inviter.company_name,
      inviter.company_name,
      member.role,
      undefined,
      inviteLink,
    );

    return { message: 'Invitation resent successfully' };
  }
}
