import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { UsersManagementComponent } from './users-management.component';
import { AdminService, AdminUser } from '../../services/admin.service';

class AdminServiceStub {
  getUsers        = jasmine.createSpy('getUsers').and.returnValue(of([]));
  blockUser       = jasmine.createSpy('blockUser');
  assignAdminRole = jasmine.createSpy('assignAdminRole');
  verifyUserEmail = jasmine.createSpy('verifyUserEmail');
  resetUserPassword = jasmine.createSpy('resetUserPassword');
  deleteUser      = jasmine.createSpy('deleteUser');
  extractApiError = jasmine.createSpy('extractApiError').and.returnValue('Errore');
}

const mockUser = (override: Partial<AdminUser> = {}): AdminUser => ({
  id: 'u1', matricola: 'MAT001', email: 'user@test.it',
  isVerified: true, isBlocked: false, blockedAt: null,
  authProvider: 'local', createdAt: '2026-01-01',
  role: { name: 'USER' }, ...override,
});

describe('UsersManagementComponent', () => {
  let component: UsersManagementComponent;
  let fixture: ComponentFixture<UsersManagementComponent>;
  let adminStub: AdminServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, ReactiveFormsModule],
      declarations: [UsersManagementComponent],
      providers: [{ provide: AdminService, useClass: AdminServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(UsersManagementComponent);
    component = fixture.componentInstance;
    adminStub = TestBed.inject(AdminService) as unknown as AdminServiceStub;
    fixture.detectChanges();
  });

  it('deve essere creato', () => expect(component).toBeTruthy());

  it('carica gli utenti all\'avvio', () => {
    expect(adminStub.getUsers).toHaveBeenCalled();
  });

  // ── toggleBlock ───────────────────────────────────────────────────────────

  describe('toggleBlock()', () => {
    it('blocca un utente attivo (isBlocked: false → true)', () => {
      const user = mockUser({ isBlocked: false });
      adminStub.blockUser.and.returnValue(of(mockUser({ isBlocked: true })));
      component.toggleBlock(user);
      expect(adminStub.blockUser).toHaveBeenCalledWith('u1', true);
    });

    it('sblocca un utente bloccato (isBlocked: true → false)', () => {
      const user = mockUser({ isBlocked: true });
      adminStub.blockUser.and.returnValue(of(mockUser({ isBlocked: false })));
      component.toggleBlock(user);
      expect(adminStub.blockUser).toHaveBeenCalledWith('u1', false);
    });

    it('imposta successMessage dopo blocco', () => {
      const user = mockUser({ isBlocked: false });
      adminStub.blockUser.and.returnValue(of(mockUser({ isBlocked: true })));
      component.toggleBlock(user);
      expect(component.successMessage).toContain('bloccato');
    });

    it('imposta successMessage dopo sblocco', () => {
      const user = mockUser({ isBlocked: true });
      adminStub.blockUser.and.returnValue(of(mockUser({ isBlocked: false })));
      component.toggleBlock(user);
      expect(component.successMessage).toContain('sbloccato');
    });

    it('imposta errorMessage in caso di errore', () => {
      adminStub.blockUser.and.returnValue(throwError(() => ({})));
      component.toggleBlock(mockUser());
      expect(component.errorMessage).toBeTruthy();
    });
  });

  // ── toggleAdminRole ───────────────────────────────────────────────────────

  describe('toggleAdminRole()', () => {
    it('promuove utente USER ad ADMIN', () => {
      const user = mockUser({ role: { name: 'USER' } });
      adminStub.assignAdminRole.and.returnValue(of(mockUser({ role: { name: 'ADMIN' } })));
      component.toggleAdminRole(user);
      expect(adminStub.assignAdminRole).toHaveBeenCalledWith('u1', true);
    });

    it('retrocede ADMIN a USER', () => {
      const user = mockUser({ role: { name: 'ADMIN' } });
      adminStub.assignAdminRole.and.returnValue(of(mockUser({ role: { name: 'USER' } })));
      component.toggleAdminRole(user);
      expect(adminStub.assignAdminRole).toHaveBeenCalledWith('u1', false);
    });

    it('imposta successMessage con "promosso" per promozione', () => {
      adminStub.assignAdminRole.and.returnValue(of(mockUser({ role: { name: 'ADMIN' } })));
      component.toggleAdminRole(mockUser({ role: { name: 'USER' } }));
      expect(component.successMessage).toContain('promosso');
    });
  });

  // ── verifyEmail ───────────────────────────────────────────────────────────

  describe('verifyEmail()', () => {
    it('chiama adminService.verifyUserEmail', () => {
      adminStub.verifyUserEmail.and.returnValue(of(mockUser({ isVerified: true })));
      component.verifyEmail(mockUser({ isVerified: false }));
      expect(adminStub.verifyUserEmail).toHaveBeenCalledWith('u1');
    });

    it('imposta successMessage dopo verifica', () => {
      adminStub.verifyUserEmail.and.returnValue(of(mockUser({ isVerified: true })));
      component.verifyEmail(mockUser({ isVerified: false }));
      expect(component.successMessage).toContain('verificata');
    });
  });

  // ── resetPasswordForm ─────────────────────────────────────────────────────

  describe('getResetForm()', () => {
    it('crea un FormGroup per l\'utente', () => {
      const form = component.getResetForm('u1');
      expect(form).toBeDefined();
      expect(form.get('newPassword')).toBeDefined();
    });

    it('restituisce sempre lo stesso form per lo stesso ID', () => {
      expect(component.getResetForm('u1')).toBe(component.getResetForm('u1'));
    });

    it('è invalido con password troppo corta', () => {
      const form = component.getResetForm('u1');
      form.get('newPassword')?.setValue('Ab1!');
      expect(form.invalid).toBeTrue();
    });

    it('è valido con password che rispetta i requisiti', () => {
      const form = component.getResetForm('u1');
      form.get('newPassword')?.setValue('Password1!');
      expect(form.valid).toBeTrue();
    });
  });
});
