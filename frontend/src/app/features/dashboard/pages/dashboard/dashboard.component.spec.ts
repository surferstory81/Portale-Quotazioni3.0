import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CommonModule } from '@angular/common';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { QuotationsService } from '../../services/quotations.service';

class QuotationsServiceStub {
  list = jasmine.createSpy('list').and.returnValue(of([]));
}

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let quotationsStub: QuotationsServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, CommonModule],
      declarations: [DashboardComponent],
      providers: [{ provide: QuotationsService, useClass: QuotationsServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    quotationsStub = TestBed.inject(QuotationsService) as unknown as QuotationsServiceStub;
    fixture.detectChanges();
  });

  it('deve essere creato', () => {
    expect(component).toBeTruthy();
  });

  it('carica le quotazioni all\'inizializzazione', () => {
    expect(quotationsStub.list).toHaveBeenCalled();
  });

  it('countInviata è 0 con lista vuota', () => {
    expect(component.countInviata).toBe(0);
  });

  it('countCompletata conta le quotazioni COMPLETATA', () => {
    quotationsStub.list.and.returnValue(of([
      { status: 'COMPLETATA' } as any,
      { status: 'COMPLETATA' } as any,
      { status: 'INVIATA' } as any,
    ]));
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.countCompletata).toBe(2);
  });

  it('recentQuotations restituisce massimo 5 elementi', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      status: 'INVIATA', updatedAt: new Date(2026, 0, i + 1).toISOString(),
    })) as any[];
    quotationsStub.list.and.returnValue(of(many));
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.recentQuotations.length).toBeLessThanOrEqual(5);
  });

  it('badgeClass restituisce la classe corretta per ogni stato', () => {
    expect(component.badgeClass('INVIATA')).toBe('badge--inviata');
    expect(component.badgeClass('IN VALUTAZIONE')).toBe('badge--in-valutazione');
    expect(component.badgeClass('COMPLETATA')).toBe('badge--completata');
    expect(component.badgeClass('RESPINTA')).toBe('badge--respinta');
    expect(component.badgeClass('SCONOSCIUTO')).toBe('badge--default');
  });
});
