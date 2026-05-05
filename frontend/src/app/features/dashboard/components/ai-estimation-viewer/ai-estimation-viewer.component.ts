import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIEstimation, AIStatus, LineItem } from '../../../../core/models/ai-estimation.model';
import { AIEstimationService } from '../../../../core/services/ai-estimation.service';

@Component({
  selector: 'app-ai-estimation-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-estimation-viewer.component.html',
  styleUrls: ['./ai-estimation-viewer.component.scss']
})
export class AIEstimationViewerComponent implements OnInit {
  @Input() estimation: AIEstimation | null = null;

  AIStatus = AIStatus;
  capexItems: LineItem[] = [];
  opexItems: LineItem[] = [];
  activeTab: 'summary' | 'breakdown' | 'items' | 'validation' = 'summary';

  constructor(private aiEstimationService: AIEstimationService) {}

  ngOnInit(): void {
    if (this.estimation?.estimationData?.line_items) {
      this.capexItems = this.estimation.estimationData.line_items.filter(
        item => item.category === 'CAPEX'
      );
      this.opexItems = this.estimation.estimationData.line_items.filter(
        item => item.category === 'OPEX'
      );
    }
  }

  getStatusClass(status: AIStatus): string {
    const statusClasses: Record<AIStatus, string> = {
      [AIStatus.AI_GENERATED]: 'status-generated',
      [AIStatus.AI_VALIDATED]: 'status-validated',
      [AIStatus.AI_NEEDS_REVIEW]: 'status-review',
      [AIStatus.AI_REJECTED]: 'status-rejected',
      [AIStatus.HUMAN_APPROVED]: 'status-approved',
      [AIStatus.HUMAN_REJECTED]: 'status-rejected'
    };
    return statusClasses[status] || 'status-default';
  }

  getStatusLabel(status: AIStatus): string {
    const statusLabels: Record<AIStatus, string> = {
      [AIStatus.AI_GENERATED]: 'Generata da AI',
      [AIStatus.AI_VALIDATED]: 'Validata da AI',
      [AIStatus.AI_NEEDS_REVIEW]: 'Richiede Revisione',
      [AIStatus.AI_REJECTED]: 'Respinta da AI',
      [AIStatus.HUMAN_APPROVED]: 'Approvata',
      [AIStatus.HUMAN_REJECTED]: 'Respinta'
    };
    return statusLabels[status] || status;
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 85) return 'confidence-high';
    if (confidence >= 70) return 'confidence-medium';
    return 'confidence-low';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  setActiveTab(tab: 'summary' | 'breakdown' | 'items' | 'validation'): void {
    this.activeTab = tab;
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  formatLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  exportPDF(): void {
    if (this.estimation?.quotationId) {
      this.aiEstimationService.exportPDF(this.estimation.quotationId);
    }
  }

  exportExcel(): void {
    if (this.estimation?.quotationId) {
      this.aiEstimationService.exportExcel(this.estimation.quotationId);
    }
  }
}
