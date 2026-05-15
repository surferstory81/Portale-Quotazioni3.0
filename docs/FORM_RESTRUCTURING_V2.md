# Form Restructuring - Version 2.0

**Date:** 2026-05-12  
**Purpose:** Reorganize quotation form to align with CAPEX/OPEX cost calculation requirements

---

## 📋 Summary of Changes

### 1. Form Structure: 4 → 5 Sections

**OLD Structure (4 sections):**
1. Project Information
2. Infrastructure
3. Services and Technology
4. Operational Data

**NEW Structure (5 sections):**
1. **Project Information** - Project metadata and classification
2. **Application Characteristics** - Application type and business context
3. **Infrastructure & Compute** - Infrastructure resources and sizing
4. **Database & Data** - Database impact and requirements
5. **Monitoring & DevOps** - Observability, CI/CD, and automation

---

## 🆕 New Fields Added

| Field | Type | Section | Purpose |
|-------|------|---------|---------|
| `isThirdPartyApp` | boolean | Application Characteristics | Identify third-party apps for monitoring/pipeline logic |
| `isAppliance` | boolean | Application Characteristics | Identify appliances (no monitoring/pipeline needed) |
| `hasExistingPipelines` | boolean | Monitoring & DevOps | Determine if CI/CD pipelines already exist (LVL1 = €0) |

---

## ❌ Fields Removed

| Field | Reason |
|-------|--------|
| `testMagnitude` | Application testing is out of CTO scope |

---

## 🔄 Fields Updated

### Pipeline Options
**OLD:** `['Max 10', '10–30', '30–60', '> 60']`  
**NEW:** `['< 5', '5–15', '15–40', '> 40']`

**Reason:** Aligned to market standards (1 pipeline every 2-3 microservices)

---

## 📊 New Section Mapping

### Section 1: Project Information
**Purpose:** Core project metadata and classification criteria

**Fields:**
- projectCode *(text, required)*
- projectName *(text, required)*
- projectStartDate *(date, required)*
- projectEndDate *(date, required)*
- projectDuration *(select, required)*
- projectBudget *(select, required)*
- **projectType** *(select, required)* - **'Evolution' identifies evolutive projects**
- **serviceRisk** *(select, required)* - **Critical for classification**
- architecturalImpact *(select, required)*

**Key Logic:**
- `projectType: 'Evolution'` → Pipeline LVL1 (€0), reuse existing infrastructure
- `serviceRisk: 'Alto' | 'Medio'` → Monitoring LVL3 (€24,400)
- `project_classification` (derived) → Determines CAPEX/OPEX levels

---

### Section 2: Application Characteristics
**Purpose:** Determine application type and business context for cost logic

**Fields:**
- **isThirdPartyApp** *(checkbox)* - **NEW**
- **isAppliance** *(checkbox)* - **NEW**
- developedInternally *(checkbox)*
- developedByExternalVendors *(checkbox)*
- hasCaIntellectualProperty *(checkbox)*
- serviceExposure *(checkbox)*
- marketProduct *(checkbox)*
- saasProduct *(checkbox)*
- monitoringOrSecurityTool *(checkbox)*
- serviceConsumer *(multiselect, required)*
- serviceVolumesPerDay *(number, required)*
- technologicalImpact *(select, required)*
- impactEntity *(select, required)*

**Key Logic:**
- `isAppliance: true` → Monitoring LVL1 (€0), no CI/CD needed
- `isThirdPartyApp: true` → May trigger LVL1 or LVL2 depending on integration needs

---

### Section 3: Infrastructure & Compute
**Purpose:** Sizing infrastructure resources for OPEX calculation

**Fields:**
- cloudSaas *(checkbox)*
- cloudIaasPaasLandingZoneCa *(checkbox)*
- hostMainframe *(checkbox)*
- onPremiseDipartimentale *(checkbox)*
- needNewInfrastructure *(checkbox)*
- infraOnVm *(checkbox)*
- infraMicroservices *(checkbox)*
- **computeCores** *(number, required)* - **OPEX: VM/container sizing**
- **storageGb** *(number, required)* - **OPEX: Storage costs**
- **microservicesCount** *(number, required)* - **Classification & OPEX**
- scheduledBatches *(number, required)*

**Key Logic:**
- `computeCores` → OPEX for VM/container resources
- `storageGb` → OPEX for storage + backup
- `microservicesCount` → Classification band + OPEX licenses

---

### Section 4: Database & Data
**Purpose:** Database impact for CAPEX setup and OPEX management costs

**Fields:**
- hasDatabaseImpactDip *(checkbox)* - Oracle Exadata (DIP)
- hasSqlDbType *(checkbox)* - SQL databases
- hasDatabaseImpactHostDb2 *(checkbox)* - Mainframe DB2

**Key Logic:**
- `hasDatabaseImpactDip: true` → CAPEX setup €14k, OPEX management
- `hasDatabaseImpactHostDb2: true` → CAPEX setup €16k, OPEX management

---

### Section 5: Monitoring & DevOps
**Purpose:** Determine CAPEX for monitoring and CI/CD implementation

**Fields:**
- monitoringSystems *(select, required)*
- observability *(select, required)*
- **pipeline** *(select, required)* - **Updated options**
- **hasExistingPipelines** *(checkbox)* - **NEW**
- expectedReleases *(number, required)*
- dependenciesWithExternalServices *(checkbox)*
- integrationsWithInternalSystems *(checkbox)*
- qa *(select, required)*

**Key Logic:**
- **Monitoring Dashboard CAPEX:**
  - LVL1 (€0): `isAppliance` OR `monitoringSystems: 'Existing (no action)'`
  - LVL2 (€14,640): Low-criticality apps
  - LVL3 (€24,400): `serviceRisk: 'Alto' | 'Medio'` OR `project_classification: 'COMPLESSO' | 'SPECIALE'`

- **CI/CD Pipeline CAPEX:**
  - LVL1 (€0): `projectType: 'Evolution'` OR `hasExistingPipelines: true`
  - LVL2 (€7,320): LIGHT/MEDIUM projects
  - LVL3 (€12,200): COMPLESSO/SPECIALE projects

---

## 🔗 Impact on Cost Calculation

### CAPEX Voci Updated

1. **Monitoring & Observability (Dashboard Dynatrace)**
   - Uses: `isAppliance`, `serviceRisk`, `project_classification`, `monitoringSystems`
   - Logic: 3 levels (LVL1/2/3) based on criticality

2. **DevOps Pipeline & CI/CD**
   - Uses: `projectType`, `hasExistingPipelines`, `project_classification`
   - Logic: 3 levels (LVL1/2/3) based on project type and complexity

3. **Infrastructure Testing** *(TO BE DEFINED)*
   - Placeholder for future implementation

4. **Professional Services** *(TO BE DEFINED)*
   - Placeholder for future implementation

### OPEX Voci (No Changes in This Phase)
- Infrastructure Management (uses `computeCores`, `storageGb`, `microservicesCount`)
- Database Management (uses `hasDatabaseImpactDip`, `hasSqlDbType`, `hasDatabaseImpactHostDb2`)
- Software Licenses (uses `computeCores`, `microservicesCount`)

---

## 📁 Files Modified

### Frontend
- `frontend/src/app/features/dashboard/models/quotation.models.ts`
  - Updated `CreateQuotationPayload` interface
  - Added: `isThirdPartyApp`, `isAppliance`, `hasExistingPipelines`
  - Removed: `testMagnitude`
  - Reordered fields by logical section

- `frontend/src/app/features/dashboard/services/quotation-form-config.service.ts`
  - Updated `getSections()` to return 5 sections
  - Updated `pipelineOptions`: `['< 5', '5–15', '15–40', '> 40']`
  - Removed `testMagnitudeOptions`
  - Added new fields with proper labels

### Backend
- `backend/src/modules/quotations/dto/quotations.dto.ts`
  - Updated `CreateQuotationDto` class
  - Updated `SaveDraftDto` class
  - Added: `isThirdPartyApp`, `isAppliance`, `hasExistingPipelines`
  - Removed: `testMagnitude`, `TEST_MAGNITUDE_OPTIONS`
  - Updated: `PIPELINE_OPTIONS` constant

### AI Estimation Service
- `ai-estimation-service/knowledge/dynatrace-dashboard-costs.md` *(NEW)*
  - 3-level cost structure for Dynatrace dashboard implementation
  
- `ai-estimation-service/knowledge/devops-pipeline-costs.md` *(NEW)*
  - 3-level cost structure for CI/CD pipeline implementation

- `ai-estimation-service/knowledge/project-classification-bands.md`
  - Updated pipeline thresholds (5, 15, 40 instead of 10, 30, 60)
  - Deprecated test magnitude criteria
  - Added budget range disclaimers

- `ai-estimation-service/prompts/estimation-agent-prompt.md`
  - Updated CAPEX calculation logic
  - Removed application testing references
  - Added references to new knowledge files

---

## 🗄️ Database Migration

**No migration required** - The entity uses `formData: jsonb`, which stores all form fields dynamically.

New fields are automatically included in the JSON without schema changes.

---

## ✅ Validation

### Frontend Validation
- All required fields have `required: true` in form config
- New boolean fields default to `false`
- Pipeline options validated against new values

### Backend Validation
- `CreateQuotationDto` enforces all validations
- `@IsBoolean()` decorators for new fields
- Updated `@IsIn(PIPELINE_OPTIONS)` with new values

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Update form config tests to expect 5 sections
- [ ] Update DTO validation tests for new fields
- [ ] Update pipeline options validation tests

### Integration Tests
- [ ] Test form submission with new fields
- [ ] Test evolutive project → LVL1 pipeline logic
- [ ] Test appliance → LVL1 monitoring logic
- [ ] Test high-risk service → LVL3 monitoring logic

### E2E Tests
- [ ] Create new quotation with all 5 sections
- [ ] Verify new fields appear in form
- [ ] Verify pipeline dropdown shows new options
- [ ] Verify testMagnitude field is removed
- [ ] Submit quotation and verify formData saved correctly

---

## 📝 User-Facing Changes

### New Labels in UI
- "Third-Party Application" (Section 2)
- "Appliance / Hardware Device" (Section 2)
- "Has Existing CI/CD Pipelines (Reusable)" (Section 5)

### Removed Labels
- "Test Magnitude (Governance test)" *(removed from Section 5)*

### Updated Labels
- Pipeline dropdown now shows: "< 5", "5–15", "15–40", "> 40"

### Section Headers
1. "1. Project Information"
2. "2. Application Characteristics"
3. "3. Infrastructure & Compute"
4. "4. Database & Data"
5. "5. Monitoring & DevOps"

---

## 🔮 Future Enhancements

### Phase 2 - Additional CAPEX Voci
1. **Infrastructure Testing**
   - Define 3-level structure
   - Add necessary form fields

2. **Professional Services**
   - Training requirements
   - Setup complexity factors

3. **Database Integration Setup**
   - Refinement of CAPEX costs
   - Additional database types

### Phase 3 - OPEX Refinement
1. Review infrastructure management costs
2. Review database management costs
3. Review software license calculations

---

**Document Version:** 1.0  
**Status:** ✅ Implemented  
**Next Review:** After Phase 2 CAPEX completion