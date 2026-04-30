import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

class AuthServiceStub {
  login = jasmine.createSpy('login');
  resendVerification = jasmine.createSpy('resendVerification');
}
const routerStub = { navigate: jasmine.createSpy('navigate') };
const authResponse = () => ({
  accessToken: 'tok', refreshToken: 'ref',
  user: { id: 'u1', email: 'a@b.it', matricola: 'M01', role: 'USER' },
});

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authStub: AuthServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CommonModule],
      declarations: [LoginComponent],
      providers: [
        { provide: AuthService, useClass: AuthServiceStub },
        { provide: Router, useValue: routerStub },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authStub = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    fixture.detectChanges();
    routerStub.navigate.calls.reset();
  });

  afterEach(() => { if (component['sliderInterval']) clearInterval(component['sliderInterval']); });

  it('deve essere creato', () => { expect(component).toBeTruthy(); });

  describe('validazione form', () => {
    it('form è invalido quando vuoto', () => { expect(component.form.valid).toBeFalse(); });
    it('email invalida con formato errato', () => {
      component.form.controls['email'].setValue('non-una-email');
      component.form.controls['email'].markAsTouched();
      expect(component.form.controls['email'].valid).toBeFalse();
    });
    it('email valida con formato corretto', () => {
      component.form.controls['email'].setValue('user@example.it');
      expect(component.form.controls['email'].valid).toBeTrue();
    });
    it('password invalida se vuota', () => {
      component.form.controls['password'].setValue('');
      component.form.controls['password'].markAsTouched();
      expect(component.form.controls['password'].valid).toBeFalse();
    });
    it('form valido con credenziali corrette', () => {
      component.form.setValue({ email: 'user@example.it', password: 'Password1!' });
      expect(component.form.valid).toBeTrue();
    });
  });

  describe('hasError()', () => {
    it('false se campo non toccato', () => { expect(component.hasError('email')).toBeFalse(); });
    it('true per email invalida dopo touch', () => {
      component.form.controls['email'].setValue('bad');
      component.form.controls['email'].markAsTouched();
      expect(component.hasError('email')).toBeTrue();
    });
    it('false per email valida', () => {
      component.form.controls['email'].setValue('ok@test.it');
      component.form.controls['email'].markAsTouched();
      expect(component.hasError('email')).toBeFalse();
    });
  });

  describe('onSubmit()', () => {
    it('non chiama login se form invalido', () => {
      component.onSubmit();
      expect(authStub.login).not.toHaveBeenCalled();
    });
    it('naviga a /dashboard per ruolo USER', () => {
      authStub.login.and.returnValue(of(authResponse()));
      component.form.setValue({ email: 'u@t.it', password: 'Password1!' });
      component.onSubmit();
      expect(routerStub.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
    it('naviga a /admin per ruolo ADMIN', () => {
      const r = { ...authResponse(), user: { ...authResponse().user, role: 'ADMIN' } };
      authStub.login.and.returnValue(of(r));
      component.form.setValue({ email: 'a@t.it', password: 'Password1!' });
      component.onSubmit();
      expect(routerStub.navigate).toHaveBeenCalledWith(['/admin']);
    });
    it('imposta errorMessage in caso di errore API', () => {
      authStub.login.and.returnValue(throwError(() => ({ error: { message: 'Credenziali errate' } })));
      component.form.setValue({ email: 'u@t.it', password: 'WrongPass!' });
      component.onSubmit();
      expect(component.errorMessage).toBeTruthy();
    });
    it('mostra pulsante resend se errore contiene "verifica"', () => {
      authStub.login.and.returnValue(throwError(() => ({ error: { message: 'Email non verificata' } })));
      component.form.setValue({ email: 'u@t.it', password: 'P@ss1' });
      component.onSubmit();
      expect(component.showResend).toBeTrue();
    });
  });

  describe('image slider', () => {
    it('currentImageIndex inizia da 0', () => { expect(component.currentImageIndex).toBe(0); });
    it('images contiene almeno una voce', () => { expect(component.images.length).toBeGreaterThan(0); });
    it('ngOnInit avvia lo slider', () => {
      spyOn(component, 'startSlider');
      component.ngOnInit();
      expect(component.startSlider).toHaveBeenCalled();
    });
    it('ngOnDestroy ferma l\'intervallo', () => {
      component.ngOnInit();
      const clearSpy = spyOn(window, 'clearInterval');
      component.ngOnDestroy();
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
