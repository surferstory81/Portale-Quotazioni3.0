import { Component, OnInit } from '@angular/core';
import { Quotation } from '../../models/quotation.models';
import { QuotationsService } from '../../services/quotations.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  quotations: Quotation[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private readonly quotationsService: QuotationsService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.quotationsService.list().subscribe({
      next: (quotations) => {
        this.quotations = quotations;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossibile caricare i dati.';
        this.isLoading = false;
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

  get recentQuotations(): Quotation[] {
    return [...this.quotations]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
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
}
