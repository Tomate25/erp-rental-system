import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  generateQuotationEmailHtml,
  QuotationEmailParams,
} from '../templates/quotation-email.template';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: nodemailer.Transporter;
  public readonly sentMailsForTesting: SendMailOptions[] = [];

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter(): void {
    const host =
      this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const port = Number(
      this.configService.get<number>('SMTP_PORT') ||
        process.env.SMTP_PORT ||
        587,
    );
    const secure =
      (this.configService.get<string>('SMTP_SECURE') ||
        process.env.SMTP_SECURE) === 'true';
    const user =
      this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const pass =
      this.configService.get<string>('SMTP_APP_PASSWORD') ||
      process.env.SMTP_APP_PASSWORD;
    const isTest = process.env.NODE_ENV === 'test';

    if (isTest) {
      this.logger.log(
        'MailService inicializado con transporte simulado para pruebas.',
      );
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return;
    }
    if (!host || !user || !pass) {
      this.logger.error(
        'SMTP no está configurado; los mensajes permanecerán pendientes para reintento.',
      );
      return;
    }
    this.logger.log(
      `MailService inicializado con transporte SMTP en ${host}:${port}`,
    );
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const from =
      this.configService.get<string>('SMTP_FROM') ||
      process.env.SMTP_FROM ||
      'BM Construcciones ERP <no-reply@bmconstrucciones.com>';

    try {
      if (!this.transporter) {
        return { success: false, error: 'SMTP no configurado' };
      }
      this.sentMailsForTesting.push(options);

      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log('Correo enviado satisfactoriamente.');
      return {
        success: true,
        messageId: info.messageId || 'simulated-msg-id',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error SMTP';
      this.logger.error('Error al enviar correo mediante SMTP.');
      return {
        success: false,
        error: message,
      };
    }
  }

  async sendQuotation(
    destinatario: string,
    params: QuotationEmailParams,
  ): Promise<SendMailResult> {
    const html = generateQuotationEmailHtml(params);
    const text = `Cotización ${params.numeroCotizacion} (v${params.version}) de ${params.empresaNombre}. Total: ${params.total}. Revise y responda en: ${params.publicUrl}`;
    const subject = `Cotización Formal ${params.numeroCotizacion} (v${params.version}) - ${params.empresaNombre}`;

    return this.sendMail({
      to: destinatario,
      subject,
      html,
      text,
    });
  }
}
