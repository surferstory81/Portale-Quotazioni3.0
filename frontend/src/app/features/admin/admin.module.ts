import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { LayoutModule } from '../../layout/layout.module';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { UsersManagementComponent } from './pages/users-management/users-management.component';
import { QuotationsManagementComponent } from './pages/quotations-management/quotations-management.component';
import { AdminSettingsComponent } from './pages/admin-settings/admin-settings.component';
import { AdminGuard } from './services/admin.guard';

@NgModule({
  declarations: [
    AdminDashboardComponent,
    UsersManagementComponent,
    QuotationsManagementComponent,
    AdminSettingsComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LayoutModule, AdminRoutingModule],
  providers: [AdminGuard],
})
export class AdminModule {}
