import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NewQuotationComponent } from './new-quotation.component';
import { QuotationFormConfigService } from '../../services/quotation-form-config.service';
import { QuotationsService } from '../../services/quotations.service';
import { CommonModule } from '@angular/common';

// ── stubs ─────────────────────────────────────────────────────────────────────

class QuotationsServiceStub {
  create = jasmine.createSpy('create');
  extractApiError = jasmine.createSpy('extractApiError').and.returnValue('Errore generico');
}

const routerStub = { navigate: jasmine.createSpy('navigate') };

// ── helper ────────────────────────────────────────────────────────────────────

const fillRequiredFields = (component: NewQuotationComponent) => {
  const form = component.form;
  form.patchValue({
    projectCode: 'PRJ1234567',
    projectName: 'Test Project',
    projectStartDate: '2026-01-01',
    projectEndDate: '2026-12-31',
    projectDuration: '> 1 anno',
    projectBudget: '1.000 – 5.000',
    architecturalImpact: 'SI',
    impactEntity: 'Moderato',
    serviceConsumer: ['Clienti'],
    serviceVolumesPerDay: 100,
    technologicalImpact: 'NA',
    expectedReleases: 1,
    projectType: 'Nuovo',
    serviceRisk: 'Minimo',
    pipeline: 'Max 10',
    microservicesCount: 0,
    storageGb: 0,
    computeCores: 0,
    scheduledBatches: 0,
    monitoringSystems: 'NA',
    observability: 'NA',
    testMagnitude: 'Fino a 100',
    qa: 'NA',
  });
};

// ── suite ─────────────────────────────────────────────────────────────────────

describe('NewQuotationComponent', () => {
  let component: NewQuotationComponent;
  let fixture: ComponentFixture<NewQuotationComponent>;
  let quotationsStub: QuotationsServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CommonModule],
      declarations: [NewQuotationComponent],
      providers: [
        QuotationFormConfigService,
        { provide: QuotationsService, useClass: QuotationsServiceStub },
        { provide: Router, useValue: routerStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewQuotationComponent);
    component = fixture.componentInstance;
    quotationsStub = TestBed.inject(QuotationsService) as unknown as QuotationsServiceStub;
    fixture.detectChanges();
    routerStub.navigate.calls.reset();
  });

  it('deve essere creato', () => {
    expect(component).toBeTruthy();
  });

  // ── struttura form ─────────────────────────────────────────────────────────

  describe('struttura del form', () => {
    it('contiene il controllo projectCode', () => {
      expect(component.form.get('projectCode')).toBeTruthy();
    });

    it('contiene il controllo serviceConsumer con valore iniziale array', () => {
      expect(Array.isArray(component.form.get('serviceConsumer')?.value)).toBeTrue();
    });

    it('i controlli checkbox hanno valore iniziale false', () => {
      expect(component.form.get('cloudSaas')?.value).toBeFalse();
      expect(component.form.get('developedInternally')?.value).toBeFalse();
    });

    it('i controlli numerici hanno valore iniziale stringa vuota', () => {
      expect(component.form.get('storageGb')?.value).toBe('');
    });
  });

  // ── validazione projectCode ────────────────────────────────────────────────

  describe('validazione projectCode', () => {
    let ctrl: ReturnType<typeof component.form.get>;

    beforeEach(() => { ctrl = component.form.get('projectCode'); });

    it('è invalido se vuoto', () => {
      ctrl?.setValue('');
      ctrl?.markAsTouched();
      expect(ctrl?.valid).toBeFalse();
    });

    it('è invalido con meno di 10 caratteri', () => {
      ctrl?.setValue('PRJ12345');
      ctrl?.markAsTouched();
      expect(ctrl?.valid).toBeFalse();
    });

    it('è valido con PRJ + 7 char', () => {
      ctrl?.setValue('PRJ1234567');
      ctrl?.markAsTouched();
      expect(ctrl?.valid).toBeTrue();
    });

    it('è valido con RPRJ + 6 char', () => {
      ctrl?.setValue('RPRJ123456');
      ctrl?.markAsTouched();
      expect(ctrl?.valid).toBeTrue();
    });

    it('è invalido senza prefisso PRJ/RPRJ', () => {
      ctrl?.setValue('XYZ1234567');
      ctrl?.markAsTouched();
      expect(ctrl?.valid).toBeFalse();
    });
  });

  // ── validazione date ───────────────────────────────────────────────────────

  describe('validazione date', () => {
    it('il form è invalido se endDate < startDate', () => {
      component.form.patchValue({ projectStartDate: '2026-12-31', projectEndDate: '2026-01-01' });
      component.form.updateValueAndValidity();
      expect(component.form.get('projectEndDate')?.errors).toBeTruthy();
    });

    it('il form è valido se endDate === startDate', () => {
      fillRequiredFields(component);
      component.form.patchValue({ projectStartDate: '2026-06-01', projectEndDate: '2026-06-01' });
      component.form.get('projectEndDate')?.markAsTouched();
      expect(component.form.get('projectEndDate')?.errors?.['endDateBeforeStartDate']).toBeFalsy();
    });
  });

  // ── normalizePayload ───────────────────────────────────────────────────────

  describe('normalizzazione payload prima dell\'invio', () => {
    it('invia i campi numerici come Number, non come stringa', () => {
      quotationsStub.create.and.returnValue(of({ id: 'q1', status: 'INVIATA' }));
      fillRequiredFields(component);
      component.form.patchValue({ storageGb: '42' });

      component.onSubmit();

      const payload = quotationsStub.create.calls.mostRecent()?.args?.[0];
      expect(typeof payload?.storageGb).toBe('number');
      expect(payload?.storageGb).toBe(42);
    });

    it('non sovrascrive i numeri convertiti con stringhe trimmate', () => {
      quotationsStub.create.and.returnValue(of({ id: 'q1', status: 'INVIATA' }));
      fillRequiredFields(component);
      component.form.patchValue({ computeCores: '8' });

      component.onSubmit();

      const payload = quotationsStub.create.calls.mostRecent()?.args?.[0];
      expect(typeof payload?.computeCores).toBe('number');
      expect(payload?.computeCores).toBe(8);
    });

    it('unisce array multiselect con ", " prima dell\'invio', () => {
      quotationsStub.create.and.returnValue(of({ id: 'q1', status: 'INVIATA' }));
      fillRequiredFields(component);
      component.form.patchValue({ serviceConsumer: ['Clienti', 'Utenti Rete'] });

      component.onSubmit();

      const payload = quotationsStub.create.calls.mostRecent()?.args?.[0];
      expect(payload?.serviceConsumer).toBe('Clienti, Utenti Rete');
    });

    it('rimuove spazi superflui dai campi testo', () => {
      quotationsStub.create.and.returnValue(of({ id: 'q1', status: 'INVIATA' }));
      fillRequiredFields(component);
      component.form.patchValue({ projectName: '  Test con spazi  ' });

      component.onSubmit();

      const payload = quotationsStub.create.calls.mostRecent()?.args?.[0];
      expect(payload?.projectName).toBe('Test con spazi');
    });
  });

  // ── onSubmit ───────────────────────────────────────────────────────────────

  describe('onSubmit()', () => {
    it('non chiama create se il form è invalido', () => {
      component.form.patchValue({ projectCode: '' });
      component.onSubmit();
      expect(quotationsStub.create).not.toHaveBeenCalled();
    });

    it('marca tutti i campi come touched se il form è invalido', () => {
      component.form.patchValue({ projectCode: '' });
      component.onSubmit();
      expect(component.form.get('projectCode')?.touched).toBeTrue();
    });

    it('naviga a /status dopo submit riuscito', () => {
      quotationsStub.create.and.returnValue(of({ id: 'q1', status: 'INVIATA' }));
      fillRequiredFields(component);

      component.onSubmit();

      expect(routerStub.navigate).toHaveBeenCalledWith(['/dashboard/quotations/status']);
    });

    it('mostra errorMessage dopo submit fallito', () => {
      quotationsStub.create.and.returnValue(throwError(() => ({ error: { message: 'Server error' } })));
      quotationsStub.extractApiError.and.returnValue('Server error');
      fillRequiredFields(component);

      component.onSubmit();

      expect(component.errorMessage).toBeTruthy();
    });

    it('non naviga dopo submit fallito', () => {
      quotationsStub.create.and.returnValue(throwError(() => ({ error: {} })));
      fillRequiredFields(component);

      component.onSubmit();

      expect(routerStub.navigate).not.toHaveBeenCalled();
    });
  });

  // ── metodi helper ─────────────────────────────────────────────────────────

  describe('metodi helper', () => {
    it('asCheckbox() restituisce true solo per checkbox', () => {
      const checkboxField = component.sections.flatMap(s => s.fields).find(f => f.type === 'checkbox')!;
      const textField = component.sections.flatMap(s => s.fields).find(f => f.type === 'text')!;
      expect(component.asCheckbox(checkboxField)).toBeTrue();
      expect(component.asCheckbox(textField)).toBeFalse();
    });

    it('asMultiselect() restituisce true solo per multiselect', () => {
      const msField = component.sections.flatMap(s => s.fields).find(f => f.type === 'multiselect')!;
      const textField = component.sections.flatMap(s => s.fields).find(f => f.type === 'text')!;
      expect(component.asMultiselect(msField)).toBeTrue();
      expect(component.asMultiselect(textField)).toBeFalse();
    });

    it('colspanClass() restituisce "field--full" per colspan 3', () => {
      const f = component.sections.flatMap(s => s.fields).find(f => f.colspan === 3)!;
      if (f) expect(component.colspanClass(f)).toBe('field--full');
    });

    it('hasNonCheckbox() restituisce true se ci sono campi non-checkbox', () => {
      const section = component.sections[0];
      expect(component.hasNonCheckbox(section.fields)).toBeTrue();
    });

    it('hasCheckbox() restituisce true per sezioni con checkbox', () => {
      const infraSection = component.sections.find(s => s.title === 'Infrastruttura')!;
      expect(component.hasCheckbox(infraSection.fields)).toBeTrue();
    });
  });
});
