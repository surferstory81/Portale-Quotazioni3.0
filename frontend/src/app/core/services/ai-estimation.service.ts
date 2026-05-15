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
   * Get all estimations for a quotation (for model comparison, admin only)
   */
  getAllEstimationsByQuotationId(quotationId: string): Observable<AIEstimation[]> {
    return this.apiService.get<AIEstimation[]>(`/ai-estimation/quotation/${quotationId}/all`);
  }

  /**
   * Retry AI estimation with a specific model (admin only)
   */
  retryEstimationWithModel(quotationId: string, modelId: string): Observable<any> {
    return this.apiService.post(`/ai-estimation/retry/${quotationId}/model/${modelId}`, {});
  }

  /**
   * Export estimation as PDF
   */
  exportPDF(quotationId: string): void {
    const token = localStorage.getItem('access_token');
    const url = `${this.apiService['baseUrl']}/ai-estimation/export/pdf/${quotationId}`;

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Download failed');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stima-ai-${quotationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch(error => {
      console.error('Failed to download PDF:', error);
      alert('Errore nel download del PDF. Verifica che esista una stima AI per questa quotazione.');
    });
  }

  /**
   * Export estimation as Excel
   */
  exportExcel(quotationId: string): void {
    const token = localStorage.getItem('access_token');
    const url = `${this.apiService['baseUrl']}/ai-estimation/export/excel/${quotationId}`;

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Download failed');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stima-ai-${quotationId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch(error => {
      console.error('Failed to download Excel:', error);
      alert('Errore nel download del file Excel. Verifica che esista una stima AI per questa quotazione.');
    });
  }
}
