import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  isSubmitting = false;
  errorMessage = '';

  // resend verification
  showResend = false;
  isResending = false;
  resendMessage = '';

  // immagini dinamiche login
  images = [
    'assets/login-images/tech1.jpg',
    'assets/login-images/tech2.jpg',
    'assets/login-images/tech3.jpg',
  ];
  currentImageIndex = 0;
  private sliderInterval: any;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.startSlider();
  }

  ngOnDestroy(): void {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
  }

  startSlider(): void {
    this.sliderInterval = setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
    }, 4500);
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.showResend = false;
    this.resendMessage = '';

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
          const msg = this.extractApiError(error);
          this.errorMessage = msg;
          // Mostra il pulsante di reinvio se l'email non è stata verificata
          if (msg.toLowerCase().includes('non verificata') || msg.toLowerCase().includes('verifica')) {
            this.showResend = true;
          }
        },
      });
  }

  onResendVerification(): void {
    this.resendMessage = '';
    this.isResending = true;
    const email = this.form.controls.email.value;

    this.authService
      .resendVerification(email)
      .pipe(finalize(() => (this.isResending = false)))
      .subscribe({
        next: () => {
          this.resendMessage = 'Email di verifica inviata. Controlla la tua casella di posta.';
          this.showResend = false;
          this.errorMessage = '';
        },
        error: () => {
          this.resendMessage = 'Email di verifica inviata. Controlla la tua casella di posta.';
          this.showResend = false;
          this.errorMessage = '';
        },
      });
  }

  hasError(controlName: 'email' | 'password'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  private extractApiError(error: unknown): string {
    const err = error as { error?: { message?: string | string[] } };
    const message = err?.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string') return message;
    return 'Autenticazione non riuscita. Riprova.';
  }
}

