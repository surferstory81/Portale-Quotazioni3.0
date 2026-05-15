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

  private readonly pipelineOptions = ['< 5', '5–15', '15–40', '> 40'];

  private readonly monitoringOptions = ['N/A', 'Existing (no action)', 'YES'];

  private readonly qaOptions = ['N/A', 'YES', 'NO'];

  // ── sezioni ────────────────────────────────────────────────────────────
  getSections(): QuotationFormSection[] {
    return [
      // ═══════════════════════════════════════════════════════════════════
      // 1. PROJECT INFORMATION
      // ═══════════════════════════════════════════════════════════════════
      {
        title: '1. Project Information',
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
            key: 'architecturalImpact',
            label: 'Architectural/Infrastructure Impact',
            type: 'select',
            required: true,
            options: this.toOptions(this.yesNoOptions),
          },
        ],
      },

      // ═══════════════════════════════════════════════════════════════════
      // 2. APPLICATION CHARACTERISTICS
      // ═══════════════════════════════════════════════════════════════════
      {
        title: '2. Application Characteristics',
        fields: [
          { key: 'isThirdPartyApp',                  label: 'Third-Party Application',                  type: 'checkbox' },
          { key: 'isAppliance',                      label: 'Appliance / Hardware Device',              type: 'checkbox' },
          { key: 'developedInternally',              label: 'Developed Internally',                     type: 'checkbox' },
          { key: 'developedByExternalVendors',       label: 'Developed Externally',                     type: 'checkbox' },
          { key: 'hasCaIntellectualProperty',        label: 'CA Intellectual Property of the Code',     type: 'checkbox' },
          { key: 'serviceExposure',                  label: 'Service Exposure',                         type: 'checkbox' },
          { key: 'marketProduct',                    label: 'Market Product',                           type: 'checkbox' },
          { key: 'saasProduct',                      label: 'SaaS Product',                             type: 'checkbox' },
          { key: 'monitoringOrSecurityTool',         label: 'Monitoring/Security Tool',                 type: 'checkbox' },
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
          {
            key: 'impactEntity',
            label: 'Impact Level',
            type: 'select',
            required: true,
            options: this.toOptions(this.impactEntityOptions),
          },
        ],
      },

      // ═══════════════════════════════════════════════════════════════════
      // 3. INFRASTRUCTURE & COMPUTE
      // ═══════════════════════════════════════════════════════════════════
      {
        title: '3. Infrastructure & Compute',
        fields: [
          { key: 'cloudSaas',                  label: 'Cloud SaaS',                           type: 'checkbox' },
          { key: 'cloudIaasPaasLandingZoneCa', label: 'Cloud IaaS / PaaS (CA Landing Zone)',  type: 'checkbox' },
          { key: 'hostMainframe',              label: 'Host (Mainframe)',                      type: 'checkbox' },
          { key: 'onPremiseDipartimentale',    label: 'OnPremise (Departmental)',              type: 'checkbox' },
          { key: 'needNewInfrastructure',      label: 'Need for New Infrastructures',          type: 'checkbox' },
          { key: 'infraOnVm',                  label: 'Infrastructure on VM',                  type: 'checkbox' },
          { key: 'infraMicroservices',         label: 'Microservices-based Infrastructure',     type: 'checkbox' },
          {
            key: 'computeCores',
            label: 'Computing Power (cores)',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            key: 'storageGb',
            label: 'Storage Space (GB)',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            key: 'microservicesCount',
            label: 'Number of Microservices',
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
        ],
      },

      // ═══════════════════════════════════════════════════════════════════
      // 4. DATABASE & DATA
      // ═══════════════════════════════════════════════════════════════════
      {
        title: '4. Database & Data',
        fields: [
          { key: 'hasDatabaseImpactDip',    label: 'Database Impact (DIP - Oracle Exadata)',     type: 'checkbox' },
          { key: 'hasSqlDbType',            label: 'MS SQL Server Database',                      type: 'checkbox' },
          { key: 'dedicatedSqlCluster',     label: 'Dedicated SQL Server Cluster (if SQL)',       type: 'checkbox' },
          { key: 'hasPostgresDatabase',     label: 'PostgreSQL Database',                         type: 'checkbox' },
          { key: 'hasMongoDatabase',        label: 'MongoDB Database',                            type: 'checkbox' },
          { key: 'hasDatabaseImpactHostDb2', label: 'Database Impact (Host/DB2 Mainframe)',      type: 'checkbox' },
        ],
      },

      // ═══════════════════════════════════════════════════════════════════
      // 5. MONITORING & DEVOPS
      // ═══════════════════════════════════════════════════════════════════
      {
        title: '5. Monitoring & DevOps',
        fields: [
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
            key: 'pipeline',
            label: 'CI/CD Pipelines',
            type: 'select',
            required: true,
            options: this.toOptions(this.pipelineOptions),
          },
          { key: 'hasExistingPipelines',             label: 'Has Existing CI/CD Pipelines (Reusable)', type: 'checkbox' },
          {
            key: 'expectedReleases',
            label: 'Expected Number of Releases',
            type: 'number',
            required: true,
            min: 0,
          },
          { key: 'dependenciesWithExternalServices', label: 'Dependencies with External Services',    type: 'checkbox' },
          { key: 'integrationsWithInternalSystems',  label: 'Integrations with Internal Systems',       type: 'checkbox' },
          {
            key: 'qa',
            label: 'QA',
            type: 'select',
            required: true,
            options: this.toOptions(this.qaOptions),
          },
          { key: 'requiresFeasibilityStudy',         label: 'Requires Infrastructure Feasibility Study (CTO Support)', type: 'checkbox' },
          { key: 'requiresRfcSupport',               label: 'Requires RFC Support & Infrastructure Implementation',    type: 'checkbox' },
        ],
      },
    ];
  }

  private toOptions(values: string[]): FormOption[] {
    return values.map((value) => ({ label: value, value }));
  }
}
