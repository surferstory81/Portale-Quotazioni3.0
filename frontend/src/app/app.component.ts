import { Component } from '@angular/core';
import { VersionFooterComponent } from './shared/components/version-footer/version-footer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false,
})
export class AppComponent {
  title = 'frontend';
}
