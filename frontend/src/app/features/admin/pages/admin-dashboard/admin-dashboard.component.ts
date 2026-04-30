import { Component, OnInit } from '@angular/core';
import { AdminQuotation, AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  quotations: AdminQuotation[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private readonly adminService: AdminService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.adminService.getQuotations().subscribe({
      next: (data) => {
        this.quotations = data;
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

  get recentQuotations(): AdminQuotation[] {
    return [...this.quotations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
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
