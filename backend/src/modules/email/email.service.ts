import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { Quotation, QuotationStatus } from '../../entities/quotation.entity';
import { User } from '../../entities/user.entity';
import { renderBaseEmailTemplate } from './templates/base-email.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('email.enabled', false);

    if (!this.enabled) {
      this.transporter = null;
      return;
    }

    const host = this.configService.get<string>('email.smtp.host');
    const port = this.configService.get<number>('email.smtp.port');
    const secure = this.configService.get<boolean>('email.smtp.secure');
    const user = this.configService.get<string>('email.smtp.user');
    const pass = this.configService.get<string>('email.smtp.pass');

    if (!host || !port) {
      this.logger.warn('SMTP non configurato: invio email disabilitato');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendVerificationEmail(user: User, token: string): Promise<void> {
    const appBaseUrl = this.configService.get<string>('email.links.appBaseUrl');
    const verificationUrl = `${appBaseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.sendMail({
      to: [user.email],
      subject: 'Verifica il tuo indirizzo email',
      html: renderBaseEmailTemplate({
        title: 'Verifica email',
        intro: `Ciao ${user.matricola},`,
        body: 'Per attivare il tuo account, conferma il tuo indirizzo email tramite il pulsante seguente.',
        actionLabel: 'Verifica email',
        actionUrl: verificationUrl,
      }),
    });
  }

  async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('email.links.frontendUrl');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    await this.sendMail({
      to: [user.email],
      subject: 'Reimpostazione password',
      html: renderBaseEmailTemplate({
        title: 'Reset password',
        intro: `Ciao ${user.matricola},`,
        body: 'Abbiamo ricevuto una richiesta di reimpostazione password. Se non sei stato tu, ignora questa email.',
        actionLabel: 'Reimposta password',
        actionUrl: resetUrl,
      }),
    });
  }

  async sendNewQuotationEmail(quotation: Quotation, user: User): Promise<void> {
    const adminRecipients = this.configService.get<string[]>('email.notifications.adminRecipients', []);
    const recipients = Array.from(new Set([user.email, ...adminRecipients]));

    await this.sendMail({
      to: recipients,
      subject: `Nuova quotazione inviata - ${quotation.projectCode}`,
      html: renderBaseEmailTemplate({
        title: 'Nuova quotazione inviata',
        intro: `La quotazione ${quotation.projectCode} è stata registrata correttamente.`,
        body: `
          <p><strong>Nome progetto:</strong> ${quotation.projectName}</p>
          <p><strong>Stato iniziale:</strong> ${quotation.status}</p>
          <p><strong>Richiedente:</strong> ${user.email}</p>
        `,
      }),
    });
  }

  async sendQuotationStatusChangedEmail(
    quotation: Quotation,
    previousStatus: QuotationStatus,
  ): Promise<void> {
    if (!quotation.createdBy?.email) {
      return;
    }

    await this.sendMail({
      to: [quotation.createdBy.email],
      subject: `Aggiornamento stato quotazione - ${quotation.projectCode}`,
      html: renderBaseEmailTemplate({
        title: 'Stato quotazione aggiornato',
        intro: `La quotazione ${quotation.projectCode} ha cambiato stato.`,
        body: `
          <p><strong>Nome progetto:</strong> ${quotation.projectName}</p>
          <p><strong>Stato precedente:</strong> ${previousStatus}</p>
          <p><strong>Nuovo stato:</strong> ${quotation.status}</p>
        `,
      }),
    });
  }

  async sendQuotationCompletedEmail(quotation: Quotation): Promise<void> {
    if (!quotation.createdBy?.email) {
      return;
    }

    await this.sendMail({
      to: [quotation.createdBy.email],
      subject: `Quotazione completata - ${quotation.projectCode}`,
      html: renderBaseEmailTemplate({
        title: 'Quotazione completata',
        intro: `La quotazione ${quotation.projectCode} è stata completata.`,
        body: `
          <p><strong>Nome progetto:</strong> ${quotation.projectName}</p>
          <p><strong>Stato:</strong> ${quotation.status}</p>
          <p><strong>Importo economico:</strong> € ${Number(quotation.totalAmount).toFixed(2)}</p>
        `,
      }),
    });
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    this.logger.log(`Invio email ${value ? 'abilitato' : 'disabilitato'} dall\'amministratore`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async sendMail(params: {
    to: string[];
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.enabled || !this.transporter) {
      this.logger.log(`Invio email saltato: ${params.subject}`);
      return;
    }

    const maxAttempts = 3;
    const retryDelayMs = 5000;
    const recipient = params.to.join(', ');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.transporter.sendMail({
          from: this.configService.get<string>('email.smtp.from'),
          to: recipient,
          subject: params.subject,
          html: params.html,
        });
        this.logger.log(`Email inviata: "${params.subject}" → ${recipient}`);
        return;
      } catch (error) {
        const msg = (error as Error).message;
        const isTransient = msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN') || msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT');

        if (attempt < maxAttempts && isTransient) {
          this.logger.warn(`Tentativo ${attempt}/${maxAttempts} fallito (${msg}) — retry tra ${retryDelayMs / 1000}s`);
          await new Promise((r) => setTimeout(r, retryDelayMs));
        } else {
          this.logger.error(`Errore invio email "${params.subject}" → ${recipient}: ${msg}`);
          return;
        }
      }
    }
  }
}
