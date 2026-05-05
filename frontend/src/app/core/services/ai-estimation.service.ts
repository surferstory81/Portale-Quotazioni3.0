import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AIEstimation, AIEstimationStatistics } from '../models/ai-estimation.model';

@Injectable({
  providedIn: 'root'
})
export class AIEstimationService {
  constructor(private apiService: ApiService) {}

  /**
   * Get AI estimation for a specific quotation
   */
  getEstimationByQuotationId(quotationId: string): Observable<AIEstimation | null> {
    return this.apiService.get<AIEstimation | null>(`/ai-estimation/quotation/${quotationId}`);
  }

  /**
   * Get all estimations needing human review
   */
  getEstimationsNeedingReview(): Observable<AIEstimation[]> {
    return this.apiService.get<AIEstimation[]>('/ai-estimation/needs-review');
  }

  /**
   * Get AI estimation statistics
   */
  getStatistics(): Observable<AIEstimationStatistics> {
    return this.apiService.get<AIEstimationStatistics>('/ai-estimation/statistics');
  }

  /**
   * Approve an AI estimation (admin only)
   */
  approveEstimation(estimationId: string, adminNotes?: string): Observable<AIEstimation> {
    return this.apiService.patch<AIEstimation>(`/ai-estimation/${estimationId}/approve`, {
      adminNotes
    });
  }

  /**
   * Reject an AI estimation (admin only)
   */
  rejectEstimation(estimationId: string, adminNotes: string): Observable<AIEstimation> {
    return this.apiService.patch<AIEstimation>(`/ai-estimation/${estimationId}/reject`, {
      adminNotes
    });
  }

  /**
   * Retry AI estimation for a quotation (admin only)
   */
  retryEstimation(quotationId: string): Observable<any> {
    return this.apiService.post(`/ai-estimation/retry/${quotationId}`, {});
  }

  /**
   * Export estimation as PDF
   */
  exportPDF(quotationId: string): void {
    const url = `${this.apiService['baseUrl']}/ai-estimation/export/pdf/${quotationId}`;
    window.open(url, '_blank');
  }

  /**
   * Export estimation as Excel
   */
  exportExcel(quotationId: string): void {
    const url = `${this.apiService['baseUrl']}/ai-estimation/export/excel/${quotationId}`;
    window.open(url, '_blank');
  }
}
