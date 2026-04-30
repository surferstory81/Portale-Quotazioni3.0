import { TestBed } from '@angular/core/testing';
import { QuotationFormConfigService } from './quotation-form-config.service';

describe('QuotationFormConfigService', () => {
  let service: QuotationFormConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [QuotationFormConfigService] });
    service = TestBed.inject(QuotationFormConfigService);
  });

  it('deve essere creato', () => {
    expect(service).toBeTruthy();
  });

  describe('getSections()', () => {
    let sections: ReturnType<typeof service.getSections>;

    beforeEach(() => { sections = service.getSections(); });

    it('restituisce esattamente 4 sezioni', () => {
      expect(sections.length).toBe(4);
    });

    it('la prima sezione è "Anagrafica progetto"', () => {
      expect(sections[0].title).toBe('Anagrafica progetto');
    });

    it('la seconda sezione è "Infrastruttura"', () => {
      expect(sections[1].title).toBe('Infrastruttura');
    });

    it('la terza sezione è "Servizi e tecnologia"', () => {
      expect(sections[2].title).toBe('Servizi e tecnologia');
    });

    it('la quarta sezione è "Dati operativi"', () => {
      expect(sections[3].title).toBe('Dati operativi');
    });
  });

  // ── projectCode ────────────────────────────────────────────────────────────

  describe('campo projectCode', () => {
    let field: ReturnType<typeof service.getSections>[0]['fields'][0];

    beforeEach(() => {
      field = service.getSections()[0].fields.find(f => f.key === 'projectCode')!;
    });

    it('è presente nella sezione "Anagrafica progetto"', () => {
      expect(field).toBeDefined();
    });

    it('è obbligatorio', () => {
      expect(field.required).toBeTrue();
    });

    it('ha minLength pari a 10', () => {
      expect(field.minLength).toBe(10);
    });

    it('ha maxLength pari a 11', () => {
      expect(field.maxLength).toBe(11);
    });

    it('ha un pattern definito', () => {
      expect(field.pattern).toBeDefined();
    });

    it('il pattern accetta PRJ + 7 char alfanumerici', () => {
      expect(new RegExp(field.pattern!).test('PRJ1234567')).toBeTrue();
    });

    it('il pattern accetta RPRJ + 6 char alfanumerici', () => {
      expect(new RegExp(field.pattern!).test('RPRJ123456')).toBeTrue();
    });

    it('il pattern rifiuta meno di 10 caratteri', () => {
      expect(new RegExp(field.pattern!).test('PRJ12345')).toBeFalse();
    });

    it('il pattern rifiuta codice senza prefisso PRJ/RPRJ', () => {
      expect(new RegExp(field.pattern!).test('XYZ1234567')).toBeFalse();
    });
  });

  // ── serviceConsumer ────────────────────────────────────────────────────────

  describe('campo serviceConsumer', () => {
    let field: ReturnType<typeof service.getSections>[0]['fields'][0];

    beforeEach(() => {
      field = service.getSections()[2].fields.find(f => f.key === 'serviceConsumer')!;
    });

    it('è di tipo multiselect', () => {
      expect(field.type).toBe('multiselect');
    });

    it('è obbligatorio', () => {
      expect(field.required).toBeTrue();
    });

    it('ha esattamente 3 opzioni', () => {
      expect(field.options?.length).toBe(3);
    });

    it('contiene "Utenti Direzione Centrale"', () => {
      expect(field.options?.map(o => o.value)).toContain('Utenti Direzione Centrale');
    });

    it('contiene "Utenti Rete"', () => {
      expect(field.options?.map(o => o.value)).toContain('Utenti Rete');
    });

    it('contiene "Clienti"', () => {
      expect(field.options?.map(o => o.value)).toContain('Clienti');
    });
  });

  // ── campi data ─────────────────────────────────────────────────────────────

  describe('campi data', () => {
    it('projectStartDate è di tipo date e obbligatorio', () => {
      const f = service.getSections()[0].fields.find(f => f.key === 'projectStartDate')!;
      expect(f.type).toBe('date');
      expect(f.required).toBeTrue();
    });

    it('projectEndDate è di tipo date e obbligatorio', () => {
      const f = service.getSections()[0].fields.find(f => f.key === 'projectEndDate')!;
      expect(f.type).toBe('date');
      expect(f.required).toBeTrue();
    });
  });

  // ── campi numerici ─────────────────────────────────────────────────────────

  describe('campi numerici', () => {
    const campiNum = ['serviceVolumesPerDay', 'expectedReleases', 'microservicesCount', 'storageGb', 'computeCores', 'scheduledBatches'];

    campiNum.forEach(key => {
      it(`${key} ha min >= 0`, () => {
        const all = service.getSections().flatMap(s => s.fields);
        const f = all.find(x => x.key === key)!;
        expect(f).toBeDefined();
        expect(f.type).toBe('number');
        expect(f.min).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ── select con opzioni ─────────────────────────────────────────────────────

  describe('campi select', () => {
    const selectFields = ['projectDuration', 'projectBudget', 'architecturalImpact', 'impactEntity', 'technologicalImpact', 'projectType', 'serviceRisk', 'pipeline', 'monitoringSystems', 'observability', 'testMagnitude', 'qa'];

    selectFields.forEach(key => {
      it(`${key} è di tipo select con almeno un'opzione`, () => {
        const all = service.getSections().flatMap(s => s.fields);
        const f = all.find(x => x.key === key)!;
        expect(f).toBeDefined();
        expect(f.type).toBe('select');
        expect((f.options?.length ?? 0)).toBeGreaterThan(0);
      });
    });
  });

  // ── checkbox ───────────────────────────────────────────────────────────────

  describe('campi checkbox', () => {
    it('cloudSaas è di tipo checkbox', () => {
      const f = service.getSections()[1].fields.find(x => x.key === 'cloudSaas')!;
      expect(f.type).toBe('checkbox');
    });

    it('developedInternally è di tipo checkbox', () => {
      const f = service.getSections()[2].fields.find(x => x.key === 'developedInternally')!;
      expect(f.type).toBe('checkbox');
    });
  });
});
