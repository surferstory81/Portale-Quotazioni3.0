import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService, AdminUser } from '../../services/admin.service';

@Component({
  selector: 'app-users-management',
  templateUrl: './users-management.component.html',
  styleUrls: ['./users-management.component.scss'],
})
export class UsersManagementComponent implements OnInit {
  users: AdminUser[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  resetPasswordForms: Record<string, FormGroup> = {};
  resetPasswordLoading: Record<string, boolean> = {};
  resetPasswordMessages: Record<string, string> = {};

  actionLoading: Record<string, boolean> = {};

  constructor(private readonly adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  toggleBlock(user: AdminUser): void {
    this.clearMessages();
    this.actionLoading[user.id] = true;
    this.adminService
      .blockUser(user.id, !user.isBlocked)
      .pipe(finalize(() => (this.actionLoading[user.id] = false)))
      .subscribe({
        next: (updated) => {
          this.applyUserUpdate(updated);
          this.successMessage = user.isBlocked
            ? `Utente ${user.email} sbloccato.`
            : `Utente ${user.email} bloccato.`;
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  toggleAdminRole(user: AdminUser): void {
    this.clearMessages();
    const promote = user.role.name !== 'ADMIN';
    this.actionLoading[user.id] = true;
    this.adminService
      .assignAdminRole(user.id, promote)
      .pipe(finalize(() => (this.actionLoading[user.id] = false)))
      .subscribe({
        next: (updated) => {
          this.applyUserUpdate(updated);
          this.successMessage = promote
            ? `${user.email} promosso ad ADMIN.`
            : `${user.email} retrocesso a USER.`;
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  verifyEmail(user: AdminUser): void {
    this.clearMessages();
    this.actionLoading[user.id] = true;
    this.adminService
      .verifyUserEmail(user.id)
      .pipe(finalize(() => (this.actionLoading[user.id] = false)))
      .subscribe({
        next: (updated) => {
          this.applyUserUpdate(updated);
          this.successMessage = `Email di ${user.email} verificata manualmente.`;
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  deleteUser(user: AdminUser): void {
    if (!confirm(`Eliminare definitivamente l'utente ${user.email}? L'operazione non è reversibile.`)) {
      return;
    }
    this.clearMessages();
    this.actionLoading[user.id] = true;
    this.adminService
      .deleteUser(user.id)
      .pipe(finalize(() => (this.actionLoading[user.id] = false)))
      .subscribe({
        next: (res) => {
          this.users = this.users.filter((u) => u.id !== user.id);
          this.successMessage = res.message;
        },
        error: (err: unknown) => {
          this.errorMessage = this.adminService.extractApiError(err);
        },
      });
  }

  getResetForm(userId: string): FormGroup {
    if (!this.resetPasswordForms[userId]) {
      this.resetPasswordForms[userId] = new FormGroup({
        newPassword: new FormControl('', [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.,;:_\-+=^~#|])/),
        ]),
      });
    }
    return this.resetPasswordForms[userId];
  }

  submitResetPassword(user: AdminUser): void {
    const form = this.getResetForm(user.id);
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const newPassword = (form.value as { newPassword: string }).newPassword;
    this.resetPasswordLoading[user.id] = true;
    this.resetPasswordMessages[user.id] = '';

    this.adminService
      .resetUserPassword(user.id, newPassword)
      .pipe(finalize(() => (this.resetPasswordLoading[user.id] = false)))
      .subscribe({
        next: () => {
          this.resetPasswordMessages[user.id] = 'Password reimpostata.';
          form.reset();
        },
        error: (err: unknown) => {
          this.resetPasswordMessages[user.id] = this.adminService.extractApiError(err);
        },
      });
  }

  trackById(_: number, user: AdminUser): string {
    return user.id;
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.adminService.getUsers().pipe(finalize(() => (this.isLoading = false))).subscribe({
      next: (data) => (this.users = data),
      error: (err: unknown) => (this.errorMessage = this.adminService.extractApiError(err)),
    });
  }

  private applyUserUpdate(updated: AdminUser): void {
    const idx = this.users.findIndex((u) => u.id === updated.id);
    if (idx !== -1) this.users[idx] = updated;
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
