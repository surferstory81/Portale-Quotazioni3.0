import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  state: 'loading' | 'success' | 'error' | 'missing' = 'loading';
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly apiService: ApiService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state = 'missing';
      return;
    }

    this.apiService
      .get<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .pipe(finalize(() => {}))
      .subscribe({
        next: () => {
          this.state = 'success';
          setTimeout(() => void this.router.navigate(['/auth/login']), 4000);
        },
        error: (err: unknown) => {
          const e = err as { error?: { message?: string } };
          this.errorMessage = e?.error?.message ?? 'Il link non è valido o è scaduto.';
          this.state = 'error';
        },
      });
  }

  goToLogin(): void {
    void this.router.navigate(['/auth/login']);
  }
}
