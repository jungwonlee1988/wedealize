import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postmark from 'postmark';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: postmark.ServerClient;
  private fromEmail: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    const apiToken = this.configService.get<string>('postmark.apiToken');
    this.fromEmail = this.configService.get<string>('email.from') || 'cs@wedealize.com';
    this.frontendUrl = this.configService.get<string>('frontendUrl') || 'https://supplier.wedealize.com';

    if (apiToken) {
      this.client = new postmark.ServerClient(apiToken);
    }
  }

  private getEmailWrapper(content: string): string {
    const logoUrl = `${this.frontendUrl}/logo.png`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f0f4f8; }
          .email-wrapper { background-color: #f0f4f8; padding: 40px 20px; }
          .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); }
          .email-header { background: linear-gradient(135deg, #0F4C81 0%, #1A6BB5 100%); padding: 32px 40px; text-align: center; }
          .email-header img { height: 36px; }
          .email-header-text { color: rgba(255, 255, 255, 0.9); font-size: 13px; margin-top: 8px; letter-spacing: 0.5px; }
          .email-divider { height: 4px; background: linear-gradient(90deg, #FF6B35, #FF8C5A, #FFB088); }
          .email-body { padding: 40px; }
          .email-title { font-size: 24px; font-weight: 700; color: #0D1B2A; margin: 0 0 8px; }
          .email-subtitle { font-size: 15px; color: #64748b; margin: 0 0 24px; line-height: 1.5; }
          .email-text { font-size: 15px; color: #475569; line-height: 1.7; margin: 0 0 16px; }
          .email-btn { display: inline-block; background: linear-gradient(135deg, #0F4C81 0%, #1A6BB5 100%); color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; }
          .email-btn-accent { background: linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%); }
          .email-code-box { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px dashed #cbd5e1; border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0; }
          .email-code-icon { margin-bottom: 8px; }
          .email-code { font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #0F4C81; font-family: 'Courier New', monospace; }
          .email-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 12px; }
          .email-security { background: #fef9ee; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0; }
          .email-security-title { font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 4px; }
          .email-security-text { font-size: 13px; color: #a16207; margin: 0; line-height: 1.5; }
          .email-invite-box { background: #f0f7ff; border-radius: 12px; padding: 20px 24px; margin: 20px 0; border: 1px solid #dbeafe; }
          .email-invite-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px; font-weight: 600; }
          .email-invite-value { font-size: 15px; color: #0D1B2A; margin: 0; font-weight: 500; }
          .email-message-box { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin: 16px 0; border-left: 3px solid #0F4C81; font-style: italic; color: #475569; font-size: 14px; line-height: 1.6; }
          .email-footer { background: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
          .email-footer-tagline { font-size: 14px; font-weight: 600; color: #0F4C81; margin: 0 0 8px; }
          .email-footer-text { font-size: 12px; color: #94a3b8; margin: 4px 0; line-height: 1.5; }
          .email-footer-link { color: #0F4C81; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-container">
            <div class="email-header">
              <img src="${logoUrl}" alt="WeDealize" style="height: 36px; filter: brightness(0) invert(1);">
              <div class="email-header-text">Supplier Portal</div>
            </div>
            <div class="email-divider"></div>
            <div class="email-body">
              ${content}
            </div>
            <div class="email-footer">
              <p class="email-footer-tagline">Your Gateway to the Korean F&B Market</p>
              <p class="email-footer-text">Need help? Contact us at <a href="mailto:cs@wedealize.com" class="email-footer-link">cs@wedealize.com</a></p>
              <p class="email-footer-text">&copy; ${new Date().getFullYear()} WeDealize. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendVerificationEmail(email: string, code: string, companyName: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`Postmark not configured, verification code for ${email}: ${code}`);
      return false;
    }

    const content = `
      <h1 class="email-title">Verify Your Email</h1>
      <p class="email-subtitle">Welcome to WeDealize, <strong>${companyName}</strong>!</p>
      <p class="email-text">Thank you for registering. Please use the verification code below to complete your registration:</p>
      <div class="email-code-box">
        <div class="email-code-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0F4C81" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div class="email-code">${code}</div>
        <div class="email-badge">Expires in 10 minutes</div>
      </div>
      <div class="email-security">
        <p class="email-security-title">Didn't request this?</p>
        <p class="email-security-text">If you didn't create a WeDealize account, you can safely ignore this email. Someone may have entered your email by mistake.</p>
      </div>
    `;

    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: email,
        Subject: 'Verify your WeDealize account',
        HtmlBody: this.getEmailWrapper(content),
        TextBody: `Hello ${companyName},\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nWeDealize Team`,
        MessageStream: 'outbound',
      });

      this.logger.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`Postmark not configured, reset link for ${email}: ${resetLink}`);
      return false;
    }

    const content = `
      <h1 class="email-title">Reset Your Password</h1>
      <p class="email-subtitle">We received a request to reset your password.</p>
      <p class="email-text">Click the button below to set a new password. This link will expire in 24 hours.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" class="email-btn">
          Reset Password
        </a>
      </p>
      <p class="email-text" style="text-align: center; font-size: 13px; color: #94a3b8;">
        Or copy this link: <a href="${resetLink}" style="color: #0F4C81; word-break: break-all;">${resetLink}</a>
      </p>
      <div class="email-security">
        <p class="email-security-title">Didn't request this?</p>
        <p class="email-security-text">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `;

    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: email,
        Subject: 'Reset your WeDealize password',
        HtmlBody: this.getEmailWrapper(content),
        TextBody: `You requested to reset your password.\n\nClick here to reset: ${resetLink}\n\nThis link will expire in 24 hours.\n\nWeDealize Team`,
        MessageStream: 'outbound',
      });

      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      return false;
    }
  }

  async sendTeamInviteEmail(
    email: string,
    inviterName: string,
    companyName: string,
    role: string,
    personalMessage: string | undefined,
    inviteLink: string,
  ): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`Postmark not configured, invite link for ${email}: ${inviteLink}`);
      return false;
    }

    const roleDescriptions: Record<string, string> = {
      admin: 'Full access to manage products, orders, team members, and settings',
      member: 'Can manage products and view orders',
      viewer: 'View-only access to the dashboard and reports',
    };

    const roleDescription = roleDescriptions[role] || roleDescriptions.member;

    const messageSection = personalMessage
      ? `<div class="email-message-box">"${personalMessage}"<br><strong style="font-style: normal;">— ${inviterName}</strong></div>`
      : '';

    const content = `
      <h1 class="email-title">You're Invited!</h1>
      <p class="email-subtitle"><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on WeDealize.</p>
      <div class="email-invite-box">
        <div style="display: flex; gap: 32px;">
          <div style="flex: 1;">
            <p class="email-invite-label">Company</p>
            <p class="email-invite-value">${companyName}</p>
          </div>
          <div style="flex: 1;">
            <p class="email-invite-label">Your Role</p>
            <p class="email-invite-value" style="text-transform: capitalize;">${role}</p>
          </div>
        </div>
        <p style="font-size: 13px; color: #64748b; margin: 12px 0 0;">${roleDescription}</p>
      </div>
      ${messageSection}
      <p style="text-align: center; margin: 32px 0;">
        <a href="${inviteLink}" class="email-btn email-btn-accent">
          Accept Invitation
        </a>
      </p>
      <p class="email-text" style="text-align: center; font-size: 13px; color: #94a3b8;">
        This invitation will expire in 7 days.
      </p>
      <div class="email-security">
        <p class="email-security-title">Don't recognize this?</p>
        <p class="email-security-text">If you don't know ${inviterName} or ${companyName}, you can safely ignore this email.</p>
      </div>
    `;

    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: email,
        Subject: `${inviterName} invited you to join ${companyName} on WeDealize`,
        HtmlBody: this.getEmailWrapper(content),
        TextBody: `${inviterName} has invited you to join ${companyName} on WeDealize as a ${role}.\n\n${personalMessage ? `Message: "${personalMessage}"\n\n` : ''}Accept the invitation: ${inviteLink}\n\nThis invitation will expire in 7 days.\n\nWeDealize Team`,
        MessageStream: 'outbound',
      });

      this.logger.log(`Team invite email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send team invite email to ${email}:`, error);
      return false;
    }
  }
}
