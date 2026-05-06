import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminQuotation, AdminService, TokenStats } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  quotations: AdminQuotation[] = [];
  tokenStats: TokenStats | null = null;
  isLoading = false;
  errorMessage = '';
  retryingQuotationId: string | null = null;
  retrySuccessMessage = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  itemsPerPageOptions = [10, 20, 50, 0]; // 0 = tutte

  constructor(private readonly adminService: AdminService) {}

  ngOnInit(): void {
    this.isLoading = true;
    forkJoin({
      quotations: this.adminService.getQuotations(),
      tokenStats: this.adminService.getTokenStats(),
    }).subscribe({
      next: ({ quotations, tokenStats }) => {
        this.quotations = quotations;
        this.tokenStats = tokenStats;
        this.isLoading = false;
      },
      error: (err: unknown) => {
        this.errorMessage = this.adminService.extractApiError(err);
        this.isLoading = false;
      },
    });
  }

  count(status: string): number {
    return this.quotations.filter((q) => q.status === status).length;
  }

  get sortedQuotations(): AdminQuotation[] {
    return [...this.quotations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  get paginatedQuotations(): AdminQuotation[] {
    const sorted = this.sortedQuotations;

    // Se itemsPerPage è 0, mostra tutte
    if (this.itemsPerPage === 0) {
      return sorted;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return sorted.slice(startIndex, endIndex);
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

  badgeClass(status: string): string {
    const map: Record<string, string> = {
      'INVIATA': 'badge--inviata',
      'IN VALUTAZIONE': 'badge--in-valutazione',
      'COMPLETATA': 'badge--completata',
      'RESPINTA': 'badge--respinta',
    };
    return map[status] ?? 'badge--default';
  }

  retryAiEstimation(quotationId: string): void {
    this.retryingQuotationId = quotationId;
    this.errorMessage = '';
    this.retrySuccessMessage = '';

    this.adminService.retryAiEstimation(quotationId).subscribe({
      next: (response) => {
        this.retrySuccessMessage = response.message;
        this.retryingQuotationId = null;
        setTimeout(() => {
          this.retrySuccessMessage = '';
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

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  changeItemsPerPage(value: number): void {
    this.itemsPerPage = value;
    this.currentPage = 1; // Reset alla prima pagina
  }

  get itemsPerPageLabel(): string {
    return this.itemsPerPage === 0 ? 'Tutte' : this.itemsPerPage.toString();
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('it-IT').format(Math.round(num));
  }

  formatCurrency(num: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(num);
  }
}
