# Admin Portal Skill

This document defines the functional and behavioral requirements of the
**Administrator Portal** for the “Quotazioni Infrastrutturali” application.

This section is reserved to authorized CTO users and supports the full
lifecycle management of quotation requests, users, and administrative controls.

---

## Purpose

The Administrator Portal enables the CTO organization to:
- Govern incoming quotation requests
- Manage quotation states
- Insert and finalize economic evaluations
- Manage user profiles and permissions
- Ensure auditability and operational control

The administrator remains fully responsible for all decisions.
AI support, where applicable, is strictly advisory.

---

## Administrator Role

An **Administrator** is an authenticated user with elevated privileges.

Administrator privileges allow:
- Visibility on all quotation requests
- State transitions
- Cost insertion
- User management
- Access to logs and administrative functions

Role assignment is managed explicitly via backend administration functions.

---

## Access & Authentication

- A dedicated **“Login as Administrator”** option must be present on the login page
- Upon successful login:
  - The system must verify the administrator flag
  - Admin-only sections become visible
- Non-admin users must never see admin UI elements

Authorization checks must be enforced both:
- At frontend level (UI visibility)
- At backend level (API protection)

---

## Administrator Home

The administrator landing page must display:
- Summary of quotation requests grouped by status:
  - Inviata
  - In valutazione
  - Respinta
  - Completata
- Quick access to administrative sections

---

## Administrative Sections

### 1. Users

The **Users** section allows administrators to manage registered users.

Capabilities:
- View user details:
  - Employee ID (matricola)
  - Email
  - Activation status
  - Role (standard / administrator)
- View user statistics:
  - Number of quotations submitted
  - Quotation status distribution
- Activate / deactivate users
- Assign or revoke administrator privileges
- Reset user credentials (according to company policy)

User-related actions must be logged.

---

### 2. Elenco Quotazioni

The **Elenco Quotazioni** section is the operational core of the portal.

Capabilities:
- View all quotation requests from all users
- Filter and search quotations by:
  - Codice Project
  - Nome Progetto
  - Status
- Open a quotation and view all submitted form data
- Take ownership of a quotation by setting state to **In valutazione**

When a quotation enters **In valutazione**:
- The requesting user must see the updated status in real time

---

### 3. Quotation Evaluation

When a quotation is **In valutazione**, the administrator can:

- Review all submitted questionnaire data
- Insert economic cost items:
  - Capex
  - Opex
  - Detailed cost breakdown
- Add notes or assumptions (if required by governance)

At this stage:
- AI assistance may be used to suggest estimates
- AI outputs must be clearly identified as advisory
- Final values must always be manually confirmed by the administrator

Cost modeling details are defined in a dedicated skill (`cost-model.md`).

---

### 4. Completion of Quotation

Once evaluation is complete:

- The administrator sets the quotation status to **Completata**
- The system must:
  - Persist the final economic quotation
  - Freeze the request (read-only)
  - Send a notification email to the requesting user

Completed quotations become visible to users in **Storico Quotazioni**.

---

### 5. Storico Quotazioni (Admin View)

Administrators can:
- View historical quotations
- Access all completed quotations regardless of creator
- Use this data for comparison, analysis, or audit purposes

---

### 6. Application Logs

The **Log Application** section provides visibility into:
- User actions
- Administrative actions
- State transitions
- Errors and warnings

Logs must support:
- Filtering by user
- Filtering by quotation
- Date-based search

Log retention must follow company compliance rules.

---

### 7. Administration

The **Administration** section includes:
- System configuration (where allowed)
- Application health indicators
- Reference data used for quotations (if applicable)

No critical configuration must be editable without proper authorization.

---

## AI Usage in Admin Portal

- AI may assist administrators during the quotation evaluation phase
- AI must never:
  - Change quotation state autonomously
  - Submit or finalize quotations
- AI suggestions must be reviewable and overrideable
- Administrator decisions are final and authoritative

Detailed AI behavior is defined in `ai-estimation.md`.

---

## Governance Rules

- All administrative actions must be audited
- State transitions must be explicit and logged
- Administrator identity must always be traceable
- No action must be performed implicitly or automatically

---

## Out of Scope

- Authentication implementation details
- Cost calculation algorithms
- AI estimation logic
- Infrastructure and deployment configuration

These topics are covered in other dedicated skills.

---