import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { Quotation } from '../../models/quotation.models';
import { QuotationsService } from '../../services/quotations.service';
import { AIEstimationService } from '../../../../core/services/ai-estimation.service';
import { AIEstimation } from '../../../../core/models/ai-estimation.model';

@Component({
  selector: 'app-quotation-history-detail',
  templateUrl: './quotation-history-detail.component.html',
  styleUrl: './quotation-history-detail.component.scss',
})
export class QuotationHistoryDetailComponent implements OnInit {
  quotation: Quotation | null = null;
  aiEstimation: AIEstimation | null = null;
  isLoading = false;
  isLoadingAI = false;
  errorMessage = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly quotationsService: QuotationsService,
    private readonly aiEstimationService: AIEstimationService,
  ) {}

  ngOnInit(): void {
    const quotationId = this.route.snapshot.paramMap.get('id');

    if (!quotationId) {
      this.errorMessage = 'ID quotazione mancante.';
      return;
    }

    this.loadQuotation(quotationId);
  }

  private loadQuotation(quotationId: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.quotationsService
      .getById(quotationId)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (quotation) => {
          this.quotation = quotation;
          this.loadAIEstimation(quotationId);
        },
        error: (error: unknown) => {
          this.errorMessage = this.quotationsService.extractApiError(error);
        },
      });
  }

  private loadAIEstimation(quotationId: string): void {
    this.isLoadingAI = true;

    this.aiEstimationService
      .getEstimationByQuotationId(quotationId)
      .pipe(finalize(() => (this.isLoadingAI = false)))
      .subscribe({
        next: (estimation) => {
          this.aiEstimation = estimation;
        },
        error: () => {
          // Silently fail if no AI estimation exists
          this.aiEstimation = null;
        },
      });
  }

  getFieldLabel(key: string): string {
    const labels: Record<string, string> = {
      projectCode: 'Codice Progetto',
      projectName: 'Nome Progetto',
      projectStartDate: 'Data Inizio Progetto',
      projectEndDate: 'Data Fine Progetto',
      projectDuration: 'Durata Progetto',
      projectBudget: 'Budget Progetto',
      architecturalImpact: 'Impatto Architetturale',
      cloudSaas: 'Cloud SaaS',
      cloudIaasPaasLandingZoneCa: 'Cloud IaaS/PaaS Landing Zone CA',
      hostMainframe: 'Host Mainframe',
      onPremiseDipartimentale: 'On-Premise Dipartimentale',
      needNewInfrastructure: 'Necessita Nuova Infrastruttura',
      infraOnVm: 'Infrastruttura su VM',
      infraMicroservices: 'Infrastruttura Microservizi',
      impactEntity: 'Entità Impatto',
      serviceConsumer: 'Consumatore Servizio',
      serviceVolumesPerDay: 'Volumi Servizio al Giorno',
      technologicalImpact: 'Impatto Tecnologico',
      developedInternally: 'Sviluppato Internamente',
      developedByExternalVendors: 'Sviluppato da Fornitori Esterni',
      hasCaIntellectualProperty: 'Ha Proprietà Intellettuale CA',
      serviceExposure: 'Esposizione Servizio',
      marketProduct: 'Prodotto di Mercato',
      dependenciesWithExternalServices: 'Dipendenze con Servizi Esterni',
      integrationsWithInternalSystems: 'Integrazioni con Sistemi Interni',
      saasProduct: 'Prodotto SaaS',
      monitoringOrSecurityTool: 'Tool Monitoraggio/Sicurezza',
      expectedReleases: 'Release Previste',
      projectType: 'Tipo Progetto',
      serviceRisk: 'Rischio Servizio',
      pipeline: 'Pipeline',
      microservicesCount: 'Numero Microservizi',
      hasDatabaseImpactDip: 'Impatto Database DIP',
      hasSqlDbType: 'Tipo Database SQL',
      hasDatabaseImpactHostDb2: 'Impatto Database Host DB2',
      storageGb: 'Storage (GB)',
      computeCores: 'Core Computazionali',
      scheduledBatches: 'Batch Schedulati',
      monitoringSystems: 'Sistemi di Monitoraggio',
      observability: 'Osservabilità',
      testMagnitude: 'Magnitudo Test',
      qa: 'QA',
    };
    return labels[key] || key;
  }

  formatFieldValue(value: any): string {
    if (typeof value === 'boolean') {
      return value ? 'Sì' : 'No';
    }
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return String(value);
  }
}
