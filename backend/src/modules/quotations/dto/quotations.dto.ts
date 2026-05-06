import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';


export const PROJECT_DURATION_OPTIONS = [
  '1–6 months',
  '7–12 months',
  '> 1 year',
  'multi-year',
] as const;


export const PROJECT_BUDGET_OPTIONS = [
  'Up to 500',
  '500–1,000',
  '1,000–5,000',
  '> 5,000',
] as const;

export const YES_NO_OPTIONS = ['NO', 'YES'] as const;
export const IMPACT_ENTITY_OPTIONS = [
  'Limited',
  'Moderate',
  'Considerable',
  'Substantial',
] as const;
export const TECHNOLOGICAL_IMPACT_OPTIONS = [
  'N/A',
  'Continuity with AS IS',
  'Technological evolution',
  'Technological change',
] as const;
export const PROJECT_TYPE_OPTIONS = ['New', 'Evolution', 'CIF'] as const;
export const SERVICE_RISK_OPTIONS = [
  'Minimal',
  'Moderate',
  'Relevant',
  'Radical',
] as const;
export const PIPELINE_OPTIONS = ['Max 10', '10–30', '30–60', '> 60'] as const;
export const MONITORING_OPTIONS = ['N/A', 'Existing (no action)', 'YES'] as const;
export const QA_OPTIONS = ['N/A', 'YES', 'NO'] as const;
export const TEST_MAGNITUDE_OPTIONS = [
  'Up to 100',
  '100–1,000',
  '1,000–10,000',
  '>10,000',
] as const;

export class CreateQuotationDto {
  @IsString({ message: 'Il codice progetto deve essere una stringa.' })
  @MinLength(10, { message: 'Il codice progetto deve avere almeno 10 caratteri.' })
  @MaxLength(11, { message: 'Il codice progetto non puo superare 11 caratteri.' })
  @Matches(/^(PRJ[A-Za-z0-9]{7,8}|RPRJ[A-Za-z0-9]{6,7})$/, {
    message:
      'Il codice deve iniziare con PRJ (10-11 car.) o RPRJ (10-11 car.) seguito da caratteri alfanumerici.',
  })
  projectCode: string;

  @IsString({ message: 'Il nome progetto deve essere una stringa.' })
  @MaxLength(240, { message: 'Il nome progetto non puo superare 120 caratteri.' })
  projectName: string;

  @IsDateString({}, { message: 'La data inizio progetto non e valida.' })
  projectStartDate: string;

  @IsDateString({}, { message: 'La data fine progetto non e valida.' })
  projectEndDate: string;

  @IsString()
  @IsIn(PROJECT_DURATION_OPTIONS, {
    message: 'Durata progettuale non valida.',
  })
  projectDuration: string;

  @IsString()
  @IsIn(PROJECT_BUDGET_OPTIONS, {
    message: 'Budget progettuale non valido.',
  })
  projectBudget: string;

  @IsString()
  @IsIn(YES_NO_OPTIONS, {
    message: 'Impatto architetturale/infrastrutturale non valido.',
  })
  architecturalImpact: string;

  @IsBoolean()
  cloudSaas: boolean;

  @IsBoolean()
  cloudIaasPaasLandingZoneCa: boolean;

  @IsBoolean()
  hostMainframe: boolean;

  @IsBoolean()
  onPremiseDipartimentale: boolean;

  @IsBoolean()
  needNewInfrastructure: boolean;

  @IsBoolean()
  infraOnVm: boolean;

  @IsBoolean()
  infraMicroservices: boolean;

  @IsString()
  @IsIn(IMPACT_ENTITY_OPTIONS, {
    message: 'Entita impatto non valida.',
  })
  impactEntity: string;

  @IsString()
  @MaxLength(255)
  serviceConsumer: string;

  @IsInt({ message: 'Volumi servizio deve essere un numero intero.' })
  @Min(0, { message: 'Volumi servizio non puo essere negativo.' })
  serviceVolumesPerDay: number;

  @IsString()
  @IsIn(TECHNOLOGICAL_IMPACT_OPTIONS, {
    message: 'Impatto tecnologico non valido.',
  })
  technologicalImpact: string;

  @IsBoolean()
  developedInternally: boolean;

  @IsBoolean()
  developedByExternalVendors: boolean;

  @IsBoolean()
  hasCaIntellectualProperty: boolean;

  @IsBoolean()
  serviceExposure: boolean;

  @IsBoolean()
  marketProduct: boolean;

  @IsBoolean()
  dependenciesWithExternalServices: boolean;

  @IsBoolean()
  integrationsWithInternalSystems: boolean;

  @IsBoolean()
  saasProduct: boolean;

  @IsBoolean()
  monitoringOrSecurityTool: boolean;

  @IsInt({ message: 'Numero release previste deve essere un intero.' })
  @Min(0, { message: 'Numero release previste non puo essere negativo.' })
  expectedReleases: number;

  @IsString()
  @IsIn(PROJECT_TYPE_OPTIONS, {
    message: 'Valore progetto nuovo/evolutiva/CIF non valido.',
  })
  projectType: string;

  @IsString()
  @IsIn(SERVICE_RISK_OPTIONS, {
    message: 'Rischio sul servizio non valido.',
  })
  serviceRisk: string;

  @IsString()
  @IsIn(PIPELINE_OPTIONS, { message: 'Pipeline non valida.' })
  pipeline: string;

  @IsInt({ message: 'Numero microservizi deve essere un intero.' })
  @Min(0, { message: 'Numero microservizi non puo essere negativo.' })
  microservicesCount: number;

  @IsBoolean()
  hasDatabaseImpactDip: boolean;

  @IsBoolean()
  hasSqlDbType: boolean;

  @IsBoolean()
  hasDatabaseImpactHostDb2: boolean;

  @IsInt({ message: 'Spazio storage deve essere un intero.' })
  @Min(0, { message: 'Spazio storage non puo essere negativo.' })
  storageGb: number;

  @IsInt({ message: 'Potenza di calcolo deve essere un intero.' })
  @Min(0, { message: 'Potenza di calcolo non puo essere negativa.' })
  computeCores: number;

  @IsInt({ message: 'Numero batch schedulazioni deve essere un intero.' })
  @Min(0, { message: 'Numero batch schedulazioni non puo essere negativo.' })
  scheduledBatches: number;

  @IsString()
  @IsIn(MONITORING_OPTIONS, { message: 'Sistemi di monitoraggio non validi.' })
  monitoringSystems: string;

  @IsString()
  @IsIn(MONITORING_OPTIONS, { message: 'Observability non valida.' })
  observability: string;

  @IsString()
  @IsIn(TEST_MAGNITUDE_OPTIONS, {
    message: 'Magnitudo test non valida.',
  })
  testMagnitude: string;

  @IsString()
  @IsIn(QA_OPTIONS, { message: 'Valore QA non valido.' })
  qa: string;
}

export class UpdateQuotationDto extends CreateQuotationDto {}

export class SaveDraftDto {
  @IsOptional()
  @IsString({ message: 'Il codice progetto deve essere una stringa.' })
  @MinLength(10, { message: 'Il codice progetto deve avere almeno 10 caratteri.' })
  @MaxLength(11, { message: 'Il codice progetto non puo superare 11 caratteri.' })
  projectCode?: string;

  @IsOptional()
  @IsString({ message: 'Il nome progetto deve essere una stringa.' })
  @MaxLength(240, { message: 'Il nome progetto non puo superare 120 caratteri.' })
  projectName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La data inizio progetto non e valida.' })
  projectStartDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La data fine progetto non e valida.' })
  projectEndDate?: string;

  @IsOptional()
  @IsString()
  @IsIn(PROJECT_DURATION_OPTIONS)
  projectDuration?: string;

  @IsOptional()
  @IsString()
  @IsIn(PROJECT_BUDGET_OPTIONS)
  projectBudget?: string;

  @IsOptional()
  @IsString()
  @IsIn(YES_NO_OPTIONS)
  architecturalImpact?: string;

  @IsOptional()
  @IsBoolean()
  cloudSaas?: boolean;

  @IsOptional()
  @IsBoolean()
  cloudIaasPaasLandingZoneCa?: boolean;

  @IsOptional()
  @IsBoolean()
  hostMainframe?: boolean;

  @IsOptional()
  @IsBoolean()
  onPremiseDipartimentale?: boolean;

  @IsOptional()
  @IsBoolean()
  needNewInfrastructure?: boolean;

  @IsOptional()
  @IsBoolean()
  infraOnVm?: boolean;

  @IsOptional()
  @IsBoolean()
  infraMicroservices?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(IMPACT_ENTITY_OPTIONS)
  impactEntity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  serviceConsumer?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  serviceVolumesPerDay?: number;

  @IsOptional()
  @IsString()
  @IsIn(TECHNOLOGICAL_IMPACT_OPTIONS)
  technologicalImpact?: string;

  @IsOptional()
  @IsBoolean()
  developedInternally?: boolean;

  @IsOptional()
  @IsBoolean()
  developedByExternalVendors?: boolean;

  @IsOptional()
  @IsBoolean()
  hasCaIntellectualProperty?: boolean;

  @IsOptional()
  @IsBoolean()
  serviceExposure?: boolean;

  @IsOptional()
  @IsBoolean()
  marketProduct?: boolean;

  @IsOptional()
  @IsBoolean()
  dependenciesWithExternalServices?: boolean;

  @IsOptional()
  @IsBoolean()
  integrationsWithInternalSystems?: boolean;

  @IsOptional()
  @IsBoolean()
  saasProduct?: boolean;

  @IsOptional()
  @IsBoolean()
  monitoringOrSecurityTool?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedReleases?: number;

  @IsOptional()
  @IsString()
  @IsIn(PROJECT_TYPE_OPTIONS)
  projectType?: string;

  @IsOptional()
  @IsString()
  @IsIn(SERVICE_RISK_OPTIONS)
  serviceRisk?: string;

  @IsOptional()
  @IsString()
  @IsIn(PIPELINE_OPTIONS)
  pipeline?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  microservicesCount?: number;

  @IsOptional()
  @IsBoolean()
  hasDatabaseImpactDip?: boolean;

  @IsOptional()
  @IsBoolean()
  hasSqlDbType?: boolean;

  @IsOptional()
  @IsBoolean()
  hasDatabaseImpactHostDb2?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  storageGb?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  computeCores?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  scheduledBatches?: number;

  @IsOptional()
  @IsString()
  @IsIn(MONITORING_OPTIONS)
  monitoringSystems?: string;

  @IsOptional()
  @IsString()
  @IsIn(MONITORING_OPTIONS)
  observability?: string;

  @IsOptional()
  @IsString()
  @IsIn(TEST_MAGNITUDE_OPTIONS)
  testMagnitude?: string;

  @IsOptional()
  @IsString()
  @IsIn(QA_OPTIONS)
  qa?: string;
}

export class ListQuotationsQueryDto {
  @IsOptional()
  @IsString({ message: 'Filtro codice progetto non valido.' })
  projectCode?: string;

  @IsOptional()
  @IsString({ message: 'Filtro nome progetto non valido.' })
  projectName?: string;
}
