import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from '../../layout/components/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { UsersManagementComponent } from './pages/users-management/users-management.component';
import { QuotationsManagementComponent } from './pages/quotations-management/quotations-management.component';
import { AdminSettingsComponent } from './pages/admin-settings/admin-settings.component';
import { AdminGuard } from './services/admin.guard';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'users', component: UsersManagementComponent },
      { path: 'quotations', component: QuotationsManagementComponent },
      { path: 'settings', component: AdminSettingsComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
