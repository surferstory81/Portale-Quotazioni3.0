import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminService, AdminQuotation } from '../../services/admin.service';

class AdminServiceStub {
  getQuotations = jasmine.createSpy('getQuotations').and.returnValue(of([]));
  extractApiError = jasmine.createSpy('extractApiError').and.returnValue('Errore');
}

const q = (status: string, override: Partial<AdminQuotation> = {}): AdminQuotation => ({
  id: Math.random().toString(36), projectCode: 'PRJ1234567',
  projectName: 'Test', status, totalAmount: 0,
  createdAt: '2026-01-01', updatedAt: '2026-01-01', takenInChargeAt: null,
  createdBy: { id: 'u1', email: 'u@t.it', matricola: 'M01' },
  assignedAdmin: null, ...override,
});

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let adminStub: AdminServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule],
      declarations: [AdminDashboardComponent],
      providers: [{ provide: AdminService, useClass: AdminServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    adminStub = TestBed.inject(AdminService) as unknown as AdminServiceStub;
    fixture.detectChanges();
  });

  it('deve essere creato', () => expect(component).toBeTruthy());

  it('carica le quotazioni all\'avvio', () => {
    expect(adminStub.getQuotations).toHaveBeenCalled();
  });

  it('count() conta per stato', () => {
    adminStub.getQuotations.and.returnValue(of([
      q('INVIATA'), q('INVIATA'), q('IN VALUTAZIONE'), q('COMPLETATA'),
    ]));
    component.ngOnInit();
    expect(component.count('INVIATA')).toBe(2);
    expect(component.count('IN VALUTAZIONE')).toBe(1);
    expect(component.count('COMPLETATA')).toBe(1);
    expect(component.count('RESPINTA')).toBe(0);
  });

  it('recentQuotations restituisce al massimo 10', () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      q('INVIATA', { id: String(i), createdAt: new Date(2026, 0, i + 1).toISOString() }),
    );
    adminStub.getQuotations.and.returnValue(of(many));
    component.ngOnInit();
    expect(component.recentQuotations.length).toBeLessThanOrEqual(10);
  });

  it('recentQuotations è ordinato per data discendente', () => {
    adminStub.getQuotations.and.returnValue(of([
      q('INVIATA', { id: 'a', createdAt: '2026-01-01' }),
      q('INVIATA', { id: 'b', createdAt: '2026-06-01' }),
    ]));
    component.ngOnInit();
    expect(component.recentQuotations[0].id).toBe('b');
  });

  it('badgeClass restituisce classe corretta', () => {
    expect(component.badgeClass('INVIATA')).toBe('badge--inviata');
    expect(component.badgeClass('IN VALUTAZIONE')).toBe('badge--in-valutazione');
    expect(component.badgeClass('COMPLETATA')).toBe('badge--completata');
    expect(component.badgeClass('RESPINTA')).toBe('badge--respinta');
    expect(component.badgeClass('ALTRO')).toBe('badge--default');
  });

  it('imposta errorMessage in caso di errore API', () => {
    adminStub.getQuotations.and.returnValue(throwError(() => ({})));
    component.ngOnInit();
    expect(component.errorMessage).toBeTruthy();
  });
});
