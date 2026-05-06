import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Quotation, QuotationStatus } from '../../entities/quotation.entity';
import { Role } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { AppSetting } from '../../entities/app-setting.entity';
import { EmailVerificationToken } from '../../entities/email-verification-token.entity';
import { AIEstimation, AIStatus } from '../../entities/ai-estimation.entity';
import { EmailService } from '../email/email.service';
import { AiServiceClientService } from '../ai-estimation/ai-service-client.service';

export interface SystemSettings {
  email_enabled: boolean;
  sso_enabled: boolean;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(AppSetting)
    private readonly settingRepo: Repository<AppSetting>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailTokenRepo: Repository<EmailVerificationToken>,
    @InjectRepository(AIEstimation)
    private readonly aiEstimationRepo: Repository<AIEstimation>,
    private readonly emailService: EmailService,
    private readonly aiServiceClient: AiServiceClientService,
  ) {}

  async findAllQuotations(): Promise<Quotation[]> {
    return this.quotationRepo.find({
      where: {
        // Escludi le bozze dalla vista admin
        status: Not(QuotationStatus.BOZZA) as any,
      },
      relations: ['createdBy', 'createdBy.role', 'assignedAdmin', 'assignedAdmin.role'],
      order: { createdAt: 'DESC' },
    });
  }

  async takeInCharge(quotationId: string, adminUser: User): Promise<Quotation> {
    console.log(`[ADMIN-SERVICE] takeInCharge called for quotation ${quotationId} by admin ${adminUser.id}`);
    const quotation = await this.findQuotationOrFail(quotationId);
    const previousStatus = quotation.status;

    if (quotation.status !== QuotationStatus.INVIATA) {
      throw new BadRequestException(
        'La presa in carico e consentita solo per quotazioni in stato INVIATA',
      );
    }

    quotation.assignedAdmin = adminUser;
    quotation.takenInChargeAt = new Date();
    quotation.status = QuotationStatus.IN_VALUTAZIONE;

    const savedQuotation = await this.quotationRepo.save(quotation);
    console.log(`[ADMIN-SERVICE] Quotation saved with status ${savedQuotation.status}`);

    await this.emailService.sendQuotationStatusChangedEmail(
      savedQuotation,
      previousStatus,
    );
    console.log(`[ADMIN-SERVICE] Email sent`);

    // Launch AI estimation when admin takes quotation in charge
    console.log(`[ADMIN-SERVICE] Calling AI service for quotation ${savedQuotation.id}`);
    this.aiServiceClient.requestQuotationProcessing({
      quotation_id: savedQuotation.id,
      user_id: adminUser.id,
      project_code: savedQuotation.projectCode,
      status: savedQuotation.status,
    }).catch((error: Error) => {
      console.error(`[ADMIN-SERVICE] Failed to request AI processing: ${error.message}`);
    });
    console.log(`[ADMIN-SERVICE] AI service call initiated`);

    return savedQuotation;
  }

  async updateQuotationStatus(
    quotationId: string,
    status: string,
  ): Promise<Quotation> {
    const quotation = await this.findQuotationOrFail(quotationId);
    const previousStatus = quotation.status;
    const nextStatus = status as QuotationStatus;

    if (!this.isAllowedTransition(quotation.status, nextStatus)) {
      throw new BadRequestException(
        `Transizione non valida da ${quotation.status} a ${status}`,
      );
    }

    // Verifica che ci sia una quotazione valida (manuale o AI)
    if (nextStatus === QuotationStatus.COMPLETATA) {
      const hasManualQuotation = Number(quotation.totalAmount) > 0;
      const hasAIEstimation = await this.hasValidAIEstimation(quotationId);

      if (!hasManualQuotation && !hasAIEstimation) {
        throw new BadRequestException(
          'Inserire prima una quotazione economica manuale o attendere la stima AI',
        );
      }
    }

    quotation.status = nextStatus;
    const savedQuotation = await this.quotationRepo.save(quotation);

    if (nextStatus === QuotationStatus.COMPLETATA) {
      await this.emailService.sendQuotationCompletedEmail(savedQuotation);
    } else {
      await this.emailService.sendQuotationStatusChangedEmail(
        savedQuotation,
        previousStatus,
      );
    }

    return savedQuotation;
  }

  async setEconomicQuotation(
    quotationId: string,
    totalAmount: number,
  ): Promise<Quotation> {
    const quotation = await this.findQuotationOrFail(quotationId);

    if (quotation.status !== QuotationStatus.IN_VALUTAZIONE) {
      throw new BadRequestException(
        'La quotazione economica puo essere inserita solo in stato IN VALUTAZIONE',
      );
    }

    quotation.totalAmount = totalAmount;
    return this.quotationRepo.save(quotation);
  }

  async setManualCapexOpex(
    quotationId: string,
    manualCapex: number,
    manualOpex: number,
  ): Promise<Quotation> {
    const quotation = await this.findQuotationOrFail(quotationId);

    if (quotation.status !== QuotationStatus.IN_VALUTAZIONE) {
      throw new BadRequestException(
        'I valori CAPEX/OPEX possono essere modificati solo in stato IN VALUTAZIONE',
      );
    }

    quotation.manualCapex = manualCapex;
    quotation.manualOpex = manualOpex;
    return this.quotationRepo.save(quotation);
  }

  async deleteQuotation(quotationId: string): Promise<{ message: string }> {
    const quotation = await this.findQuotationOrFail(quotationId);
    await this.quotationRepo.remove(quotation);
    return { message: `Quotazione ${quotation.projectCode} eliminata con successo` };
  }

  private async hasValidAIEstimation(quotationId: string): Promise<boolean> {
    const estimation = await this.aiEstimationRepo.findOne({
      where: { quotation: { id: quotationId } },
      order: { createdAt: 'DESC' },
    });

    if (!estimation) {
      return false;
    }

    // Stima valida se completata con successo e ha dati
    return (
      estimation.aiStatus === AIStatus.AI_GENERATED &&
      estimation.estimationData?.summary?.total_first_year > 0
    );
  }

  async listUsers(): Promise<Partial<User>[]> {
    const users = await this.userRepo.find({ relations: ['role'], order: { createdAt: 'DESC' } });
    return users.map(({ passwordHash: _, ...u }) => u);
  }

  async assignAdminRole(userId: string, assignAdmin: boolean): Promise<User> {
    const user = await this.findUserOrFail(userId);
    const roleName = assignAdmin ? 'ADMIN' : 'USER';
    const role = await this.roleRepo.findOne({ where: { name: roleName } });

    if (!role) {
      throw new NotFoundException(`Ruolo ${roleName} non trovato`);
    }

    user.role = role;
    return this.userRepo.save(user);
  }

  async blockUser(userId: string, isBlocked: boolean): Promise<User> {
    const user = await this.findUserOrFail(userId);
    user.isBlocked = isBlocked;
    user.blockedAt = isBlocked ? new Date() : null;

    const savedUser = await this.userRepo.save(user);

    if (isBlocked) {
      await this.refreshTokenRepo.update(
        { userId: user.id, isRevoked: false },
        { isRevoked: true },
      );
    }

    return savedUser;
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.findUserOrFail(userId);
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.save(user);

    await this.refreshTokenRepo.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true },
    );

    return { message: 'Password utente reimpostata con successo' };
  }

  // ─── SYSTEM SETTINGS ─────────────────────────────────────
  async getSystemSettings(): Promise<SystemSettings> {
    const rows = await this.settingRepo.find();
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      email_enabled: map['email_enabled'] === 'true',
      sso_enabled:   map['sso_enabled']   === 'true',
    };
  }

  async setSystemSetting(key: string, value: boolean): Promise<SystemSettings> {
    const allowed = ['email_enabled', 'sso_enabled'];
    if (!allowed.includes(key)) {
      throw new BadRequestException(`Impostazione non valida: ${key}`);
    }
    await this.settingRepo.upsert({ key, value: String(value) }, ['key']);
    if (key === 'email_enabled') {
      this.emailService.setEnabled(value);
    }
    return this.getSystemSettings();
  }

  // ─── USER MANAGEMENT (extended) ──────────────────────────
  async verifyUserEmail(userId: string): Promise<Partial<User>> {
    const user = await this.findUserOrFail(userId);
    if (user.isVerified) {
      throw new BadRequestException('L\'utente è già verificato');
    }
    user.isVerified = true;
    await this.emailTokenRepo.update({ userId: user.id, isUsed: false }, { isUsed: true });
    const saved = await this.userRepo.save(user);
    const { passwordHash: _, ...rest } = saved;
    return rest;
  }

  async deleteUser(userId: string, requestingAdminId: string): Promise<{ message: string }> {
    if (userId === requestingAdminId) {
      throw new BadRequestException('Non puoi eliminare il tuo stesso account');
    }
    const user = await this.findUserOrFail(userId);

    const quotationCount = await this.quotationRepo.count({ where: { createdBy: { id: userId } } });
    if (quotationCount > 0) {
      throw new BadRequestException(
        `Impossibile eliminare: l'utente ha ${quotationCount} quotazion${quotationCount === 1 ? 'e' : 'i'} associate`,
      );
    }

    if (user.role?.name === 'ADMIN') {
      const adminCount = await this.userRepo.count({ where: { role: { name: 'ADMIN' } } });
      if (adminCount <= 1) {
        throw new BadRequestException('Impossibile eliminare l\'ultimo amministratore');
      }
    }

    await this.refreshTokenRepo.delete({ userId: user.id });
    await this.emailTokenRepo.delete({ userId: user.id });
    await this.userRepo.remove(user);

    return { message: `Utente ${user.email} eliminato` };
  }

  private async findQuotationOrFail(quotationId: string): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId },
      relations: ['createdBy', 'createdBy.role', 'assignedAdmin', 'assignedAdmin.role'],
    });

    if (!quotation) {
      throw new NotFoundException('Quotazione non trovata');
    }

    return quotation;
  }

  private async findUserOrFail(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    return user;
  }

  private isAllowedTransition(
    currentStatus: QuotationStatus,
    nextStatus: QuotationStatus,
  ): boolean {
    return (
      (currentStatus === QuotationStatus.INVIATA &&
        nextStatus === QuotationStatus.IN_VALUTAZIONE) ||
      (currentStatus === QuotationStatus.IN_VALUTAZIONE &&
        nextStatus === QuotationStatus.COMPLETATA) ||
      (currentStatus === QuotationStatus.IN_VALUTAZIONE &&
        nextStatus === QuotationStatus.RESPINTA)
    );
  }
}
