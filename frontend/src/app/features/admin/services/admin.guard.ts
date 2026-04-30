import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  canActivate(): boolean {
    // Semplice controllo: ruolo admin in localStorage
    const isAdmin = localStorage.getItem('userRole') === 'ADMIN';
    if (!isAdmin) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
}
