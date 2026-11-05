import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface SendResult {
  status: 'sent' | 'failed' | 'not_configured';
  error: string | null;
}

/** Values a WhatsApp template can use: {{name}}, {{ticket_no}}, {{subject}}, {{status}}, {{message}}. */
export interface WhatsAppParams {
  name: string;
  ticket_no: string;
  subject: string;
  status: string;
  message: string;
}

const short = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500);

/**
 * Sends mail (SMTP) and WhatsApp (WATI). Both read their settings from .env;
 * until those are filled in, nothing is sent and the result says not_configured.
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger('Messaging');
  private mailer: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  get mailReady(): boolean {
    return !!(this.config.get('MAIL_HOST') && this.config.get('MAIL_FROM'));
  }

  get whatsappReady(): boolean {
    return !!(this.config.get('WATI_API_URL') && this.config.get('WATI_TOKEN'));
  }

  async sendMail(to: string, subject: string, text: string): Promise<SendResult> {
    if (!this.mailReady) return { status: 'not_configured', error: 'Mail is not set up yet (MAIL_* in backend .env)' };
    try {
      await this.transport().sendMail({ from: this.config.get('MAIL_FROM'), to, subject, text });
      return { status: 'sent', error: null };
    } catch (e) {
      this.logger.warn(`Mail to ${to} failed: ${short(e)}`);
      return { status: 'failed', error: short(e) };
    }
  }

  /**
   * With WATI_TEMPLATE_NAME set, sends that approved template (works any time).
   * Without it, sends a plain session message, which WhatsApp only delivers if the user wrote to you in the last 24 hours.
   */
  async sendWhatsApp(number: string, params: WhatsAppParams): Promise<SendResult> {
    if (!this.whatsappReady) return { status: 'not_configured', error: 'WhatsApp is not set up yet (WATI_* in backend .env)' };
    const base = String(this.config.get('WATI_API_URL')).replace(/\/+$/, '');
    const token = String(this.config.get('WATI_TOKEN')).replace(/^Bearer\s+/i, '');
    const to = number.replace(/[^\d]/g, '');
    const template = this.config.get<string>('WATI_TEMPLATE_NAME');

    const request = template
      ? fetch(`${base}/api/v1/sendTemplateMessage?whatsappNumber=${to}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template_name: template,
            broadcast_name: `ticket_${params.ticket_no}`,
            parameters: Object.entries(params).map(([name, value]) => ({ name, value })),
          }),
        })
      : fetch(`${base}/api/v1/sendSessionMessage/${to}?messageText=${encodeURIComponent(params.message)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

    try {
      const res = await request;
      const body = (await res.json().catch(() => ({}))) as { result?: boolean | string; info?: string; message?: string };
      if (!res.ok || body.result === false || body.result === 'false') {
        const error = body.info || body.message || `WATI answered ${res.status}`;
        this.logger.warn(`WhatsApp to ${to} failed: ${error}`);
        return { status: 'failed', error: short(error) };
      }
      return { status: 'sent', error: null };
    } catch (e) {
      this.logger.warn(`WhatsApp to ${to} failed: ${short(e)}`);
      return { status: 'failed', error: short(e) };
    }
  }

  private transport(): Transporter {
    if (!this.mailer) {
      const port = Number(this.config.get('MAIL_PORT', '587'));
      this.mailer = createTransport({
        host: this.config.get('MAIL_HOST'),
        port,
        secure: this.config.get('MAIL_SECURE') ? this.config.get('MAIL_SECURE') === 'true' : port === 465,
        auth: this.config.get('MAIL_USER') ? { user: this.config.get('MAIL_USER'), pass: this.config.get('MAIL_PASSWORD') } : undefined,
      });
    }
    return this.mailer;
  }
}
