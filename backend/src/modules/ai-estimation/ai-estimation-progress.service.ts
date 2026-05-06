import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface ProgressEvent {
  quotationId: string;
  status: 'started' | 'fetching-quotation' | 'generating-estimation' | 'validating' | 'completed' | 'error';
  message: string;
  progress: number; // 0-100
  timestamp: string;
}

@Injectable()
export class AIEstimationProgressService {
  private progressSubjects = new Map<string, Subject<ProgressEvent>>();

  getProgressObservable(quotationId: string): Observable<ProgressEvent> {
    if (!this.progressSubjects.has(quotationId)) {
      this.progressSubjects.set(quotationId, new Subject<ProgressEvent>());
    }
    return this.progressSubjects.get(quotationId)!.asObservable();
  }

  emitProgress(event: ProgressEvent): void {
    const subject = this.progressSubjects.get(event.quotationId);
    if (subject) {
      subject.next(event);
    }
  }

  completeProgress(quotationId: string): void {
    const subject = this.progressSubjects.get(quotationId);
    if (subject) {
      subject.complete();
      this.progressSubjects.delete(quotationId);
    }
  }

  errorProgress(quotationId: string, error: string): void {
    const subject = this.progressSubjects.get(quotationId);
    if (subject) {
      subject.next({
        quotationId,
        status: 'error',
        message: error,
        progress: 0,
        timestamp: new Date().toISOString(),
      });
      subject.complete();
      this.progressSubjects.delete(quotationId);
    }
  }
}
