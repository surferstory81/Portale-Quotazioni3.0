export interface Quotation {
  id: string;
  projectCode: string;
  projectName: string;
  title: string;
  description: string;
  status: string;
  totalAmount: number;
  formData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ListQuotationsFilters {
  projectCode?: string;
  projectName?: string;
}

export interface CreateQuotationPayload {
  // Project Information
  projectCode: string;
  projectName: string;
  projectStartDate: string;
  projectEndDate: string;
  projectDuration: string;
  projectBudget: string;
  projectType: string; // 'New' | 'Evolution' | 'CIF'
  serviceRisk: string;
  architecturalImpact: string;

  // Application Characteristics
  isThirdPartyApp: boolean;
  isAppliance: boolean;
  developedInternally: boolean;
  developedByExternalVendors: boolean;
  hasCaIntellectualProperty: boolean;
  serviceExposure: boolean;
  marketProduct: boolean;
  saasProduct: boolean;
  monitoringOrSecurityTool: boolean;
  serviceConsumer: string;
  serviceVolumesPerDay: number;
  technologicalImpact: string;
  impactEntity: string;

  // Infrastructure & Compute
  cloudSaas: boolean;
  cloudIaasPaasLandingZoneCa: boolean;
  hostMainframe: boolean;
  onPremiseDipartimentale: boolean;
  needNewInfrastructure: boolean;
  infraOnVm: boolean;
  infraMicroservices: boolean;
  computeCores: number;
  storageGb: number;
  microservicesCount: number;
  scheduledBatches: number;

  // Database & Data
  hasDatabaseImpactDip: boolean;
  hasSqlDbType: boolean;
  hasDatabaseImpactHostDb2: boolean;
  hasPostgresDatabase: boolean;
  hasMongoDatabase: boolean;
  dedicatedSqlCluster: boolean;

  // Monitoring & DevOps
  monitoringSystems: string;
  observability: string;
  pipeline: string;
  hasExistingPipelines: boolean;
  expectedReleases: number;
  dependenciesWithExternalServices: boolean;
  integrationsWithInternalSystems: boolean;
  qa: string;
  requiresFeasibilityStudy: boolean;
  requiresRfcSupport: boolean;
}

export type SaveDraftPayload = Partial<CreateQuotationPayload>;

export type FieldType = 'text' | 'date' | 'select' | 'multiselect' | 'number' | 'checkbox';

export interface FormOption {
  label: string;
  value: string;
}

export interface QuotationFormField {
  key: keyof CreateQuotationPayload;
  label: string;
  type: FieldType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  pattern?: string;
  errorMessage?: string;
  options?: FormOption[];
  colspan?: 1 | 2 | 3;
}

export interface QuotationFormSection {
  title: string;
  fields: QuotationFormField[];
}
