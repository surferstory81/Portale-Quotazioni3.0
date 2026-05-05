export interface AIEstimationSummary {
  total_capex: number;
  total_opex_year_1: number;
  total_first_year: number;
  total_5_years: number;
  total_first_year_with_vat?: number;
  total_5_years_with_vat?: number;
  vat_rate?: number;
}

export interface CostBreakdown {
  capex: {
    professional_services?: any;
    software_licenses?: any;
    total_capex: number;
  };
  opex: {
    infrastructure?: any;
    software_subscriptions?: any;
    support_maintenance?: any;
    total_opex_year_1: number;
    total_opex_5_years: number;
  };
}

export interface LineItem {
  category: 'CAPEX' | 'OPEX';
  subcategory: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  total: number;
  annual_cost?: number;
  monthly_cost?: number;
  notes?: string;
  justification?: string;
}

export interface Recommendation {
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  potential_savings?: string;
  impact?: string;
}

export interface RiskNote {
  type: 'RISK' | 'ASSUMPTION' | 'NOTE' | 'OPTIMIZATION';
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  impact: string;
}

export interface ValidationData {
  summary: {
    total_checks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  decision: 'APPROVE' | 'REVIEW' | 'SENIOR_REVIEW' | 'REJECT' | 'AI_NEEDS_REVIEW';
  confidence: number;
  recommendation: string;
  validation_score: string;
}

export interface EstimationData {
  summary: AIEstimationSummary;
  breakdown: CostBreakdown;
  line_items: LineItem[];
  assumptions: string[];
  recommendations: Recommendation[];
  risks_and_notes?: RiskNote[];
  confidence_score: number;
  confidence_rationale?: string[];
  currency: string;
  project_code?: string;
  project_name?: string;
  quotation_id?: string;
}

export enum AIStatus {
  AI_GENERATED = 'AI_GENERATED',
  AI_VALIDATED = 'AI_VALIDATED',
  AI_NEEDS_REVIEW = 'AI_NEEDS_REVIEW',
  AI_REJECTED = 'AI_REJECTED',
  HUMAN_APPROVED = 'HUMAN_APPROVED',
  HUMAN_REJECTED = 'HUMAN_REJECTED'
}

export interface AIEstimation {
  id: string;
  quotationId: string;
  estimationData: EstimationData;
  validationData?: ValidationData;
  aiStatus: AIStatus;
  generatedBy: string;
  validatedBy?: string;
  generatedAt: string;
  validatedAt?: string;
  humanReviewedAt?: string;
  humanReviewerId?: string;
  confidence: number;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIEstimationStatistics {
  total: number;
  byStatus: Record<AIStatus, number>;
  averageConfidence: number;
}
