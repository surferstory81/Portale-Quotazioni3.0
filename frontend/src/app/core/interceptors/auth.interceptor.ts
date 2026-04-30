import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private pendingRequests: Array<() => void> = [];

  constructor(private readonly authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          this.authService.hasRefreshToken()
        ) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            return this.authService.refreshToken().pipe(
              switchMap(() => {
                this.isRefreshing = false;
                this.pendingRequests.forEach((cb) => cb());
                this.pendingRequests = [];
                // Retry original request with new token
                const cloned = this.authService.attachAuthHeader(req);
                return next.handle(cloned);
              }),
              catchError((refreshError) => {
                this.isRefreshing = false;
                this.authService.logout();
                return throwError(() => refreshError);
              })
            );
          } else {
            // Queue requests while refreshing
            return new Observable<HttpEvent<any>>((observer) => {
              this.pendingRequests.push(() => {
                const cloned = this.authService.attachAuthHeader(req);
                next.handle(cloned).subscribe({
                  next: (event) => observer.next(event),
                  error: (err) => observer.error(err),
                  complete: () => observer.complete(),
                });
              });
            });
          }
        }
        return throwError(() => error);
      })
    );
  }
}
