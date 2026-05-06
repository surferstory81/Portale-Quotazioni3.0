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
  projectCode: string;
  projectName: string;
  projectStartDate: string;
  projectEndDate: string;
  projectDuration: string;
  projectBudget: string;
  architecturalImpact: string;
  cloudSaas: boolean;
  cloudIaasPaasLandingZoneCa: boolean;
  hostMainframe: boolean;
  onPremiseDipartimentale: boolean;
  needNewInfrastructure: boolean;
  infraOnVm: boolean;
  infraMicroservices: boolean;
  impactEntity: string;
  serviceConsumer: string;
  serviceVolumesPerDay: number;
  technologicalImpact: string;
  developedInternally: boolean;
  developedByExternalVendors: boolean;
  hasCaIntellectualProperty: boolean;
  serviceExposure: boolean;
  marketProduct: boolean;
  dependenciesWithExternalServices: boolean;
  integrationsWithInternalSystems: boolean;
  saasProduct: boolean;
  monitoringOrSecurityTool: boolean;
  expectedReleases: number;
  projectType: string;
  serviceRisk: string;
  pipeline: string;
  microservicesCount: number;
  hasDatabaseImpactDip: boolean;
  hasSqlDbType: boolean;
  hasDatabaseImpactHostDb2: boolean;
  storageGb: number;
  computeCores: number;
  scheduledBatches: number;
  monitoringSystems: string;
  observability: string;
  testMagnitude: string;
  qa: string;
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
