import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { AdminQuotation, AdminService } from '../../services/admin.service';
import { AIEstimationService } from '../../../../core/services/ai-estimation.service';
import { AIEstimation } from '../../../../core/models/ai-estimation.model';

type AllowedStatus = 'IN VALUTAZIONE' | 'COMPLETATA' | 'RESPINTA';

@Component({
  selector: 'app-quotations-management',
  templateUrl: './quotations-management.component.html',
  styleUrls: ['./quotations-management.component.scss'],
})
export class QuotationsManagementComponent implements OnInit {
  quotations: AdminQuotation[] = [];
  aiEstimations: Record<string, AIEstimation | null> = {};
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  economicForms: Record<string, FormGroup> = {};
  economicLoading: Record<string, boolean> = {};
  economicMessages: Record<string, string> = {};

  statusLoading: Record<string, boolean> = {};
  retryingQuotationId: string | null = null;

  readonly statusOptions: AllowedStatus[] = ['IN VALUTAZIONE', 'COMPLETATA', 'RESPINTA'];

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  itemsPerPageOptions = [10, 20, 50, 0]; // 0 = tutte

  constructor(
    private readonly adminService: AdminService,
    private readonly aiEstimationService: AIEstimationService
  ) {}

  ngOnInit(): void {
    this.loadQuotations();
  }

  takeInCharge(quotation: AdminQuotation): void {
    this.clearMessages();
    this.statusLoading[quotation.id] = true;
    this.adminService
      .takeInCharge(quotation.id)
      .pipe(finalize(() => (this.statusLoading[quotation.id] = false)))
      .subscribe({
        next: (updated) => {
          this.applyQuotationUpdate(updated);
          this.successMessage = `Quotazione ${updated.projectCode} presa in carico.`;
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  updateStatus(quotation: AdminQuotation, status: AllowedStatus): void {
    if (!status) return;
    this.clearMessages();
    this.statusLoading[quotation.id] = true;
    this.adminService
      .updateStatus(quotation.id, status)
      .pipe(finalize(() => (this.statusLoading[quotation.id] = false)))
      .subscribe({
        next: (updated) => {
          this.applyQuotationUpdate(updated);
          this.successMessage = `Stato quotazione ${updated.projectCode} aggiornato a: ${status}`;
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  getEconomicForm(id: string): FormGroup {
    if (!this.economicForms[id]) {
      this.economicForms[id] = new FormGroup({
        totalAmount: new FormControl<number | null>(null, [
          Validators.required,
          Validators.min(0),
        ]),
      });
    }
    return this.economicForms[id];
  }

  submitEconomic(quotation: AdminQuotation): void {
    const form = this.getEconomicForm(quotation.id);
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const totalAmount = (form.value as { totalAmount: number }).totalAmount;
    this.economicLoading[quotation.id] = true;
    this.economicMessages[quotation.id] = '';

    this.adminService
      .setEconomicQuotation(quotation.id, totalAmount)
      .pipe(finalize(() => (this.economicLoading[quotation.id] = false)))
      .subscribe({
        next: (updated) => {
          this.applyQuotationUpdate(updated);
          this.economicMessages[quotation.id] = `Importo salvato: € ${totalAmount.toFixed(2)}`;
          form.reset();
        },
        error: (err: unknown) => {
          this.economicMessages[quotation.id] = this.adminService.extractApiError(err);
        },
      });
  }

  canTakeInCharge(q: AdminQuotation): boolean {
    return q.status === 'INVIATA';
  }

  canChangeStatus(q: AdminQuotation): boolean {
    return q.status === 'INVIATA' || q.status === 'IN VALUTAZIONE';
  }

  canSetEconomic(q: AdminQuotation): boolean {
    return q.status === 'IN VALUTAZIONE';
  }

  badgeClass(status: string): string {
    const map: Record<string, string> = {
      'INVIATA': 'badge--inviata',
      'IN VALUTAZIONE': 'badge--in-valutazione',
      'COMPLETATA': 'badge--completata',
      'RESPINTA': 'badge--respinta',
    };
    return map[status] ?? 'badge--default';
  }

  trackById(_: number, q: AdminQuotation): string {
    return q.id;
  }

  get paginatedQuotations(): AdminQuotation[] {
    // Se itemsPerPage è 0, mostra tutte
    if (this.itemsPerPage === 0) {
      return this.quotations;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.quotations.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    if (this.itemsPerPage === 0) {
      return 1;
    }
    return Math.ceil(this.quotations.length / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  changeItemsPerPage(value: number): void {
    this.itemsPerPage = value;
    this.currentPage = 1;
  }

  retryAiEstimation(quotationId: string): void {
    this.retryingQuotationId = quotationId;
    this.clearMessages();

    this.adminService.retryAiEstimation(quotationId).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.retryingQuotationId = null;
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (err: unknown) => {
        this.errorMessage = this.adminService.extractApiError(err);
        this.retryingQuotationId = null;
      },
    });
  }

  isRetrying(quotationId: string): boolean {
    return this.retryingQuotationId === quotationId;
  }

  private loadQuotations(): void {
    this.isLoading = true;
    this.adminService
      .getQuotations()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.quotations = data;
          this.loadAIEstimations(data);
        },
        error: (err: unknown) => (this.errorMessage = this.adminService.extractApiError(err)),
      });
  }

  private loadAIEstimations(quotations: AdminQuotation[]): void {
    // Load AI estimations for all quotations
    quotations.forEach(q => {
      this.aiEstimationService.getEstimationByQuotationId(q.id).subscribe({
        next: (estimation) => {
          this.aiEstimations[q.id] = estimation;
        },
        error: () => {
          this.aiEstimations[q.id] = null;
        }
      });
    });
  }

  getAIEstimation(quotationId: string): AIEstimation | null {
    return this.aiEstimations[quotationId] || null;
  }

  getAIStatusBadgeClass(quotationId: string): string {
    const estimation = this.getAIEstimation(quotationId);
    if (!estimation) return 'ai-badge--none';

    const statusMap: Record<string, string> = {
      'AI_GENERATED': 'ai-badge--generated',
      'AI_VALIDATED': 'ai-badge--validated',
      'AI_NEEDS_REVIEW': 'ai-badge--review',
      'AI_REJECTED': 'ai-badge--rejected',
      'HUMAN_APPROVED': 'ai-badge--approved',
      'HUMAN_REJECTED': 'ai-badge--rejected'
    };
    return statusMap[estimation.aiStatus] || 'ai-badge--default';
  }

  getAIStatusLabel(quotationId: string): string {
    const estimation = this.getAIEstimation(quotationId);
    if (!estimation) return 'Nessuna stima';

    const labelMap: Record<string, string> = {
      'AI_GENERATED': 'Generata',
      'AI_VALIDATED': 'Validata',
      'AI_NEEDS_REVIEW': 'Da Revisionare',
      'AI_REJECTED': 'Respinta',
      'HUMAN_APPROVED': 'Approvata',
      'HUMAN_REJECTED': 'Respinta'
    };
    return labelMap[estimation.aiStatus] || estimation.aiStatus;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  private applyQuotationUpdate(updated: AdminQuotation): void {
    const idx = this.quotations.findIndex((q) => q.id === updated.id);
    if (idx !== -1) this.quotations[idx] = updated;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
