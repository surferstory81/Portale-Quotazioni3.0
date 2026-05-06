import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, forkJoin, interval, Subscription } from 'rxjs';
import { Quotation } from '../../models/quotation.models';
import { QuotationsService } from '../../services/quotations.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  allQuotations: Quotation[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  deletingDraftId: string | null = null;

  // Filtro per stato
  selectedStatus: string = '';
  readonly statusOptions = ['BOZZA', 'INVIATA', 'IN VALUTAZIONE', 'COMPLETATA', 'RESPINTA'];

  // Auto-refresh
  private refreshSubscription?: Subscription;

  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private startAutoRefresh(): void {
    // Refresh data every 15 seconds
    this.refreshSubscription = interval(15000).subscribe(() => {
      this.loadDataSilently();
    });
  }

  private stopAutoRefresh(): void {
    this.refreshSubscription?.unsubscribe();
  }

  private loadDataSilently(): void {
    // Reload without showing loading spinner
    forkJoin({
      quotations: this.quotationsService.list(),
      drafts: this.quotationsService.listDrafts(),
    }).subscribe({
      next: ({ quotations, drafts }) => {
        this.allQuotations = [...quotations, ...drafts];
      },
      error: () => {
        // Silently fail
      }
    });
  }

  private loadData(): void {
    this.isLoading = true;
    forkJoin({
      quotations: this.quotationsService.list(),
      drafts: this.quotationsService.listDrafts(),
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ quotations, drafts }) => {
          // Unisci quotazioni e bozze in un'unica lista
          this.allQuotations = [...drafts, ...quotations];
        },
        error: () => {
          this.errorMessage = 'Impossibile caricare i dati.';
        },
      });
  }

  get filteredQuotations(): Quotation[] {
    if (!this.selectedStatus) {
      return this.allQuotations;
    }
    return this.allQuotations.filter(q => q.status === this.selectedStatus);
  }

  private get countByStatus(): Record<string, number> {
    return this.allQuotations.reduce(
      (acc, q) => {
        acc[q.status] = (acc[q.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  get countInviata(): number { return this.countByStatus['INVIATA'] ?? 0; }
  get countInValutazione(): number { return this.countByStatus['IN VALUTAZIONE'] ?? 0; }
  get countCompletata(): number { return this.countByStatus['COMPLETATA'] ?? 0; }
  get countRespinta(): number { return this.countByStatus['RESPINTA'] ?? 0; }
  get countBozza(): number { return this.countByStatus['BOZZA'] ?? 0; }

  get recentQuotations(): Quotation[] {
    return [...this.filteredQuotations]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }

  badgeClass(status: string): string {
    const map: Record<string, string> = {
      'BOZZA': 'badge--bozza',
      'INVIATA': 'badge--inviata',
      'IN VALUTAZIONE': 'badge--in-valutazione',
      'COMPLETATA': 'badge--completata',
      'RESPINTA': 'badge--respinta',
    };
    return map[status] ?? 'badge--default';
  }

  isDraft(quotation: Quotation): boolean {
    return quotation.status === 'BOZZA';
  }

  editDraft(draftId: string): void {
    void this.router.navigate(['/dashboard/quotations/new'], {
      queryParams: { draftId }
    });
  }

  deleteDraft(draft: Quotation): void {
    if (!confirm(`Eliminare la bozza "${draft.projectName || 'Bozza senza titolo'}"?`)) {
      return;
    }

    this.deletingDraftId = draft.id;
    this.quotationsService
      .deleteDraft(draft.id)
      .pipe(finalize(() => (this.deletingDraftId = null)))
      .subscribe({
        next: (response) => {
          this.allQuotations = this.allQuotations.filter(q => q.id !== draft.id);
          this.successMessage = response.message;
          setTimeout(() => (this.successMessage = ''), 3000);
        },
        error: (error: unknown) => {
          this.errorMessage = this.quotationsService.extractApiError(error);
        },
      });
  }

  isDeletingDraft(draftId: string): boolean {
    return this.deletingDraftId === draftId;
  }
}
