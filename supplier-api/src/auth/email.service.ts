import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as postmark from 'postmark';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: postmark.ServerClient;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiToken = this.configService.get<string>('postmark.apiToken');
    this.fromEmail = this.configService.get<string>('email.from') || 'cs@wedealize.com';

    if (apiToken) {
      this.client = new postmark.ServerClient(apiToken);
    }
  }

  async sendVerificationEmail(email: string, code: string, companyName: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`Postmark not configured, verification code for ${email}: ${code}`);
      return false;
    }

    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: email,
        Subject: 'Verify your WeDealize account',
        HtmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
              .code-box { background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
              .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; }
              .message { color: #64748b; line-height: 1.6; }
              .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">WeDealize</div>
              </div>
              <p class="message">Hello <strong>${companyName}</strong>,</p>
              <p class="message">Thank you for registering with WeDealize. Please use the verification code below to complete your registration:</p>
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              <p class="message">This code will expire in 10 minutes.</p>
              <p class="message">If you didn't request this code, please ignore this email.</p>
              <div class="footer">
                <p>&copy; 2026 WeDealize. All rights reserved.</p>
                <p>Your Gateway to the Korean F&B Market</p>
              </div>
            </div>
          </body>
          </html>
        `,
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

    try {
      await this.client.sendEmail({
        From: this.fromEmail,
        To: email,
        Subject: 'Reset your WeDealize password',
        HtmlBody: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
              .btn { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
              .message { color: #64748b; line-height: 1.6; }
              .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">WeDealize</div>
              </div>
              <p class="message">You requested to reset your password. Click the button below to proceed:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" class="btn">Reset Password</a>
              </p>
              <p class="message">This link will expire in 24 hours.</p>
              <p class="message">If you didn't request this, please ignore this email.</p>
              <div class="footer">
                <p>&copy; 2026 WeDealize. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
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
}
