import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminQuotation, AdminService } from '../../services/admin.service';

type AllowedStatus = 'IN VALUTAZIONE' | 'COMPLETATA' | 'RESPINTA';

@Component({
  selector: 'app-quotations-management',
  templateUrl: './quotations-management.component.html',
  styleUrls: ['./quotations-management.component.scss'],
})
export class QuotationsManagementComponent implements OnInit {
  quotations: AdminQuotation[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  economicForms: Record<string, FormGroup> = {};
  economicLoading: Record<string, boolean> = {};
  economicMessages: Record<string, string> = {};

  statusLoading: Record<string, boolean> = {};

  readonly statusOptions: AllowedStatus[] = ['IN VALUTAZIONE', 'COMPLETATA', 'RESPINTA'];

  constructor(private readonly adminService: AdminService) {}

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

  private loadQuotations(): void {
    this.isLoading = true;
    this.adminService
      .getQuotations()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => (this.quotations = data),
        error: (err: unknown) => (this.errorMessage = this.adminService.extractApiError(err)),
      });
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
