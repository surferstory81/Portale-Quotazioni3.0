import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LayoutModule } from '../../layout/layout.module';
import { NewQuotationComponent } from './pages/new-quotation/new-quotation.component';
import { QuotationStatusComponent } from './pages/quotation-status/quotation-status.component';
import { QuotationHistoryDetailComponent } from './pages/quotation-history-detail/quotation-history-detail.component';
import { AIEstimationViewerComponent } from './components/ai-estimation-viewer/ai-estimation-viewer.component';
import { MyDraftsComponent } from './pages/my-drafts/my-drafts.component';


@NgModule({
  declarations: [
    DashboardComponent,
    NewQuotationComponent,
    QuotationStatusComponent,
    QuotationHistoryDetailComponent,
    MyDraftsComponent
  ],
  imports: [
    CommonModule,
    LayoutModule,
    ReactiveFormsModule,
    DashboardRoutingModule,
    AIEstimationViewerComponent
  ]
})
export class DashboardModule { }
