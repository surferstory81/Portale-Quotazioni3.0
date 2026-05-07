import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize, forkJoin, interval, Subscription } from 'rxjs';
import { AdminQuotation, AdminService } from '../../services/admin.service';
import { AIEstimationService } from '../../../../core/services/ai-estimation.service';
import { AIEstimation } from '../../../../core/models/ai-estimation.model';

type AllowedStatus = 'IN VALUTAZIONE' | 'COMPLETATA' | 'RESPINTA';

@Component({
  selector: 'app-quotations-management',
  templateUrl: './quotations-management.component.html',
  styleUrls: ['./quotations-management.component.scss'],
})
export class QuotationsManagementComponent implements OnInit, OnDestroy {
  quotations: AdminQuotation[] = [];
  aiEstimations: Record<string, AIEstimation | null> = {};
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  economicForms: Record<string, FormGroup> = {};
  economicLoading: Record<string, boolean> = {};
  economicMessages: Record<string, string> = {};

  capexOpexForms: Record<string, FormGroup> = {};
  capexOpexLoading: Record<string, boolean> = {};
  capexOpexMessages: Record<string, string> = {};

  statusControls: Record<string, FormControl<string | null>> = {};
  statusLoading: Record<string, boolean> = {};
  retryingQuotationId: string | null = null;
  deletingQuotationId: string | null = null;
  showProgressDialog = false;
  progressQuotationId: string = '';
  approvingAIEstimationId: string | null = null;
  rejectingAIEstimationId: string | null = null;

  // Expandable rows
  expandedRows: Set<string> = new Set();

  readonly statusOptions: AllowedStatus[] = ['IN VALUTAZIONE', 'COMPLETATA', 'RESPINTA'];

  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  itemsPerPageOptions = [10, 20, 50, 0]; // 0 = tutte

  // Auto-refresh for AI estimations
  private refreshSubscription?: Subscription;

  constructor(
    private readonly adminService: AdminService,
    private readonly aiEstimationService: AIEstimationService
  ) {}

  ngOnInit(): void {
    this.loadQuotations();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private startAutoRefresh(): void {
    // Refresh AI estimations every 10 seconds
    this.refreshSubscription = interval(10000).subscribe(() => {
      this.refreshAIEstimations();
    });
  }

  private stopAutoRefresh(): void {
    this.refreshSubscription?.unsubscribe();
  }

  private refreshAIEstimations(): void {
    // Reload AI estimations for quotations in "IN VALUTAZIONE" status
    const inEvaluationQuotations = this.quotations.filter(q => q.status === 'IN VALUTAZIONE');
    inEvaluationQuotations.forEach(q => {
      this.reloadAIEstimation(q.id);
    });
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
          this.successMessage = `Quotazione ${updated.projectCode} presa in carico. La stima AI verrà generata automaticamente.`;
          // Wait a moment for AI estimation to start, then reload
          setTimeout(() => this.reloadAIEstimation(quotation.id), 2000);
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  updateStatus(quotation: AdminQuotation): void {
    const control = this.getStatusControl(quotation.id);
    const status = control.value as AllowedStatus;
    if (!status) return;

    this.clearMessages();
    this.statusLoading[quotation.id] = true;
    this.adminService
      .updateStatus(quotation.id, status)
      .pipe(finalize(() => (this.statusLoading[quotation.id] = false)))
      .subscribe({
        next: (updated) => {
          this.applyQuotationUpdate(updated);
          control.reset('');
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

  getStatusControl(id: string): FormControl<string | null> {
    if (!this.statusControls[id]) {
      this.statusControls[id] = new FormControl<string | null>('');
    }
    return this.statusControls[id];
  }

  getCapexOpexForm(id: string): FormGroup {
    if (!this.capexOpexForms[id]) {
      this.capexOpexForms[id] = new FormGroup({
        manualCapex: new FormControl<number | null>(null, [
          Validators.required,
          Validators.min(0),
        ]),
        manualOpex: new FormControl<number | null>(null, [
          Validators.required,
          Validators.min(0),
        ]),
      });
    }
    return this.capexOpexForms[id];
  }

  submitCapexOpex(quotation: AdminQuotation): void {
    const form = this.getCapexOpexForm(quotation.id);
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const { manualCapex, manualOpex } = form.value;
    this.capexOpexLoading[quotation.id] = true;
    this.capexOpexMessages[quotation.id] = '';

    this.adminService
      .setManualCapexOpex(quotation.id, manualCapex!, manualOpex!)
      .pipe(finalize(() => (this.capexOpexLoading[quotation.id] = false)))
      .subscribe({
        next: (updated) => {
          this.applyQuotationUpdate(updated);
          this.capexOpexMessages[quotation.id] = `CAPEX/OPEX salvati: € ${manualCapex!.toFixed(2)} / € ${manualOpex!.toFixed(2)}`;
          form.reset();
        },
        error: (err: unknown) => {
          this.capexOpexMessages[quotation.id] = this.adminService.extractApiError(err);
        },
      });
  }

  deleteQuotation(quotation: AdminQuotation): void {
    if (!confirm(`Eliminare la quotazione ${quotation.projectCode}? Questa azione è irreversibile.`)) {
      return;
    }

    this.clearMessages();
    this.deletingQuotationId = quotation.id;

    this.adminService
      .deleteQuotation(quotation.id)
      .pipe(finalize(() => (this.deletingQuotationId = null)))
      .subscribe({
        next: (response) => {
          this.quotations = this.quotations.filter(q => q.id !== quotation.id);
          this.successMessage = response.message;
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  isDeleting(id: string): boolean {
    return this.deletingQuotationId === id;
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
    this.progressQuotationId = quotationId;
    this.showProgressDialog = true;
    this.clearMessages();

    this.adminService.retryAiEstimation(quotationId).subscribe({
      next: (response) => {
        this.successMessage = response.message + ' Attendi il completamento della validazione...';
        this.retryingQuotationId = null;
        // Keep progress dialog open while AI processes
        // Auto-refresh will update the status automatically
        setTimeout(() => {
          this.showProgressDialog = false;
        }, 3000);
        // Reload AI estimation after a delay to get updated status
        setTimeout(() => {
          this.reloadAIEstimation(quotationId);
        }, 5000);
        setTimeout(() => {
          this.successMessage = '';
        }, 8000);
      },
      error: (err: unknown) => {
        this.errorMessage = this.adminService.extractApiError(err);
        this.retryingQuotationId = null;
        this.showProgressDialog = false;
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

  private reloadAIEstimation(quotationId: string): void {
    // Reload AI estimation for a single quotation
    this.aiEstimationService.getEstimationByQuotationId(quotationId).subscribe({
      next: (estimation) => {
        this.aiEstimations[quotationId] = estimation;
      },
      error: () => {
        this.aiEstimations[quotationId] = null;
      }
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

  toggleRow(quotationId: string): void {
    if (this.expandedRows.has(quotationId)) {
      this.expandedRows.delete(quotationId);
    } else {
      this.expandedRows.add(quotationId);
    }
  }

  isRowExpanded(quotationId: string): boolean {
    return this.expandedRows.has(quotationId);
  }

  // ─── AI Estimation Approval ────────────────────────────────

  canApproveAIEstimation(quotationId: string): boolean {
    const estimation = this.aiEstimations[quotationId];
    if (!estimation) return false;

    // Can approve if AI_VALIDATED, AI_NEEDS_REVIEW, or AI_REJECTED (manual override)
    return estimation.aiStatus === 'AI_VALIDATED'
        || estimation.aiStatus === 'AI_NEEDS_REVIEW'
        || estimation.aiStatus === 'AI_REJECTED';
  }

  approveAIEstimation(quotationId: string): void {
    const estimation = this.aiEstimations[quotationId];
    if (!estimation) return;

    const adminNotes = prompt('Note admin (opzionali):');
    if (adminNotes === null) return; // User cancelled

    this.approvingAIEstimationId = estimation.id;
    this.clearMessages();

    this.aiEstimationService.approveEstimation(estimation.id, adminNotes || undefined).subscribe({
      next: (updated) => {
        this.aiEstimations[quotationId] = updated;
        this.successMessage = 'Stima AI approvata con successo. L\'importo è stato aggiornato sulla quotazione.';
        this.approvingAIEstimationId = null;
        this.loadQuotations(); // Reload to show updated quotation
        setTimeout(() => (this.successMessage = ''), 5000);
      },
      error: (err: unknown) => {
        this.errorMessage = this.adminService.extractApiError(err);
        this.approvingAIEstimationId = null;
      },
    });
  }

  rejectAIEstimation(quotationId: string): void {
    const estimation = this.aiEstimations[quotationId];
    if (!estimation) return;

    const adminNotes = prompt('Motivazione rifiuto (obbligatoria):');
    if (!adminNotes || adminNotes.trim() === '') {
      alert('Devi fornire una motivazione per il rifiuto.');
      return;
    }

    this.rejectingAIEstimationId = estimation.id;
    this.clearMessages();

    this.aiEstimationService.rejectEstimation(estimation.id, adminNotes).subscribe({
      next: (updated) => {
        this.aiEstimations[quotationId] = updated;
        this.successMessage = 'Stima AI rifiutata. Puoi richiedere una nuova stima.';
        this.rejectingAIEstimationId = null;
        this.reloadAIEstimation(quotationId); // Reload AI estimation
        setTimeout(() => (this.successMessage = ''), 5000);
      },
      error: (err: unknown) => {
        this.errorMessage = this.adminService.extractApiError(err);
        this.rejectingAIEstimationId = null;
      },
    });
  }

  isApprovingAI(quotationId: string): boolean {
    const estimation = this.aiEstimations[quotationId];
    return estimation ? this.approvingAIEstimationId === estimation.id : false;
  }

  isRejectingAI(quotationId: string): boolean {
    const estimation = this.aiEstimations[quotationId];
    return estimation ? this.rejectingAIEstimationId === estimation.id : false;
  }

  getValidationIssues(quotationId: string): any[] {
    const estimation = this.aiEstimations[quotationId];
    if (!estimation?.validationData?.issues) return [];
    return estimation.validationData.issues;
  }

  getValidationSummary(quotationId: string): any {
    const estimation = this.aiEstimations[quotationId];
    return estimation?.validationData?.summary || null;
  }
}
