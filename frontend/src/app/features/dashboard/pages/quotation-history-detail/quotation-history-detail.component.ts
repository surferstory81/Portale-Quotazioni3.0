import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { Quotation } from '../../models/quotation.models';
import { QuotationsService } from '../../services/quotations.service';

@Component({
  selector: 'app-quotation-history-detail',
  templateUrl: './quotation-history-detail.component.html',
  styleUrl: './quotation-history-detail.component.scss',
})
export class QuotationHistoryDetailComponent implements OnInit {
  quotation: Quotation | null = null;
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly quotationsService: QuotationsService,
  ) {}

  ngOnInit(): void {
    const quotationId = this.route.snapshot.paramMap.get('id');

    if (!quotationId) {
      this.errorMessage = 'ID quotazione mancante.';
      return;
    }

    this.loadQuotation(quotationId);
  }

  private loadQuotation(quotationId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.quotationsService
      .getById(quotationId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (quotation) => {
          this.quotation = quotation;
        },
        error: (error: unknown) => {
          this.errorMessage = this.quotationsService.extractApiError(error);
        },
      });
  }
}
