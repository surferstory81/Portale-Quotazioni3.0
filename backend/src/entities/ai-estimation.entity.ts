import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Quotation } from './quotation.entity';

export enum AIStatus {
  AI_GENERATED = 'AI_GENERATED',
  AI_VALIDATED = 'AI_VALIDATED',
  AI_NEEDS_REVIEW = 'AI_NEEDS_REVIEW',
  AI_REJECTED = 'AI_REJECTED',
  HUMAN_APPROVED = 'HUMAN_APPROVED',
  HUMAN_REJECTED = 'HUMAN_REJECTED',
}

export interface EstimationData {
  quotation_id: string;
  estimation_version: string;
  generated_at: string;
  generated_by: string;
  confidence: string;
  confidence_score: number;
  summary: {
    total_capex: number;
    total_opex_year_1: number;
    total_first_year: number;
    total_5_years: number;
  };
  breakdown: {
    capex: Record<string, any>;
    opex_annual: Record<string, any>;
    opex_multi_year: Record<string, any>;
  };
  line_items: Array<{
    category: string;
    subcategory: string;
    description: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    total_cost: number;
    type: 'CAPEX' | 'OPEX';
    billing: string;
    source: string;
  }>;
  assumptions: string[];
  notes?: string[];
  flags?: Array<{
    type: string;
    message: string;
    impact: string;
  }>;
}

export interface ValidationData {
  validation_id: string;
  quotation_id: string;
  estimation_id: string;
  validated_at: string;
  validated_by: string;
  decision: 'APPROVE' | 'REVIEW' | 'SENIOR_REVIEW' | 'REJECT';
  confidence: number;
  recommendation: string;
  summary: {
    total_checks: number;
    passed: number;
    warnings: number;
    errors: number;
    info: number;
  };
  issues: Array<{
    id: string;
    type: 'ERROR' | 'WARNING' | 'INFO';
    category: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    impact?: string;
    recommendation?: string;
    line_item_ref?: string;
    estimated_savings?: string;
  }>;
  checks_passed: Array<{
    category: string;
    check: string;
    result: 'PASS';
  }>;
  metrics: {
    cost_per_vcpu?: number;
    cost_per_vcpu_typical?: number;
    cost_per_tb?: number;
    opex_capex_ratio?: number;
    services_infra_ratio?: number;
    qa_percentage?: number;
    total_cost_per_microservice?: number;
  };
  next_steps: {
    requires_human_review: boolean;
    recommended_reviewer: 'admin' | 'senior_admin';
    review_focus?: string[];
    estimated_review_time?: string;
  };
}

@Entity('ai_estimations')
export class AIEstimation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quotation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_id' })
  quotation: Quotation;

  @Column({ type: 'uuid', name: 'quotation_id' })
  quotationId: string;

  @Column({ type: 'jsonb', name: 'estimation_data' })
  estimationData: EstimationData;

  @Column({ type: 'jsonb', name: 'validation_data', nullable: true })
  validationData: ValidationData | null;

  @Column({
    type: 'enum',
    enum: AIStatus,
    name: 'ai_status',
    default: AIStatus.AI_GENERATED,
  })
  aiStatus: AIStatus;

  @Column({ type: 'varchar', length: 50, name: 'generated_by' })
  generatedBy: string;

  @Column({ type: 'varchar', length: 50, name: 'validated_by', nullable: true })
  validatedBy: string | null;

  @Column({ type: 'timestamp', name: 'generated_at' })
  generatedAt: Date;

  @Column({ type: 'timestamp', name: 'validated_at', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'timestamp', name: 'human_reviewed_at', nullable: true })
  humanReviewedAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'human_reviewer_id' })
  humanReviewer: User | null;

  @Column({ type: 'uuid', name: 'human_reviewer_id', nullable: true })
  humanReviewerId: string | null;

  @Column({ type: 'int', nullable: true })
  confidence: number | null;

  @Column({ type: 'text', name: 'admin_notes', nullable: true })
  adminNotes: string | null;

  @Column({ type: 'int', name: 'input_tokens', nullable: true, default: 0 })
  inputTokens: number | null;

  @Column({ type: 'int', name: 'output_tokens', nullable: true, default: 0 })
  outputTokens: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 6, name: 'estimated_cost_usd', nullable: true, default: 0 })
  estimatedCostUsd: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
