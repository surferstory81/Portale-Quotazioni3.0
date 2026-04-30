import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import { finalize } from 'rxjs';
import { Quotation } from '../../models/quotation.models';
import { QuotationsService } from '../../services/quotations.service';

@Component({
  selector: 'app-quotation-status',
  templateUrl: './quotation-status.component.html',
  styleUrl: './quotation-status.component.scss',
})
export class QuotationStatusComponent implements OnInit {
  readonly filtersForm = new UntypedFormGroup({
    projectCode: new UntypedFormControl(''),
    projectName: new UntypedFormControl(''),
  });

  quotations: Quotation[] = [];
  sortKey: 'updatedAt' | 'projectCode' | 'status' = 'updatedAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  currentPage = 1;
  readonly pageSize = 8;
  isLoading = false;
  errorMessage = '';

  constructor(private readonly quotationsService: QuotationsService) {}

  ngOnInit(): void {
    this.load();
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.load();
  }

  resetFilters(): void {
    this.filtersForm.reset({
      projectCode: '',
      projectName: '',
    });
    this.currentPage = 1;
    this.load();
  }

  setSort(sortKey: 'updatedAt' | 'projectCode' | 'status'): void {
    if (this.sortKey === sortKey) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = sortKey;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }

  get pagedQuotations(): Quotation[] {
    const sorted = [...this.quotations].sort((a, b) => {
      const multiplier = this.sortDirection === 'asc' ? 1 : -1;

      if (this.sortKey === 'updatedAt') {
        return (
          (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) *
          multiplier
        );
      }

      if (this.sortKey === 'projectCode') {
        return a.projectCode.localeCompare(b.projectCode) * multiplier;
      }

      return a.status.localeCompare(b.status) * multiplier;
    });

    const startIndex = (this.currentPage - 1) * this.pageSize;
    return sorted.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.quotations.length / this.pageSize));
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage -= 1;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage += 1;
    }
  }

  trackById(_: number, quotation: Quotation): string {
    return quotation.id;
  }

  private load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const values = this.filtersForm.getRawValue() as {
      projectCode: string;
      projectName: string;
    };

    this.quotationsService
      .list({
        projectCode: values.projectCode,
        projectName: values.projectName,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (quotations) => {
          this.quotations = quotations;
          if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
          }
        },
        error: (error: unknown) => {
          this.errorMessage = this.quotationsService.extractApiError(error);
        },
      });
  }
}
