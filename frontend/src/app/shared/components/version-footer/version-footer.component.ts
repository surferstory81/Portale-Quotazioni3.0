import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { VERSION_INFO } from '../../../core/version';

interface ServiceVersion {
  name: string;
  version: string;
  status: 'ok' | 'error';
  buildDate?: string;
}

@Component({
  selector: 'app-version-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="version-footer">
      <div class="version-info">
        <span class="version-label">v{{ frontendVersion }}</span>
        <span class="separator">|</span>
        <span class="build-date">{{ buildDate | date: 'dd/MM/yyyy HH:mm' }}</span>

        @if (showServices) {
          <span class="separator">|</span>
          <div class="services-status">
            @for (service of services; track service.name) {
              <span
                class="service-badge"
                [class.status-ok]="service.status === 'ok'"
                [class.status-error]="service.status === 'error'"
                [title]="service.name + ' v' + service.version"
              >
                {{ service.name }}: {{ service.version }}
              </span>
            }
          </div>
        }

        <button
          class="toggle-btn"
          (click)="showServices = !showServices"
          title="Toggle service versions"
        >
          {{ showServices ? '▲' : '▼' }}
        </button>
      </div>
    </footer>
  `,
  styles: [`
    .version-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.8);
      color: #888;
      padding: 8px 16px;
      font-size: 11px;
      font-family: monospace;
      z-index: 1000;
      backdrop-filter: blur(10px);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .version-info {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .version-label {
      color: #4fc3f7;
      font-weight: bold;
    }

    .separator {
      color: #444;
    }

    .build-date {
      color: #888;
    }

    .services-status {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .service-badge {
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 10px;
      transition: all 0.3s;
    }

    .service-badge.status-ok {
      background: rgba(76, 175, 80, 0.2);
      color: #4caf50;
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .service-badge.status-error {
      background: rgba(244, 67, 54, 0.2);
      color: #f44336;
      border: 1px solid rgba(244, 67, 54, 0.3);
    }

    .toggle-btn {
      background: transparent;
      border: 1px solid #444;
      color: #888;
      padding: 2px 8px;
      cursor: pointer;
      border-radius: 3px;
      font-size: 10px;
      transition: all 0.3s;
      margin-left: auto;
    }

    .toggle-btn:hover {
      border-color: #4fc3f7;
      color: #4fc3f7;
    }
  `],
})
export class VersionFooterComponent implements OnInit {
  frontendVersion = VERSION_INFO.version;
  buildDate = new Date(VERSION_INFO.buildDate);
  showServices = false;
  services: ServiceVersion[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadServiceVersions();
  }

  private async loadServiceVersions() {
    const serviceEndpoints = [
      { name: 'Backend', url: 'http://localhost:3000/health' },
      { name: 'AI Service', url: 'http://localhost:3001/health' },
    ];

    for (const endpoint of serviceEndpoints) {
      try {
        const response: any = await this.http
          .get(endpoint.url)
          .pipe(timeout(5000))
          .toPromise();
        this.services.push({
          name: endpoint.name,
          version: response.version || 'unknown',
          status: 'ok',
          buildDate: response.buildDate,
        });
      } catch (error) {
        console.error(`Failed to load version for ${endpoint.name}:`, error);
        this.services.push({
          name: endpoint.name,
          version: 'offline',
          status: 'error',
        });
      }
    }
  }
}
