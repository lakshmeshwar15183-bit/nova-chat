import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Transactional email sender. In development (no SMTP credentials) it logs the
 * message instead of sending, so flows like OTP verification remain testable.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('mail.host');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('mail.port'),
        secure: this.config.get<number>('mail.port') === 465,
        auth: this.config.get<string>('mail.user')
          ? {
              user: this.config.get<string>('mail.user'),
              pass: this.config.get<string>('mail.pass'),
            }
          : undefined,
      });
    }
  }

  private async send(to: string, subject: string, html: string) {
    const from = this.config.get<string>('mail.from');
    if (!this.transporter) {
      this.logger.warn(`[DEV MAIL] to=${to} subject="${subject}"`);
      return;
    }
    try {
      await this.transporter.sendMail({ from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send mail to ${to}: ${(err as Error).message}`);
    }
  }

  async sendOtp(to: string, code: string, purpose: string) {
    const subject =
      purpose === 'PASSWORD_RESET' ? 'Reset your NovaChat password' : 'Verify your NovaChat email';
    await this.send(
      to,
      subject,
      `<div style="font-family:sans-serif">
        <h2>NovaChat</h2>
        <p>Your verification code is:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p>
        <p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>
      </div>`,
    );
  }

  async sendWelcome(to: string, name: string) {
    await this.send(
      to,
      'Welcome to NovaChat',
      `<div style="font-family:sans-serif"><h2>Welcome, ${name}! 👋</h2>
       <p>Your NovaChat account is ready. Start chatting securely now.</p></div>`,
    );
  }
}
