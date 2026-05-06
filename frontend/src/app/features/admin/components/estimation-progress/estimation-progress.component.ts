import { Component, Input, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-estimation-progress',
  templateUrl: './estimation-progress.component.html',
  styleUrls: ['./estimation-progress.component.scss'],
})
export class EstimationProgressComponent implements OnInit, OnDestroy {
  @Input() quotationId: string = '';

  progress = 0;
  status = 'Inizializzazione...';
  private interval: any;

  private steps = [
    { progress: 10, status: 'Recupero dati quotazione...', duration: 2000 },
    { progress: 25, status: 'Analisi requisiti infrastrutturali...', duration: 8000 },
    { progress: 45, status: 'Generazione stima costi (Claude Sonnet 4.5)...', duration: 35000 },
    { progress: 70, status: 'Validazione stima AI...', duration: 25000 },
    { progress: 90, status: 'Finalizzazione report...', duration: 5000 },
    { progress: 100, status: 'Completato!', duration: 2000 },
  ];

  private currentStepIndex = 0;

  ngOnInit(): void {
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
