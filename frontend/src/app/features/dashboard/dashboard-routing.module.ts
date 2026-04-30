import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from '../../layout/components/main-layout/main-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NewQuotationComponent } from './pages/new-quotation/new-quotation.component';
import { QuotationStatusComponent } from './pages/quotation-status/quotation-status.component';
import { QuotationHistoryDetailComponent } from './pages/quotation-history-detail/quotation-history-detail.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'quotations/new', component: NewQuotationComponent },
      { path: 'quotations/status', component: QuotationStatusComponent },
      {
        path: 'quotations/history/:id',
        component: QuotationHistoryDetailComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
