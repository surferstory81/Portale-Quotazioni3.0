import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

export interface AdminQuotation {
  id: string;
  projectCode: string;
  projectName: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  takenInChargeAt: string | null;
  createdBy: { id: string; email: string; matricola: string };
  assignedAdmin: { id: string; email: string; matricola: string } | null;
}

export interface AdminUser {
  id: string;
  matricola: string;
  email: string;
  isVerified: boolean;
  isBlocked: boolean;
  blockedAt: string | null;
  authProvider: string;
  createdAt: string;
  role: { name: string };
}

export interface SystemSettings {
  email_enabled: boolean;
  sso_enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly apiService: ApiService) {}

  // ─── Quotazioni ────────────────────────────────────────────

  getQuotations(): Observable<AdminQuotation[]> {
    return this.apiService.get<AdminQuotation[]>('/admin/quotations');
  }

  takeInCharge(id: string): Observable<AdminQuotation> {
    return this.apiService.post<AdminQuotation>(
      `/admin/quotations/${id}/take-in-charge`,
      {},
    );
  }

  updateStatus(id: string, status: string): Observable<AdminQuotation> {
    return this.apiService.patch<AdminQuotation>(
      `/admin/quotations/${id}/status`,
      { status },
    );
  }

  setEconomicQuotation(
    id: string,
    totalAmount: number,
  ): Observable<AdminQuotation> {
    return this.apiService.patch<AdminQuotation>(
      `/admin/quotations/${id}/economic-quotation`,
      { totalAmount },
    );
  }

  retryAiEstimation(quotationId: string): Observable<{ message: string; quotationId: string }> {
    return this.apiService.post<{ message: string; quotationId: string }>(
      `/ai-estimation/retry/${quotationId}`,
      {},
    );
  }

  // ─── Utenti ────────────────────────────────────────────────

  getUsers(): Observable<AdminUser[]> {
    return this.apiService.get<AdminUser[]>('/admin/users');
  }

  assignAdminRole(id: string, assignAdmin: boolean): Observable<AdminUser> {
    return this.apiService.patch<AdminUser>(`/admin/users/${id}/role`, {
      assignAdmin,
    });
  }

  blockUser(id: string, isBlocked: boolean): Observable<AdminUser> {
    return this.apiService.patch<AdminUser>(`/admin/users/${id}/block`, {
      isBlocked,
    });
  }

  resetUserPassword(
    id: string,
    newPassword: string,
  ): Observable<{ message: string }> {
    return this.apiService.patch<{ message: string }>(
      `/admin/users/${id}/reset-password`,
      { newPassword },
    );
  }

  verifyUserEmail(id: string): Observable<AdminUser> {
    return this.apiService.patch<AdminUser>(`/admin/users/${id}/verify-email`, {});
  }

  deleteUser(id: string): Observable<{ message: string }> {
    return this.apiService.delete<{ message: string }>(`/admin/users/${id}`);
  }

  // ─── Impostazioni ──────────────────────────────────────────

  getSystemSettings(): Observable<SystemSettings> {
    return this.apiService.get<SystemSettings>('/admin/settings');
  }

  setSystemSetting(key: string, value: boolean): Observable<SystemSettings> {
    return this.apiService.patch<SystemSettings>(`/admin/settings/${key}`, { value });
  }

  extractApiError(error: unknown): string {
    const err = error as { error?: { message?: string | string[] } };
    const message = err?.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
    return 'Operazione non completata. Riprova.';
  }
}
