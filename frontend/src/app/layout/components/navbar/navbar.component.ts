import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../features/auth/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  get userEmail(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    return localStorage.getItem('userEmail') ?? '';
  }

  get userRole(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    return localStorage.getItem('userRole') ?? '';
  }

  get isAdmin(): boolean {
    return this.userRole === 'ADMIN';
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
