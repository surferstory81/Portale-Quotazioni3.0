import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import {
  CreateQuotationPayload,
  ListQuotationsFilters,
  Quotation,
  SaveDraftPayload,
} from '../models/quotation.models';

@Injectable({
  providedIn: 'root',
})
export class QuotationsService {
  constructor(private readonly apiService: ApiService) {}

  create(payload: CreateQuotationPayload): Observable<Quotation> {
    return this.apiService.post<Quotation>('/quotations', payload);
  }

  list(filters?: ListQuotationsFilters): Observable<Quotation[]> {
    const query: Record<string, string> = {
      projectCode: filters?.projectCode ?? '',
      projectName: filters?.projectName ?? '',
    };

    return this.apiService.get<Quotation[]>('/quotations', query);
  }

  completed(): Observable<Quotation[]> {
    return this.apiService.get<Quotation[]>('/quotations/completed');
  }

  getById(id: string): Observable<Quotation> {
    return this.list().pipe(
      map((quotations) => {
        const found = quotations.find((quotation) => quotation.id === id);

        if (!found) {
          throw new Error('Quotazione non trovata.');
        }

        return found;
      }),
    );
  }

  updateRejected(id: string, payload: CreateQuotationPayload): Observable<Quotation> {
    return this.apiService.patch<Quotation>(`/quotations/${id}`, payload);
  }

  // ─── DRAFT METHODS ─────────────────────────────────────

  saveDraft(payload: SaveDraftPayload): Observable<Quotation> {
    return this.apiService.post<Quotation>('/quotations/drafts', payload);
  }

  listDrafts(): Observable<Quotation[]> {
    return this.apiService.get<Quotation[]>('/quotations/drafts/list');
  }

  updateDraft(id: string, payload: SaveDraftPayload): Observable<Quotation> {
    return this.apiService.patch<Quotation>(`/quotations/drafts/${id}`, payload);
  }

  submitDraft(id: string): Observable<Quotation> {
    return this.apiService.post<Quotation>(`/quotations/drafts/${id}/submit`, {});
  }

  deleteDraft(id: string): Observable<{ message: string }> {
    return this.apiService.delete<{ message: string }>(`/quotations/drafts/${id}`);
  }

  extractApiError(error: unknown): string {
    const err = error as { error?: { message?: string | string[] } };
    const message = err?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }

    return 'Operazione non completata. Verifica i dati e riprova.';
  }
}
