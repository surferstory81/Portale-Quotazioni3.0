import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
})
export class LandingComponent implements OnInit, OnDestroy {
  showLogin = false;

  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  isSubmitting = false;
  errorMessage = '';

  images = [
    'assets/login-images/tech1.jpg',
    'assets/login-images/tech2.jpg',
    'assets/login-images/tech3.jpg',
    'assets/login-images/tech4.jpg',
    'assets/login-images/tech5.jpg',
    'assets/login-images/tech6.jpg',
    'assets/login-images/tech7.jpg',
  ];
  currentImageIndex = 0;
  private sliderInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.startSlider();
  }

  ngOnDestroy(): void {
    if (this.sliderInterval) clearInterval(this.sliderInterval);
  }

  startSlider(): void {
    this.sliderInterval = setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }, 4500);
  }

  openLogin(): void {
    this.showLogin = true;
    this.errorMessage = '';
    this.form.reset();
  }

  closeLogin(): void {
    this.showLogin = false;
    this.errorMessage = '';
    this.form.reset();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('login-modal')) {
      this.closeLogin();
    }
  }

  hasError(controlName: 'username' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  onSubmit(): void {
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          const destination = response.user.role === 'ADMIN' ? '/admin' : '/dashboard';
          void this.router.navigate([destination]);
        },
        error: (error: unknown) => {
          const err = error as { error?: { message?: string | string[] } };
          const msg = err?.error?.message;
          if (Array.isArray(msg)) this.errorMessage = msg.join(' ');
          else if (typeof msg === 'string') this.errorMessage = msg;
          else this.errorMessage = 'Autenticazione non riuscita. Riprova.';
        },
      });
  }
}
