import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminService, AdminQuotation, AdminUser } from './admin.service';
import { ApiService } from '../../../core/services/api.service';

class ApiServiceStub {
  get    = jasmine.createSpy('get');
  post   = jasmine.createSpy('post');
  patch  = jasmine.createSpy('patch');
  delete = jasmine.createSpy('delete');
}

const mockQuotation = (override: Partial<AdminQuotation> = {}): AdminQuotation => ({
  id: 'q1', projectCode: 'PRJ1234567', projectName: 'Test',
  status: 'INVIATA', totalAmount: 0,
  manualCapex: null, manualOpex: null, formData: {},
  createdAt: '2026-01-01', updatedAt: '2026-01-01', takenInChargeAt: null,
  createdBy: { id: 'u1', email: 'u@t.it', matricola: 'M01' },
  assignedAdmin: null, ...override,
});

const mockUser = (override: Partial<AdminUser> = {}): AdminUser => ({
  id: 'u1', matricola: 'MAT001', email: 'u@t.it',
  isVerified: true, isBlocked: false, blockedAt: null,
  authProvider: 'local', createdAt: '2026-01-01',
  role: { name: 'USER' }, ...override,
});

describe('AdminService', () => {
  let service: AdminService;
  let apiStub: ApiServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AdminService,
        { provide: ApiService, useClass: ApiServiceStub },
      ],
    });
    service = TestBed.inject(AdminService);
    apiStub = TestBed.inject(ApiService) as unknown as ApiServiceStub;
  });

  // ── Quotazioni ─────────────────────────────────────────────────────────────

  describe('getQuotations()', () => {
    it('chiama GET /admin/quotations', () => {
      apiStub.get.and.returnValue(of([]));
      service.getQuotations().subscribe();
      expect(apiStub.get).toHaveBeenCalledWith('/admin/quotations');
    });

    it('restituisce array di quotazioni', (done) => {
      const quotations = [mockQuotation(), mockQuotation({ id: 'q2' })];
      apiStub.get.and.returnValue(of(quotations));
      service.getQuotations().subscribe((result) => {
        expect(result.length).toBe(2);
        done();
      });
    });
  });

  describe('takeInCharge()', () => {
    it('chiama POST /admin/quotations/:id/take-in-charge', () => {
      apiStub.post.and.returnValue(of(mockQuotation({ status: 'IN VALUTAZIONE' })));
      service.takeInCharge('q1').subscribe();
      expect(apiStub.post).toHaveBeenCalledWith('/admin/quotations/q1/take-in-charge', {});
    });
  });

  describe('updateStatus()', () => {
    it('chiama PATCH /admin/quotations/:id/status con lo stato corretto', () => {
      apiStub.patch.and.returnValue(of(mockQuotation({ status: 'RESPINTA' })));
      service.updateStatus('q1', 'RESPINTA').subscribe();
      expect(apiStub.patch).toHaveBeenCalledWith('/admin/quotations/q1/status', { status: 'RESPINTA' });
    });
  });

  describe('setEconomicQuotation()', () => {
    it('chiama PATCH con totalAmount', () => {
      apiStub.patch.and.returnValue(of(mockQuotation({ totalAmount: 15000 })));
      service.setEconomicQuotation('q1', 15000).subscribe();
      expect(apiStub.patch).toHaveBeenCalledWith(
        '/admin/quotations/q1/economic-quotation', { totalAmount: 15000 },
      );
    });
  });

  // ── Utenti ─────────────────────────────────────────────────────────────────

  describe('getUsers()', () => {
    it('chiama GET /admin/users', () => {
      apiStub.get.and.returnValue(of([]));
      service.getUsers().subscribe();
      expect(apiStub.get).toHaveBeenCalledWith('/admin/users');
    });
  });

  describe('blockUser()', () => {
    it('invia isBlocked=true per bloccare', () => {
      apiStub.patch.and.returnValue(of(mockUser({ isBlocked: true })));
      service.blockUser('u1', true).subscribe();
      expect(apiStub.patch).toHaveBeenCalledWith('/admin/users/u1/block', { isBlocked: true });
    });

    it('invia isBlocked=false per sbloccare', () => {
      apiStub.patch.and.returnValue(of(mockUser({ isBlocked: false })));
      service.blockUser('u1', false).subscribe();
      expect(apiStub.patch).toHaveBeenCalledWith('/admin/users/u1/block', { isBlocked: false });
    });
  });

  describe('assignAdminRole()', () => {
    it('promuove ad ADMIN con assignAdmin=true', () => {
      apiStub.patch.and.returnValue(of(mockUser({ role: { name: 'ADMIN' } })));
      service.assignAdminRole('u1', true).subscribe();
      expect(apiStub.patch).toHaveBeenCalledWith('/admin/users/u1/role', { assignAdmin: true });
    });
  });

  describe('deleteUser()', () => {
    it('chiama DELETE /admin/users/:id', () => {
      apiStub.delete.and.returnValue(of({ message: 'eliminato' }));
      service.deleteUser('u1').subscribe();
      expect(apiStub.delete).toHaveBeenCalledWith('/admin/users/u1');
    });
  });

  // ── Impostazioni ───────────────────────────────────────────────────────────

  describe('getSystemSettings()', () => {
    it('chiama GET /admin/settings', () => {
      apiStub.get.and.returnValue(of({ email_enabled: true, sso_enabled: false }));
      service.getSystemSettings().subscribe();
      expect(apiStub.get).toHaveBeenCalledWith('/admin/settings');
    });
  });

  describe('setSystemSetting()', () => {
    it('chiama PATCH /admin/settings/:key', () => {
      apiStub.patch.and.returnValue(of({ email_enabled: false, sso_enabled: false }));
      service.setSystemSetting('email_enabled', false).subscribe();
      expect(apiStub.patch).toHaveBeenCalledWith('/admin/settings/email_enabled', { value: false });
    });
  });

  // ── extractApiError ────────────────────────────────────────────────────────

  describe('extractApiError()', () => {
    it('estrae messaggio stringa', () => {
      expect(service.extractApiError({ error: { message: 'Errore' } })).toBe('Errore');
    });
    it('unisce array di messaggi', () => {
      expect(service.extractApiError({ error: { message: ['E1', 'E2'] } })).toBe('E1 E2');
    });
    it('restituisce fallback per errore sconosciuto', () => {
      expect(service.extractApiError({})).toContain('non completata');
    });
  });
});
