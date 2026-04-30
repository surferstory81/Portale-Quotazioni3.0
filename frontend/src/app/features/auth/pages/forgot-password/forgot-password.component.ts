import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  constructor(private readonly authService: AuthService) {}

  onSubmit(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.authService
      .forgotPassword(this.form.getRawValue().email)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.successMessage =
            'Se l\'indirizzo è registrato, riceverai un\'email con le istruzioni per reimpostare la password.';
          this.form.reset();
        },
        error: () => {
          // Stesso messaggio per non rivelare se l'email esiste
          this.successMessage =
            'Se l\'indirizzo è registrato, riceverai un\'email con le istruzioni per reimpostare la password.';
        },
      });
  }

  hasError(controlName: 'email'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }
}
