import { Injectable } from '@angular/core';
import { FormOption, QuotationFormSection } from '../models/quotation.models';

@Injectable({ providedIn: 'root' })
export class QuotationFormConfigService {

  // ── valori identici a quelli validati dal backend ──────────────────────
  private readonly projectDurationOptions = [
    '1–6 months',
    '7–12 months',
    '> 1 year',
    'multi-year',
  ];

  private readonly projectBudgetOptions = [
    'Up to 500',
    '500–1,000',
    '1,000–5,000',
    '> 5,000',
  ];

  private readonly yesNoOptions = ['NO', 'YES'];

  private readonly impactEntityOptions = [
    'Limited',
    'Moderate',
    'Considerable',
    'Substantial',
  ];

  private readonly technologicalImpactOptions = [
    'N/A',
    'Continuity with AS IS',
    'Technological evolution',
    'Technological change',
  ];

  private readonly projectTypeOptions = ['New', 'Evolution', 'CIF'];

  private readonly serviceRiskOptions = [
    'Minimal',
    'Moderate',
    'Relevant',
    'Radical',
  ];

  private readonly pipelineOptions = ['Max 10', '10–30', '30–60', '> 60'];

  private readonly monitoringOptions = ['N/A', 'Existing (no action)', 'YES'];

  private readonly testMagnitudeOptions = [
    'Up to 100',
    '100–1,000',
    '1,000–10,000',
    '>10,000',
  ];

  private readonly qaOptions = ['N/A', 'YES', 'NO'];

  // ── sezioni ────────────────────────────────────────────────────────────
  getSections(): QuotationFormSection[] {
    return [
      {
        title: 'Project Information',
        fields: [
          {
            key: 'projectCode',
            label: 'Project Code',
            type: 'text',
            required: true,
            minLength: 10,
            maxLength: 11,
            pattern: '^(PRJ[A-Za-z0-9]{7,8}|RPRJ[A-Za-z0-9]{6,7})$',
            errorMessage:
              'The code must start with PRJ or RPRJ, for a total of 10 or 11 alphanumeric characters.',
          },
          {
            key: 'projectName',
            label: 'Project Name',
            type: 'text',
            required: true,
            maxLength: 240,
            colspan: 2,
          },
          {
            key: 'projectStartDate',
            label: 'Project Start Date',
            type: 'date',
            required: true,
          },
          {
            key: 'projectEndDate',
            label: 'Project End Date',
            type: 'date',
            required: true,
          },
          {
            key: 'projectDuration',
            label: 'Project Duration',
            type: 'select',
            required: true,
            options: this.toOptions(this.projectDurationOptions),
          },
          {
            key: 'projectBudget',
            label: 'Project Budget (k€, VAT incl.)',
            type: 'select',
            required: true,
            options: this.toOptions(this.projectBudgetOptions),
          },
          {
            key: 'architecturalImpact',
            label: 'Architectural/Infrastructure Impact',
            type: 'select',
            required: true,
            options: this.toOptions(this.yesNoOptions),
          },
        ],
      },
      {
        title: 'Infrastructure',
        fields: [
          { key: 'cloudSaas',                  label: 'Cloud SaaS',                           type: 'checkbox' },
          { key: 'cloudIaasPaasLandingZoneCa', label: 'Cloud IaaS / PaaS (CA Landing Zone)',  type: 'checkbox' },
          { key: 'hostMainframe',              label: 'Host (Mainframe)',                      type: 'checkbox' },
          { key: 'onPremiseDipartimentale',    label: 'OnPremise (Departmental)',              type: 'checkbox' },
          { key: 'needNewInfrastructure',      label: 'Need for New Infrastructures',          type: 'checkbox' },
          { key: 'infraOnVm',                  label: 'Infrastructure on VM',                  type: 'checkbox' },
          { key: 'infraMicroservices',         label: 'Microservices-based Infrastructure',     type: 'checkbox' },
          {
            key: 'impactEntity',
            label: 'Impact Level',
            type: 'select',
            required: true,
            options: this.toOptions(this.impactEntityOptions),
          },
        ],
      },
      {
        title: 'Services and Technology',
        fields: [
          {
            key: 'serviceConsumer',
            label: 'Service Consumer',
            type: 'multiselect',
            required: true,
            colspan: 3,
            options: this.toOptions([
              'Central Directorate Users',
              'Branch Users',
              'Customers',
            ]),
          },
          {
            key: 'serviceVolumesPerDay',
            label: 'Service Volumes (No. of Users per Day)',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            key: 'technologicalImpact',
            label: 'Technological Impact',
            type: 'select',
            required: true,
            options: this.toOptions(this.technologicalImpactOptions),
          },
          { key: 'developedInternally',              label: 'Developed Internally',                     type: 'checkbox' },
          { key: 'developedByExternalVendors',       label: 'Developed Externally',                     type: 'checkbox' },
          { key: 'hasCaIntellectualProperty',        label: 'CA Intellectual Property of the Code',     type: 'checkbox' },
          { key: 'serviceExposure',                  label: 'Service Exposure',                         type: 'checkbox' },
          { key: 'marketProduct',                    label: 'Market Product',                           type: 'checkbox' },
          { key: 'dependenciesWithExternalServices', label: 'Dependencies with Outsourced Services',    type: 'checkbox' },
          { key: 'integrationsWithInternalSystems',  label: 'Integrations with Internal Systems',       type: 'checkbox' },
          { key: 'saasProduct',                      label: 'SaaS Product',                             type: 'checkbox' },
          { key: 'monitoringOrSecurityTool',         label: 'Monitoring/Security Tool',                 type: 'checkbox' },
          {
            key: 'expectedReleases',
            label: 'Expected Number of Releases',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            key: 'projectType',
            label: 'Project Type',
            type: 'select',
            required: true,
            options: this.toOptions(this.projectTypeOptions),
          },
          {
            key: 'serviceRisk',
            label: 'Service Risk',
            type: 'select',
            required: true,
            options: this.toOptions(this.serviceRiskOptions),
          },
          {
            key: 'pipeline',
            label: 'Pipeline',
            type: 'select',
            required: true,
            options: this.toOptions(this.pipelineOptions),
          },
          {
            key: 'microservicesCount',
            label: 'Number of Microservices',
            type: 'number',
            required: true,
            min: 0,
          },
        ],
      },
      {
        title: 'Operational Data',
        fields: [
          { key: 'hasDatabaseImpactDip',    label: 'Database Impact (Departmental)',             type: 'checkbox' },
          { key: 'hasSqlDbType',            label: 'SQL DB Type (Oracle/PostgreSQL/MS SQL)',     type: 'checkbox' },
          { key: 'hasDatabaseImpactHostDb2', label: 'Database Impact (Host/DB2)',                type: 'checkbox' },
          {
            key: 'storageGb',
            label: 'Storage Space (GB)',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            key: 'computeCores',
            label: 'Computing Power (cores)',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            key: 'scheduledBatches',
            label: 'No. of Scheduled Batches',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            key: 'monitoringSystems',
            label: 'Monitoring Systems',
            type: 'select',
            required: true,
            options: this.toOptions(this.monitoringOptions),
          },
          {
            key: 'observability',
            label: 'Observability',
            type: 'select',
            required: true,
            options: this.toOptions(this.monitoringOptions),
          },
          {
            key: 'testMagnitude',
            label: 'Test Magnitude (Governance test)',
            type: 'select',
            required: true,
            options: this.toOptions(this.testMagnitudeOptions),
          },
          {
            key: 'qa',
            label: 'QA',
            type: 'select',
            required: true,
            options: this.toOptions(this.qaOptions),
          },
        ],
      },
    ];
  }

  private toOptions(values: string[]): FormOption[] {
    return values.map((value) => ({ label: value, value }));
  }
}
