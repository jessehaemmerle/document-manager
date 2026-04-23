import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly enabled: boolean;
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<string>('SMTP_ENABLED', 'false') === 'true';
    this.transporter = this.enabled
      ? nodemailer.createTransport({
          host: this.config.get<string>('SMTP_HOST'),
          port: this.config.get<number>('SMTP_PORT', 587),
          secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
          auth:
            this.config.get<string>('SMTP_USER') && this.config.get<string>('SMTP_PASSWORD')
              ? {
                  user: this.config.get<string>('SMTP_USER'),
                  pass: this.config.get<string>('SMTP_PASSWORD'),
                }
              : undefined,
        })
      : null;
  }

  async sendMail(to: string, subject: string, text: string) {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(`SMTP deaktiviert. Mail an ${to}: ${subject}`);
      return { skipped: true };
    }

    return this.transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'dokumente@example.internal'),
      to,
      subject,
      text,
    });
  }
}
