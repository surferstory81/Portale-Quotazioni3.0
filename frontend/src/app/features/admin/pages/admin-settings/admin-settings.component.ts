import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';
import { AdminService, SystemSettings } from '../../services/admin.service';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.scss'],
})
export class AdminSettingsComponent implements OnInit {
  settings: SystemSettings | null = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  toggleLoading: Record<string, boolean> = {};

  constructor(private readonly adminService: AdminService) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  toggle(key: keyof SystemSettings): void {
    if (!this.settings) return;
    const newValue = !this.settings[key];
    this.clearMessages();
    this.toggleLoading[key] = true;

    this.adminService
      .setSystemSetting(key, newValue)
      .pipe(finalize(() => (this.toggleLoading[key] = false)))
      .subscribe({
        next: (updated) => {
          this.settings = updated;
          this.successMessage = `Impostazione aggiornata.`;
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  private loadSettings(): void {
    this.isLoading = true;
    this.adminService
      .getSystemSettings()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => (this.settings = data),
        error: (err: unknown) => (this.errorMessage = this.adminService.extractApiError(err)),
      });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
