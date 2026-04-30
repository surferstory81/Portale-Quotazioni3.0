import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl) => {
  const pw  = group.get('newPassword')?.value;
  const conf = group.get('confirmPassword')?.value;
  return pw && conf && pw !== conf ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  readonly form = new FormGroup(
    {
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,;:_\-+=^~#|])/),
        ],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordMatchValidator },
  );

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  tokenMissing = false;

  private token = '';

  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.tokenMissing = true;
    }
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.authService
      .resetPassword(this.token, this.form.getRawValue().newPassword)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.successMessage = 'Password reimpostata con successo. Puoi ora effettuare il login.';
          this.form.reset();
          setTimeout(() => void this.router.navigate(['/auth/login']), 3000);
        },
        error: (err: unknown) => {
          const e = err as { error?: { message?: string } };
          this.errorMessage =
            e?.error?.message ?? 'Il link non è valido o è scaduto. Richiedi un nuovo link.';
        },
      });
  }

  hasError(controlName: 'newPassword' | 'confirmPassword'): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  get mismatch(): boolean {
    return this.form.hasError('passwordMismatch') && this.form.controls.confirmPassword.touched;
  }
}
