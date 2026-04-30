# Frontend Skill – Quotazioni Infrastrutturali

This document defines the frontend requirements and constraints for the
**“Quotazioni Infrastrutturali”** corporate web portal.

The frontend is intended for internal users (Business Units and CTO administrators)
and must fully comply with company security, UX, and development standards.

---

## Purpose

The frontend application enables Business Units to:
- Create new infrastructure and IT project cost requests
- Track the status of their quotations
- View completed quotations and related economic evaluations

Administrators use the frontend to:
- Manage incoming requests
- Perform evaluations
- Insert and finalize economic quotations

---

## Application Type

- **Type**: Web Portal
- **Architecture**: Micro Front-End
- **Deployment**: Kubernetes / OpenShift (OCP)
- **Protocol**: HTTPS only
- **Certificate**: Internal certificate (self-signed acceptable for initial phases)

---

## Technology Stack

- **Framework**: Angular 17
- **Language**: TypeScript
- **Styling**:
  - Company design system
  - Clean, enterprise-grade templates
  - Visual style inspired by Credit Agricole standards
- **State Management**: As per company best practices
- **Build & Packaging**:
  - Containerized frontend
  - Compatible with corporate CI/CD pipelines

---

## Authentication & Security

- Login and registration page required
- User identity fields:
  - Employee ID (matricola)
  - Corporate email
  - Password
- Authentication must follow latest corporate security standards:
  - Secure password policies
  - HTTPS enforced
  - Session handling compliant with company rules
- Authorization must support:
  - Standard user
  - Administrator user

---

## Portal Structure

### Home Page

The home page must present **three primary sections**:

#### A – Nuova Quotazione
Access to the form for submitting a new cost quotation request.

#### B – Stato Quotazioni
List and tracking of quotations submitted by the logged-in user.

#### C – Storico Quotazioni
Access to completed quotations and their economic results.

Navigation must be simple, intuitive, and consistent across all user roles.

---

## Section A – Nuova Quotazione

- The user fills in a structured form titled:

  **“Questionario Valutazione Economica Area CTO”**

- The form fields and options are defined in a dedicated functional skill
  (`quotation-workflow.md`) and must not be reinterpreted or altered at frontend level.

- **All fields are mandatory**
- On submission:
  - The quotation is saved in status **“Inviata”**
  - Confirmation is shown to the user
  - Backend triggers notification emails

The frontend must not perform business logic or cost calculations.

---

## Section B – Stato Quotazioni

- The user can view **only their own quotations**
- Supported states:
  - Inviata
  - In valutazione
  - Respinta
- Search capabilities:
  - By Codice Project
  - By Nome Progetto

For quotations in state **“Respinta”**:
- The user must be able to edit the request
- The user can resubmit the modified quotation

---

## Section C – Storico Quotazioni

- Displays only **completed quotations** belonging to the logged-in user
- Selecting a quotation opens:
  - Summary of submitted form data
  - Final economic quotation provided by the CTO area

Data must be displayed in a clear and non-editable format.

---

## Administrator Frontend Visibility

- Administrator users must see additional UI elements and sections
- Admin-specific functionality is defined in `admin-portal.md`
- Role checks must be performed at login and session initialization
- UI elements for admin users must not be visible to standard users

---

## Frontend Responsibilities

The frontend is responsible for:
- UI rendering
- Input validation (format and completeness)
- Role-based access rendering
- Secure communication with backend APIs

The frontend must **never**:
- Perform financial calculations
- Decide quotation outcomes
- Alter quotation states autonomously

---

## Non-Functional Requirements

- Responsive layout (desktop-first)
- Enterprise-grade accessibility
- Clear error messages and user feedback
- No hardcoded configuration or URLs
- Configurable environments (dev / test / prod)

---

## Out of Scope

- Cost estimation logic
- AI interaction logic
- Approval workflows
- Backend data validation rules

These aspects are managed by backend services and dedicated skills.

---

---

## Implementation Notes (aggiornato)

### Layout applicativo

Il layout post-login usa una **topbar unica** senza sidebar:
- Logo CA (104px) + nome portale a sinistra
- Link di navigazione centrati (Dashboard, Nuova Quotazione, Stato Quotazioni, sezioni Admin se ruolo ADMIN)
- Email utente + pulsante "Esci" a destra
- Il contenuto della pagina ha `max-width: 1400px`, `padding: 36px 48px`

La sidebar (`SidebarComponent`) è ancora presente nel codice ma non è montata nel layout principale.

### Landing page pubblica (`/`)

Esiste una landing page pubblica (`LandingComponent`, standalone) accessibile senza autenticazione:
- Slider di immagini full-screen in background (`assets/login-images/tech1-7.jpg`)
- Header stile Credit Agricole con logo, nome portale, pulsante "Accedi"
- Hero section con testo descrittivo del portale
- Il click su "Accedi" apre un **modal di login** (non naviga a `/auth/login`)
- Dopo login: naviga a `/dashboard` (USER) o `/admin` (ADMIN)

La route `/auth/login` rimane disponibile per accesso diretto (stessa UI con immagini full-screen).

### Colori pulsanti

Colori standard pulsanti azioni (definiti in `styles.scss` e nei componenti):
```css
background-color: #4df3c1;
color: #033540;
```

### Form Nuova Quotazione

Il form usa una **griglia a 3 colonne** con le seguenti regole di layout:
- Campi `text`/`date`/`number`/`select`: in griglia 3 colonne
- Campo `projectName`: `colspan: 2`
- Campo `serviceConsumer` (multiselect): `colspan: 3` (full width)
- Checkbox: estratti in una sub-griglia separata sotto i campi principali
- Sezione "Infrastruttura": layout custom a 4 gruppi tematici

Dopo il submit riuscito, il componente naviga automaticamente a `/dashboard/quotations/status`.

### Configurazione Angular

- **SSR disabilitato** (`prerender: false, ssr: false` in `angular.json`)
- **Favicon**: `logo.ico` (incluso negli asset, referenziato in `index.html`)
- **Budget SCSS**: warning 6kb, error 12kb
- **moduleResolution**: `bundler` (non `node`)
- **karma.conf.js**: reporter custom `loki` attivo (scrive NDJSON in `scripts/logs/`)

### Test

- Framework: **Jasmine + Karma** con ChromeHeadless
- Reporter custom: `frontend/reporters/karma-loki-reporter.js` → scrive `scripts/logs/test-frontend-*.ndjson`
- Eseguire: `ng test --watch=false --browsers=ChromeHeadless`
- 130 test, 11 suite
