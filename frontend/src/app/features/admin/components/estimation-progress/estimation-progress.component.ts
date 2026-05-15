import { Component, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-estimation-progress',
  templateUrl: './estimation-progress.component.html',
  styleUrls: ['./estimation-progress.component.scss'],
})
export class EstimationProgressComponent implements OnInit, OnDestroy {
  @Input() quotationId: string = '';
  @Input() modelId: string = 'claude-sonnet-4-5';

  progress = 0;
  status = 'Inizializzazione...';
  private interval: any;
  private steps: Array<{ progress: number; status: string; duration: number }> = [];

  private currentStepIndex = 0;

  private getModelDisplayName(modelId: string): string {
    const modelNames: Record<string, string> = {
      'claude-sonnet-4-5': 'Claude Sonnet 4.5',
      'claude-opus-4-7': 'Claude Opus 4.7',
      'claude-haiku-4-5': 'Claude Haiku 4.5',
    };
    return modelNames[modelId] || 'Claude Sonnet 4.5';
  }

  ngOnInit(): void {
    // Initialize steps with correct model name
    const modelName = this.getModelDisplayName(this.modelId);
    this.steps = [
      { progress: 10, status: 'Recupero dati quotazione...', duration: 2000 },
      { progress: 25, status: 'Analisi requisiti infrastrutturali...', duration: 8000 },
      { progress: 45, status: `Generazione stima costi (${modelName})...`, duration: 35000 },
      { progress: 70, status: 'Validazione stima AI...', duration: 25000 },
      { progress: 90, status: 'Finalizzazione report...', duration: 5000 },
      { progress: 100, status: 'Completato!', duration: 2000 },
    ];
    this.simulateProgress();
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearTimeout(this.interval);
    }
  }

  private simulateProgress(): void {
    if (this.currentStepIndex >= this.steps.length) {
      return;
    }

    const step = this.steps[this.currentStepIndex];
    this.progress = step.progress;
    this.status = step.status;

    this.interval = setTimeout(() => {
      this.currentStepIndex++;
      this.simulateProgress();
    }, step.duration);
  }
}
