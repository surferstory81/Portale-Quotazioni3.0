import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { ApiService } from '../../../core/services/api.service';

class ApiServiceStub {
  post = jasmine.createSpy('post');
}

const mockTokenResponse = () => ({
  accessToken: 'access-tok',
  refreshToken: 'refresh-tok',
  user: { id: 'u1', email: 'user@test.it', matricola: 'MAT001', role: 'USER' },
});

describe('AuthService', () => {
  let service: AuthService;
  let apiStub: ApiServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: ApiService, useClass: ApiServiceStub },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(AuthService);
    apiStub = TestBed.inject(ApiService) as unknown as ApiServiceStub;
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('chiama ApiService.post con l\'endpoint corretto', () => {
      apiStub.post.and.returnValue(of(mockTokenResponse()));
      service.login({ email: 'user@test.it', password: 'Password1!' }).subscribe();
      expect(apiStub.post).toHaveBeenCalledWith('/auth/login', jasmine.any(Object));
    });

    it('persiste accessToken in localStorage dopo login', (done) => {
      apiStub.post.and.returnValue(of(mockTokenResponse()));
      service.login({ email: 'user@test.it', password: 'Password1!' }).subscribe(() => {
        expect(localStorage.getItem('accessToken')).toBe('access-tok');
        done();
      });
    });

    it('persiste refreshToken in localStorage dopo login', (done) => {
      apiStub.post.and.returnValue(of(mockTokenResponse()));
      service.login({ email: 'user@test.it', password: 'Password1!' }).subscribe(() => {
        expect(localStorage.getItem('refreshToken')).toBe('refresh-tok');
        done();
      });
    });

    it('persiste userRole e userEmail in localStorage', (done) => {
      apiStub.post.and.returnValue(of(mockTokenResponse()));
      service.login({ email: 'user@test.it', password: 'Password1!' }).subscribe(() => {
        expect(localStorage.getItem('userRole')).toBe('USER');
        expect(localStorage.getItem('userEmail')).toBe('user@test.it');
        done();
      });
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    beforeEach(() => {
      localStorage.setItem('accessToken', 'tok');
      localStorage.setItem('refreshToken', 'ref');
      localStorage.setItem('userRole', 'USER');
      localStorage.setItem('userEmail', 'user@test.it');
    });

    it('rimuove accessToken', () => { service.logout(); expect(localStorage.getItem('accessToken')).toBeNull(); });
    it('rimuove refreshToken', () => { service.logout(); expect(localStorage.getItem('refreshToken')).toBeNull(); });
    it('rimuove userRole',     () => { service.logout(); expect(localStorage.getItem('userRole')).toBeNull(); });
    it('rimuove userEmail',    () => { service.logout(); expect(localStorage.getItem('userEmail')).toBeNull(); });
  });

  // ── isAuthenticated ────────────────────────────────────────────────────────

  describe('isAuthenticated()', () => {
    it('true quando accessToken è presente', () => {
      localStorage.setItem('accessToken', 'tok');
      expect(service.isAuthenticated()).toBeTrue();
    });
    it('false quando accessToken è assente', () => {
      localStorage.removeItem('accessToken');
      expect(service.isAuthenticated()).toBeFalse();
    });
    it('false dopo logout', () => {
      localStorage.setItem('accessToken', 'tok');
      service.logout();
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  // ── forgotPassword / register ──────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('chiama POST /auth/forgot-password', () => {
      apiStub.post.and.returnValue(of({ message: 'ok' }));
      service.forgotPassword('user@test.it').subscribe();
      expect(apiStub.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'user@test.it' });
    });
  });

  describe('register()', () => {
    it('chiama POST /auth/register', () => {
      apiStub.post.and.returnValue(of({ message: 'ok' }));
      service.register({ matricola: 'MAT001', email: 'new@test.it', password: 'Password1!' }).subscribe();
      expect(apiStub.post).toHaveBeenCalledWith('/auth/register', jasmine.any(Object));
    });
  });
});
