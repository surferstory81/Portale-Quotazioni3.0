import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { QuotationsManagementComponent } from './quotations-management.component';
import { AdminService, AdminQuotation } from '../../services/admin.service';

class AdminServiceStub {
  getQuotations  = jasmine.createSpy('getQuotations').and.returnValue(of([]));
  takeInCharge   = jasmine.createSpy('takeInCharge');
  updateStatus   = jasmine.createSpy('updateStatus');
  setEconomicQuotation = jasmine.createSpy('setEconomicQuotation');
  extractApiError = jasmine.createSpy('extractApiError').and.returnValue('Errore');
}

const mockQ = (override: Partial<AdminQuotation> = {}): AdminQuotation => ({
  id: 'q1', projectCode: 'PRJ1234567', projectName: 'Test',
  status: 'INVIATA', totalAmount: 0,
  manualCapex: null, manualOpex: null, formData: {},
  createdAt: '2026-01-01', updatedAt: '2026-01-01', takenInChargeAt: null,
  createdBy: { id: 'u1', email: 'u@t.it', matricola: 'M01' },
  assignedAdmin: null, ...override,
});

describe('QuotationsManagementComponent', () => {
  let component: QuotationsManagementComponent;
  let fixture: ComponentFixture<QuotationsManagementComponent>;
  let adminStub: AdminServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [QuotationsManagementComponent],
      providers: [{ provide: AdminService, useClass: AdminServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(QuotationsManagementComponent);
    component = fixture.componentInstance;
    adminStub = TestBed.inject(AdminService) as unknown as AdminServiceStub;
    fixture.detectChanges();
  });

  it('deve essere creato', () => expect(component).toBeTruthy());

  it('carica le quotazioni all\'avvio', () => {
    expect(adminStub.getQuotations).toHaveBeenCalled();
  });

  describe('takeInCharge()', () => {
    it('chiama adminService.takeInCharge con l\'ID corretto', () => {
      adminStub.takeInCharge.and.returnValue(of(mockQ({ status: 'IN VALUTAZIONE' })));
      component.takeInCharge(mockQ());
      expect(adminStub.takeInCharge).toHaveBeenCalledWith('q1');
    });

    it('imposta successMessage dopo successo', () => {
      adminStub.takeInCharge.and.returnValue(of(mockQ({ status: 'IN VALUTAZIONE', projectCode: 'PRJ1234567' })));
      component.takeInCharge(mockQ());
      expect(component.successMessage).toContain('PRJ1234567');
    });

    it('imposta errorMessage in caso di errore', () => {
      adminStub.takeInCharge.and.returnValue(throwError(() => ({})));
      component.takeInCharge(mockQ());
      expect(component.errorMessage).toBeTruthy();
    });
  });

  describe('updateStatus()', () => {
    it('chiama adminService.updateStatus con ID e stato', () => {
      adminStub.updateStatus.and.returnValue(of(mockQ({ status: 'RESPINTA' })));
      const quotation = mockQ({ status: 'IN VALUTAZIONE' });
      const control = component.getStatusControl(quotation.id);
      control.setValue('RESPINTA');
      component.updateStatus(quotation);
      expect(adminStub.updateStatus).toHaveBeenCalledWith('q1', 'RESPINTA');
    });

    it('non chiama updateStatus se stato è vuoto', () => {
      const quotation = mockQ();
      const control = component.getStatusControl(quotation.id);
      control.setValue('');
      component.updateStatus(quotation);
      expect(adminStub.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('getEconomicForm()', () => {
    it('crea un FormGroup per l\'ID della quotazione', () => {
      const form = component.getEconomicForm('q1');
      expect(form).toBeDefined();
      expect(form.get('totalAmount')).toBeDefined();
    });

    it('restituisce sempre lo stesso form per lo stesso ID', () => {
      const form1 = component.getEconomicForm('q1');
      const form2 = component.getEconomicForm('q1');
      expect(form1).toBe(form2);
    });

    it('il form è invalido con valore negativo', () => {
      const form = component.getEconomicForm('q1');
      form.get('totalAmount')?.setValue(-1);
      expect(form.invalid).toBeTrue();
    });

    it('il form è valido con valore positivo', () => {
      const form = component.getEconomicForm('q1');
      form.get('totalAmount')?.setValue(5000);
      expect(form.valid).toBeTrue();
    });
  });

  describe('statusOptions', () => {
    it('contiene le 3 transizioni consentite', () => {
      expect(component.statusOptions).toContain('IN VALUTAZIONE');
      expect(component.statusOptions).toContain('COMPLETATA');
      expect(component.statusOptions).toContain('RESPINTA');
      expect(component.statusOptions.length).toBe(3);
    });
  });
});
