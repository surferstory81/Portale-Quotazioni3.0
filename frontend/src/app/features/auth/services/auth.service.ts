import { Injectable } from '@angular/core';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, tap, switchMap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface LoginPayload {
  username: string;
  password: string;
}

interface RegisterPayload {
  matricola: string;
  email: string;
  password: string;
}

interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    matricola: string;
    role: string;
  };
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private readonly apiService: ApiService,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  login(payload: LoginPayload): Observable<AuthTokensResponse> {
    return this.apiService
      .post<AuthTokensResponse>('/auth/login', payload)
      .pipe(tap((response) => this.persistAuth(response)));
  }

  register(payload: RegisterPayload): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>('/auth/register', payload);
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>('/auth/forgot-password', { email });
  }

  resendVerification(email: string): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>('/auth/resend-verification', { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.apiService.post<{ message: string }>('/auth/reset-password', { token, newPassword });
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
  }

  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return Boolean(localStorage.getItem('accessToken'));
  }

  private persistAuth(response: AuthTokensResponse): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('userRole', response.user.role);
    localStorage.setItem('userEmail', response.user.email);
  }

  refreshToken(): Observable<void> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Not in browser');
    }
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    return this.apiService
      .post<RefreshTokenResponse>('/auth/refresh', { refreshToken })
      .pipe(
        tap((response) => {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
        }),
        // Map to void to satisfy Observable<void>
        switchMap(() => []),
      );
  }

  hasRefreshToken(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return Boolean(localStorage.getItem('refreshToken'));
  }

  attachAuthHeader(req: import('@angular/common/http').HttpRequest<any>): import('@angular/common/http').HttpRequest<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return req;
    }
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      return req;
    }
    return req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }
}
