import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { PLATFORM_ID } from '@angular/core';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../../features/auth/services/auth.service';
import { ApiService } from '../../../core/services/api.service';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      declarations: [NavbarComponent],
      providers: [
        AuthService,
        ApiService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve essere creato', () => {
    expect(component).toBeTruthy();
  });

  it('userEmail è vuoto quando localStorage è assente', () => {
    localStorage.removeItem('userEmail');
    expect(component.userEmail).toBe('');
  });

  it('userEmail riflette il valore in localStorage', () => {
    localStorage.setItem('userEmail', 'admin@test.it');
    expect(component.userEmail).toBe('admin@test.it');
    localStorage.removeItem('userEmail');
  });

  it('isAdmin è false per ruolo USER', () => {
    localStorage.setItem('userRole', 'USER');
    expect(component.isAdmin).toBeFalse();
    localStorage.removeItem('userRole');
  });

  it('isAdmin è true per ruolo ADMIN', () => {
    localStorage.setItem('userRole', 'ADMIN');
    expect(component.isAdmin).toBeTrue();
    localStorage.removeItem('userRole');
  });
});
