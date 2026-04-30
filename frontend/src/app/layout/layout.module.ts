import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';

@NgModule({
  declarations: [
    NavbarComponent,
    MainLayoutComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
  ],
  exports: [MainLayoutComponent],
})
export class LayoutModule { }
