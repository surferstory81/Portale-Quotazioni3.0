import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { Quotation } from '../../models/quotation.models';
import { QuotationsService } from '../../services/quotations.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  quotations: Quotation[] = [];
  drafts: Quotation[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  deletingDraftId: string | null = null;

  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
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
          this.quotations = quotations;
          this.drafts = drafts;
        },
        error: () => {
          this.errorMessage = 'Impossibile caricare i dati.';
        },
      });
  }

  private get countByStatus(): Record<string, number> {
    return this.quotations.reduce(
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
  get countBozza(): number { return this.drafts.length; }

  get recentQuotations(): Quotation[] {
    return [...this.quotations]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
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
          this.drafts = this.drafts.filter(d => d.id !== draft.id);
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
