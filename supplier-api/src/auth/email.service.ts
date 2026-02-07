import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postmark from 'postmark';
import { EMAIL_LOGO_BASE64 } from './email-logo';

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

  // ==================== Shared Template Helpers ====================

  private getSharedCss(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background: #f0ece6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
      .email-wrapper { max-width: 620px; width: 100%; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02), 0 12px 28px rgba(0,0,0,0.06), 0 40px 80px rgba(0,0,0,0.04); }
      .hero { position: relative; background: #000000; padding: 56px 48px 52px; text-align: center; overflow: hidden; }
      .hero::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #eab308, #facc15, #fde047, #facc15, #eab308); }
      .logo-badge { display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; position: relative; }
      .logo-badge img { height: 48px; width: auto; }
      .hero-subtitle { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.5); letter-spacing: 3px; text-transform: uppercase; margin-top: 6px; position: relative; }
      .body-content { padding: 48px; }
      .greeting-badge { display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #fefce8, #fef9c3); border: 1px solid #fde047; border-radius: 100px; padding: 8px 18px; font-size: 13px; font-weight: 600; color: #a16207; margin-bottom: 24px; }
      .greeting-badge .dot { width: 8px; height: 8px; background: #eab308; border-radius: 50%; }
      @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }
      .heading { font-family: 'DM Serif Display', serif; font-size: 34px; color: #0f172a; line-height: 1.2; margin-bottom: 14px; letter-spacing: -0.5px; }
      .description { font-size: 15px; color: #64748b; line-height: 1.7; margin-bottom: 36px; }
      .description strong { color: #0f172a; font-weight: 600; }
      .cta-wrapper { text-align: center; margin-bottom: 28px; }
      .cta-button { display: inline-block; background: linear-gradient(135deg, #facc15 0%, #eab308 100%); color: #0a0a0a; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 18px 56px; border-radius: 14px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(234, 179, 8, 0.35), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.3); }
      .security-notice { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fde68a; border-radius: 12px; padding: 20px 24px; display: flex; gap: 14px; align-items: flex-start; }
      .security-icon { width: 36px; height: 36px; background: #eab308; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(234, 179, 8, 0.3); }
      .security-title { font-size: 14px; font-weight: 700; color: #92400e; margin-bottom: 4px; }
      .security-text { font-size: 13px; color: #a16207; line-height: 1.6; }
      .footer { background: #fafaf9; border-top: 1px solid #f0ece6; padding: 36px 48px; text-align: center; }
      .footer-tagline { font-family: 'DM Serif Display', serif; font-size: 18px; color: #0f172a; margin-bottom: 20px; letter-spacing: -0.3px; }
      .footer-tagline span { background: linear-gradient(135deg, #eab308, #ca8a04); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
      .footer-divider { width: 40px; height: 2px; background: linear-gradient(90deg, #e2e8f0, #cbd5e1); margin: 0 auto 20px; }
      .footer-links { display: flex; justify-content: center; gap: 8px; margin-bottom: 20px; align-items: center; }
      .footer-link { font-size: 12px; color: #64748b; text-decoration: none; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; }
      .footer-link:hover { color: #eab308; }
      .footer-sep { color: #d1d5db; font-size: 10px; margin: 0 8px; }
      .footer-contact { font-size: 13px; color: #94a3b8; margin-bottom: 12px; font-weight: 400; letter-spacing: 0.2px; }
      .footer-contact a { color: #ca8a04; text-decoration: none; font-weight: 600; }
      .footer-copyright { font-size: 11px; color: #c2c8d1; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 500; }
      @media (max-width: 480px) {
        .body-content { padding: 32px 24px; }
        .footer { padding: 28px 24px; }
        .hero { padding: 40px 32px 36px; }
        .heading { font-size: 28px; }
        .cta-button { padding: 16px 40px; font-size: 15px; }
      }
    `;
  }

  private getFooterHtml(): string {
    return `
    <div class="footer">
      <div class="footer-tagline">Your Gateway to the <span>Korean F&amp;B Market</span></div>
      <div class="footer-divider"></div>
      <div class="footer-links">
        <a href="mailto:cs@wedealize.com" class="footer-link">Help Center</a>
        <span class="footer-sep">&middot;</span>
        <a href="${this.frontendUrl}/privacy" class="footer-link">Privacy Policy</a>
        <span class="footer-sep">&middot;</span>
        <a href="${this.frontendUrl}/terms" class="footer-link">Terms of Service</a>
      </div>
      <div class="footer-contact">
        Need help? Contact us at <a href="mailto:cs@wedealize.com">cs@wedealize.com</a>
      </div>
      <div class="footer-copyright">&copy; ${new Date().getFullYear()} WeDealize. All rights reserved.</div>
    </div>`;
  }

  private buildDesignEmail(extraCss: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
${this.getSharedCss()}
${extraCss}
</style>
</head>
<body>
<div class="email-wrapper">
  <div class="hero">
    <div class="logo-badge">
      <img src="${EMAIL_LOGO_BASE64}" alt="WeDealize" />
    </div>
    <div class="hero-subtitle">Supplier Portal</div>
  </div>
  <div class="body-content">
    ${bodyContent}
  </div>
  ${this.getFooterHtml()}
</div>
</body>
</html>`;
  }

  // ==================== Old Wrapper (for password reset) ====================

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
          .email-security { background: #fef9ee; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0; }
          .email-security-title { font-size: 13px; font-weight: 600; color: #92400e; margin: 0 0 4px; }
          .email-security-text { font-size: 13px; color: #a16207; margin: 0; line-height: 1.5; }
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

  // ==================== Email Senders ====================

  async sendVerificationEmail(email: string, code: string, companyName: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`Postmark not configured, verification code for ${email}: ${code}`);
      return false;
    }

    const digits = code.split('').map(d => `<div class="code-digit">${d}</div>`).join('\n          ');

    const extraCss = `
      .code-card { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; margin-bottom: 36px; }
      .code-card-header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 16px 24px; display: flex; align-items: center; gap: 10px; }
      .code-card-header-icon { width: 32px; height: 32px; background: rgba(250, 204, 21, 0.15); border: 1px solid rgba(250, 204, 21, 0.25); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
      .code-card-header-text { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); letter-spacing: 0.5px; }
      .code-card-body { padding: 40px 24px; text-align: center; }
      .verification-code { display: inline-flex; gap: 12px; margin-bottom: 24px; }
      .code-digit { width: 56px; height: 68px; background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #0f172a; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
      .expire-badge { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #fefce8, #fef9c3); border: 1px solid #fde047; border-radius: 100px; padding: 8px 18px; font-size: 13px; font-weight: 600; color: #a16207; }
      .expire-badge .clock { font-size: 14px; }
    `;

    const bodyContent = `
    <div class="greeting-badge">
      <span class="dot"></span>
      Email Verification
    </div>
    <h1 class="heading">Verify Your Email</h1>
    <p class="description">
      Welcome to WeDealize, <strong>${companyName}</strong>!<br><br>
      Thank you for registering. Please use the verification code below to complete your registration:
    </p>
    <div class="code-card">
      <div class="code-card-header">
        <div class="code-card-header-icon">&#128273;</div>
        <span class="code-card-header-text">Verification Code</span>
      </div>
      <div class="code-card-body">
        <div class="verification-code">
          ${digits}
        </div>
        <div>
          <span class="expire-badge">
            <span class="clock">&#9201;</span>
            Expires in 10 minutes
          </span>
        </div>
      </div>
    </div>
    <div class="security-notice">
      <div class="security-icon">&#128274;</div>
      <div>
        <div class="security-title">Didn't request this?</div>
        <div class="security-text">
          If you didn't create a WeDealize account, you can safely ignore this email. Someone may have entered your email by mistake.
        </div>
      </div>
    </div>`;

    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: email,
        Subject: 'Verify your WeDealize account',
        HtmlBody: this.buildDesignEmail(extraCss, bodyContent),
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

    const rolePermissions: Record<string, string[]> = {
      admin: ['Full Access', 'Manage Team', 'Manage Products', 'View Reports'],
      member: ['Manage Products', 'View Orders'],
      viewer: ['View Dashboard', 'View Reports'],
    };

    const permissions = rolePermissions[role] || rolePermissions.member;
    const permissionTags = permissions.map(p =>
      `<span class="permission-tag"><span class="check">&#10003;</span> ${p}</span>`
    ).join('\n          ');

    const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);

    const extraCss = `
      .invitation-card { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; margin-bottom: 36px; }
      .card-header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 16px 24px; display: flex; align-items: center; gap: 10px; }
      .card-header-icon { width: 32px; height: 32px; background: rgba(250, 204, 21, 0.15); border: 1px solid rgba(250, 204, 21, 0.25); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
      .card-header-text { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); letter-spacing: 0.5px; }
      .card-body { padding: 28px 24px; }
      .info-row { display: flex; gap: 32px; margin-bottom: 20px; }
      .info-item { flex: 1; }
      .info-label { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; }
      .info-value { font-size: 16px; font-weight: 600; color: #0f172a; }
      .divider { height: 1px; background: linear-gradient(90deg, transparent, #d6d3d1, transparent); margin-bottom: 20px; }
      .permissions { display: flex; flex-wrap: wrap; gap: 8px; }
      .permission-tag { display: inline-flex; align-items: center; gap: 6px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 500; color: #475569; }
      .permission-tag .check { color: #eab308; font-size: 14px; font-weight: 700; }
      .expire-notice { text-align: center; font-size: 13px; color: #94a3b8; margin-bottom: 36px; display: flex; align-items: center; justify-content: center; gap: 6px; }
      .expire-notice .clock { font-size: 14px; }
      @media (max-width: 480px) { .info-row { flex-direction: column; gap: 16px; } }
    `;

    const bodyContent = `
    <div class="greeting-badge">
      <span class="dot"></span>
      New Invitation
    </div>
    <h1 class="heading">You're Invited!</h1>
    <p class="description">
      <strong>${companyName}</strong> has invited you to join <strong>${companyName}</strong> on WeDealize.<br>
      Accept the invitation below to get started.
    </p>
    <div class="invitation-card">
      <div class="card-header">
        <div class="card-header-icon">&#127970;</div>
        <span class="card-header-text">Invitation Details</span>
      </div>
      <div class="card-body">
        <div class="info-row">
          <div class="info-item">
            <div class="info-label">Company</div>
            <div class="info-value">${companyName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Your Role</div>
            <div class="info-value">${capitalizedRole}</div>
          </div>
        </div>
        <div class="divider"></div>
        <div class="info-label" style="margin-bottom: 10px;">Permissions</div>
        <div class="permissions">
          ${permissionTags}
        </div>
      </div>
    </div>
    <div class="cta-wrapper">
      <a href="${inviteLink}" class="cta-button">Accept Invitation</a>
    </div>
    <div class="expire-notice">
      <span class="clock">&#9201;</span>
      This invitation will expire in 7 days.
    </div>
    <div class="security-notice">
      <div class="security-icon">&#128274;</div>
      <div>
        <div class="security-title">Don't recognize this?</div>
        <div class="security-text">
          If you don't know ${companyName} or weren't expecting this invitation, you can safely ignore this email.
        </div>
      </div>
    </div>`;

    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: email,
        Subject: `${inviterName} invited you to join ${companyName} on WeDealize`,
        HtmlBody: this.buildDesignEmail(extraCss, bodyContent),
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

  async sendWelcomeEmail(email: string, companyName: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`Postmark not configured, welcome email for ${email}`);
      return false;
    }

    const dashboardLink = `${this.frontendUrl}/portal.html`;

    const extraCss = `
      .cta-wrapper { margin-bottom: 36px; }
      .steps-card { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; margin-bottom: 36px; }
      .steps-header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 16px 24px; display: flex; align-items: center; gap: 10px; }
      .steps-header-icon { width: 32px; height: 32px; background: rgba(250, 204, 21, 0.15); border: 1px solid rgba(250, 204, 21, 0.25); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
      .steps-header-text { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.9); letter-spacing: 0.5px; }
      .steps-body { padding: 28px 24px; }
      .step-item { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; }
      .step-item + .step-item { border-top: 1px solid #f0ece6; }
      .step-number { width: 36px; height: 36px; background: linear-gradient(135deg, #facc15, #eab308); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; color: #0a0a0a; flex-shrink: 0; box-shadow: 0 2px 6px rgba(234, 179, 8, 0.25); }
      .step-content { flex: 1; }
      .step-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
      .step-desc { font-size: 13px; color: #64748b; line-height: 1.6; }
      .help-notice { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fde68a; border-radius: 12px; padding: 20px 24px; display: flex; gap: 14px; align-items: flex-start; }
      .help-icon { width: 36px; height: 36px; background: #eab308; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(234, 179, 8, 0.3); }
      .help-title { font-size: 14px; font-weight: 700; color: #92400e; margin-bottom: 4px; }
      .help-text { font-size: 13px; color: #a16207; line-height: 1.6; }
      .help-text a { color: #92400e; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
    `;

    const bodyContent = `
    <div class="greeting-badge">
      <span class="dot"></span>
      Welcome Aboard
    </div>
    <h1 class="heading">Welcome to WeDealize!</h1>
    <p class="description">
      Hi <strong>${companyName}</strong>,<br><br>
      Your account has been successfully created. You're now part of WeDealize &mdash; your gateway to the Korean F&amp;B market. Here's how to get started:
    </p>
    <div class="steps-card">
      <div class="steps-header">
        <div class="steps-header-icon">&#128640;</div>
        <span class="steps-header-text">Getting Started</span>
      </div>
      <div class="steps-body">
        <div class="step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <div class="step-title">Complete Your Profile</div>
            <div class="step-desc">Add your company info, logo, and business details to build trust with buyers.</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <div class="step-title">Register Your Products</div>
            <div class="step-desc">Just upload your catalog &mdash; our AI will automatically register your products. Once registered, Korean buyers can instantly discover and browse your offerings.</div>
          </div>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <div class="step-title">Start Selling</div>
            <div class="step-desc">Once your products are live, buyers can discover and place orders directly through WeDealize.</div>
          </div>
        </div>
      </div>
    </div>
    <div class="cta-wrapper">
      <a href="${dashboardLink}" class="cta-button">Go to Dashboard</a>
    </div>
    <div class="help-notice">
      <div class="help-icon">&#128172;</div>
      <div>
        <div class="help-title">Need help getting started?</div>
        <div class="help-text">
          Our team is here to help you every step of the way. Feel free to reach out at <a href="mailto:cs@wedealize.com">cs@wedealize.com</a> or visit our Help Center for guides and FAQs.
        </div>
      </div>
    </div>`;

    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: email,
        Subject: `Welcome to WeDealize, ${companyName}!`,
        HtmlBody: this.buildDesignEmail(extraCss, bodyContent),
        TextBody: `Welcome to WeDealize, ${companyName}!\n\nYour account has been successfully created. Here's how to get started:\n\n1. Complete Your Profile\n2. Register Your Products\n3. Start Selling\n\nGo to your dashboard: ${dashboardLink}\n\nNeed help? Contact us at cs@wedealize.com\n\nWeDealize Team`,
        MessageStream: 'outbound',
      });

      this.logger.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      return false;
    }
  }
}
