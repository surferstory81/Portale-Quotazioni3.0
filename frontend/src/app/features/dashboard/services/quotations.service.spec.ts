import { TestBed } from '@angular/core/testing';
import { QuotationsService } from './quotations.service';
import { ApiService } from '../../../core/services/api.service';
import { of, throwError } from 'rxjs';
import { CreateQuotationPayload, Quotation } from '../models/quotation.models';

class ApiServiceStub {
  post = jasmine.createSpy('post');
  get = jasmine.createSpy('get');
  patch = jasmine.createSpy('patch');
}

const mockQuotation = (override: Partial<Quotation> = {}): Quotation => ({
  id: 'q1',
  projectCode: 'PRJ1234567',
  projectName: 'Test',
  title: 'Test',
  description: '',
  status: 'INVIATA',
  totalAmount: 0,
  formData: {},
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...override,
});

const minimalPayload = (): CreateQuotationPayload => ({
  projectCode: 'PRJ1234567',
  projectName: 'Test',
  projectStartDate: '2026-01-01',
  projectEndDate: '2026-12-31',
  projectDuration: '> 1 anno',
  projectBudget: '1.000 – 5.000',
  architecturalImpact: 'SI',
  cloudSaas: false,
  cloudIaasPaasLandingZoneCa: false,
  hostMainframe: false,
  onPremiseDipartimentale: false,
  needNewInfrastructure: false,
  infraOnVm: false,
  infraMicroservices: false,
  impactEntity: 'Limitato',
  serviceConsumer: 'Clienti',
  serviceVolumesPerDay: 0,
  technologicalImpact: 'NA',
  developedInternally: true,
  developedByExternalVendors: false,
  hasCaIntellectualProperty: false,
  serviceExposure: false,
  marketProduct: false,
  dependenciesWithExternalServices: false,
  integrationsWithInternalSystems: false,
  saasProduct: false,
  monitoringOrSecurityTool: false,
  expectedReleases: 0,
  projectType: 'Nuovo',
  serviceRisk: 'Minimo',
  pipeline: 'Max 10',
  microservicesCount: 0,
  hasDatabaseImpactDip: false,
  hasSqlDbType: false,
  hasDatabaseImpactHostDb2: false,
  storageGb: 0,
  computeCores: 0,
  scheduledBatches: 0,
  monitoringSystems: 'NA',
  observability: 'NA',
  testMagnitude: 'Fino a 100',
  qa: 'NA',
});

describe('QuotationsService', () => {
  let service: QuotationsService;
  let apiStub: ApiServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        QuotationsService,
        { provide: ApiService, useClass: ApiServiceStub },
      ],
    });
    service = TestBed.inject(QuotationsService);
    apiStub = TestBed.inject(ApiService) as unknown as ApiServiceStub;
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('chiama POST /quotations con il payload', () => {
      apiStub.post.and.returnValue(of(mockQuotation()));
      const payload = minimalPayload();
      service.create(payload).subscribe();
      expect(apiStub.post).toHaveBeenCalledWith('/quotations', payload);
    });

    it('restituisce la quotazione creata', (done) => {
      const q = mockQuotation();
      apiStub.post.and.returnValue(of(q));
      service.create(minimalPayload()).subscribe((result) => {
        expect(result).toEqual(q);
        done();
      });
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('chiama GET /quotations senza filtri', () => {
      apiStub.get.and.returnValue(of([]));
      service.list().subscribe();
      expect(apiStub.get).toHaveBeenCalledWith('/quotations', jasmine.any(Object));
    });

    it('include filtro projectCode se fornito', () => {
      apiStub.get.and.returnValue(of([]));
      service.list({ projectCode: 'PRJ' }).subscribe();
      const args = apiStub.get.calls.mostRecent().args[1] as Record<string, string>;
      expect(args['projectCode']).toBe('PRJ');
    });

    it('include filtro projectName se fornito', () => {
      apiStub.get.and.returnValue(of([]));
      service.list({ projectName: 'Test' }).subscribe();
      const args = apiStub.get.calls.mostRecent().args[1] as Record<string, string>;
      expect(args['projectName']).toBe('Test');
    });

    it('restituisce un array di quotazioni', (done) => {
      const quotations = [mockQuotation(), mockQuotation({ id: 'q2' })];
      apiStub.get.and.returnValue(of(quotations));
      service.list().subscribe((result) => {
        expect(result.length).toBe(2);
        done();
      });
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('restituisce la quotazione con l\'ID specificato', (done) => {
      const q = mockQuotation({ id: 'target-id' });
      apiStub.get.and.returnValue(of([mockQuotation(), q]));
      service.getById('target-id').subscribe((result) => {
        expect(result.id).toBe('target-id');
        done();
      });
    });

    it('lancia errore se la quotazione non è trovata', (done) => {
      apiStub.get.and.returnValue(of([mockQuotation()]));
      service.getById('non-esiste').subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('non trovata');
          done();
        },
      });
    });
  });

  // ── updateRejected ────────────────────────────────────────────────────────

  describe('updateRejected()', () => {
    it('chiama PATCH /quotations/:id', () => {
      apiStub.patch.and.returnValue(of(mockQuotation()));
      service.updateRejected('q1', minimalPayload()).subscribe();
      expect(apiStub.patch).toHaveBeenCalledWith('/quotations/q1', jasmine.any(Object));
    });
  });

  // ── extractApiError ───────────────────────────────────────────────────────

  describe('extractApiError()', () => {
    it('estrae stringa singola dal campo message', () => {
      const err = { error: { message: 'Errore generico' } };
      expect(service.extractApiError(err)).toBe('Errore generico');
    });

    it('unisce array di messaggi', () => {
      const err = { error: { message: ['Errore 1', 'Errore 2'] } };
      expect(service.extractApiError(err)).toBe('Errore 1 Errore 2');
    });

    it('restituisce messaggio di fallback per errore sconosciuto', () => {
      expect(service.extractApiError({})).toContain('non completata');
    });

    it('gestisce errore null', () => {
      expect(service.extractApiError(null)).toContain('non completata');
    });
  });
});
