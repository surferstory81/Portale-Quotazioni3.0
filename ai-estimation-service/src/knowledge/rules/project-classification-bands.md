# Project Classification Bands - Fasce Budget CTO

**Source:** Budget CTO v2.1 - Tab "Fasce Budget CTO"  
**Last Updated:** 2026-05-12  
**Purpose:** Classification criteria for project complexity and CTO budget allocation

---

## Overview

Projects are classified into complexity bands based on **technical and operational criteria**. The classification determines the level of CTO involvement, budget allocation, and approval workflows.

**Key Decision Rule:** The presence of **at least one parameter** from a band is sufficient to classify the project in that band (most restrictive criterion wins).

---

## ⚠️ IMPORTANT: Budget Ranges are Indicative

**The CAPEX and OPEX ranges provided in each band are high-level indicative guidelines only.**

- **Actual costs may vary significantly** based on specific project characteristics, vendor contracts, technological choices, and architectural decisions
- **Ranges serve as sanity checks** for classification validation, not as rigid limits
- **Bottom-up estimation is authoritative**: Always calculate costs from detailed requirements; if the calculated estimate falls outside the band's typical range, the estimate takes precedence over the band range
- **Flag significant deviations**: If estimate differs by >30% from band range, document the reason but do not force-fit the estimate into the range

**Example**: A LIGHT project (by technical criteria) may legitimately cost €120k if it requires specialized software licenses or cloud services, even though the typical LIGHT range is €50-100k. The classification remains LIGHT, but the estimate reflects actual costs.

---

## Estimation Accuracy by Band

Target accuracy for cost estimates based on project complexity:

| Band          | Target Accuracy           | Reasoning                                                  |
|---------------|---------------------------|------------------------------------------------------------|
| **LIGHT**     | ±20%                      | Small scope, limited complexity, higher uncertainty        |
| **MEDIUM**    | ±15%                      | Moderate scope, better defined requirements                |
| **COMPLESSO** | ±10%                      | Large scope, detailed requirements, comprehensive analysis |
| **SPECIALE**  | ±10% (with custom review) | Strategic initiatives require detailed custom evaluation   |

**Note:** These accuracy targets apply to the AI-generated estimate. Final estimates should be reviewed by CTO office.

---

## Risk Contingency by Service Risk Level

Contingency buffers to be added to base estimates based on project risk:

| Service Risk Level       | Contingency Buffer | Application                                          |
|--------------------------|--------------------|------------------------------------------------------|
| **Minimal** (LIGHT)      | +10%               | Low business impact, well-understood technologies    |
| **Moderate** (MEDIUM)    | +15%               | Medium business impact, some new technologies        |
| **Relevant** (COMPLESSO) | +20%               | High business impact, complex integrations           |
| **Radical** (SPECIALE)   | +25-30%            | Critical business services, major technology changes |

**Formula:** `Final_Estimate = Base_Estimate * (1 + Contingency_Percentage)`

**Example:** Base estimate €100k with Moderate risk → €100k * 1.15 = €115k

---

## Testing Effort - OUT OF SCOPE

**⚠️ APPLICATION TESTING IS NO LONGER WITHIN CTO SCOPE**

Application testing activities (unit testing, functional testing, UAT, etc.) are **not included in CTO budget estimates** as they are managed and funded by application teams outside of CTO's area of responsibility.

**What remains in scope for CTO:**
- Infrastructure testing (performance, load, stress testing of infrastructure components)
- Infrastructure validation and smoke tests
- Disaster recovery and backup testing

**Deprecated fields (removed from classification):**
- Application testing fields (testMagnitude, testCases) → Outside CTO scope, not used for classification or cost estimation

---

## Classification Bands

### NO IMPATTI CTO
**Description:** Projects with no infrastructure or operational impact on CTO services.

**Characteristics:**
- No architectural changes
- No new infrastructure required
- No CTO resources needed

**Budget:** No CTO budget allocation required.

---

### LIGHT - Progetti Leggeri

**Description:** Small-scale projects with limited infrastructure impact, short duration, and low complexity.

**Example Projects:**
- New Mobile App Functions
- Small feature additions to existing systems

**CTO Budget Estimate:**
- **Total:** €50,000 - €100,000 (IVA inclusa)
- **CAPEX:** €40,000 - €60,000
- **OPEX:** €20,000 - €40,000

---

### MEDIUM - Progetti Medi

**Description:** Medium-scale projects with moderate infrastructure impact and complexity, requiring significant but manageable CTO resources.

**Example Projects:**
- DOL Evolution
- System enhancements with new integrations

**CTO Budget Estimate:**
- **Total:** €100,000 - €200,000 (IVA inclusa)
- **CAPEX:** €60,000 - €110,000
- **OPEX:** €40,000 - €90,000

---

### COMPLESSO - Progetti Complessi

**Description:** Large-scale, complex projects with considerable infrastructure impact, long duration, and high technical risk.

**Example Projects:**
- CORPORATE platform implementations
- Major system overhauls

**CTO Budget Estimate:**
- **Total:** €200,000 - €500,000 (IVA inclusa)
- **CAPEX:** €110,000 - €225,000
- **OPEX:** €90,000 - €275,000

---

### SPECIALE - Progetti Speciali

**Description:** Strategic, multi-year initiatives with substantial infrastructure and organizational impact. Require custom evaluation.

**Example Projects:**
- FREE/Open Finance
- Enterprise-wide transformations

**CTO Budget Estimate:**
- **Total:** >€500,000 (IVA inclusa)
- **CAPEX/OPEX:** To be determined based on specific project requirements

---

## Classification Criteria

### 1. Project Budget (Overall)

| Band           | Budget Range (k€, IVA inclusa) |
|----------------|--------------------------------|
| NO IMPATTI CTO | -                              |
| LIGHT          | Up to 500                      |
| MEDIUM         | 500 - 1,000                    |
| COMPLESSO      | 1,000 - 5,000                  |
| SPECIALE       | > 5,000                        |

---

### 2. Project Duration

| Band           | Duration   |
|----------------|------------|
| NO IMPATTI CTO | -          |
| LIGHT          | 1-6 months |
| MEDIUM         | 7-9 months |
| COMPLESSO      | > 1 year   |
| SPECIALE       | Multi-year |

---

### 3. Architectural/Infrastructure Impact

| Band           | Impact                                         |
|----------------|------------------------------------------------|
| NO IMPATTI CTO | NO                                             |
| LIGHT          | YES - Limited changes to existing architecture |
| MEDIUM         | YES - Moderate changes, new components         |
| COMPLESSO      | YES - Considerable architectural changes       |
| SPECIALE       | YES - Substantial transformation               |

---

### 4. Impact Magnitude

| Band           | Magnitude                                    |
|----------------|----------------------------------------------|
| NO IMPATTI CTO | N/A                                          |
| LIGHT          | Limited (confined to specific system/module) |
| MEDIUM         | Moderate (affects multiple systems)          |
| COMPLESSO      | Considerable (enterprise-wide impact)        |
| SPECIALE       | Substantial (strategic transformation)       |

---

### 5. Technological Impact

| Band           | Technology Approach                                |
|----------------|----------------------------------------------------|
| NO IMPATTI CTO | N/A                                                |
| LIGHT          | Continuity with AS IS (existing tech stack)        |
| MEDIUM         | Tech evolution (no fundamentally new technologies) |
| COMPLESSO      | Evolution + some new technologies                  |
| SPECIALE       | Technology change (major new tech adoption)        |

---

### 6. Service Risk

| Band           | Risk Level                               |
|----------------|------------------------------------------|
| NO IMPATTI CTO | N/A                                      |
| LIGHT          | Minimal (low business impact if failure) |
| MEDIUM         | Moderate (medium business impact)        |
| COMPLESSO      | Relevant (high business impact)          |
| SPECIALE       | Radical (critical business service)      |

---

### 7. Pipeline / CI-CD Pipelines

| Band           | Number of Pipelines |
|----------------|---------------------|
| NO IMPATTI CTO | N/A                 |
| LIGHT          | Max 5               |
| MEDIUM         | 5 - 15              |
| COMPLESSO      | 15 - 40             |
| SPECIALE       | > 40                |

**Note:** This refers to the total number of CI/CD pipelines to be created or modified for the project. Thresholds aligned to market standards where typical ratio is ~1 pipeline every 2-3 microservices.

---

### 8. Number of Microservices

| Band           | New Containers/Microservices |
|----------------|------------------------------|
| NO IMPATTI CTO | N/A                          |
| LIGHT          | 0 - 15 new containers        |
| MEDIUM         | 16 - 30 new containers       |
| COMPLESSO      | 31 - 100 new containers      |
| SPECIALE       | > 100 new containers         |

**Mapping to Form Field:** `microservicesCount`

---

### 9. Database Impact (DIP - Data Integration Platform)

| Band           | DIP Storage Impact |
|----------------|--------------------|
| NO IMPATTI CTO | N/A                |
| LIGHT          | < 1 TB             |
| MEDIUM         | 1 - 10 TB          |
| COMPLESSO      | 10 - 50 TB         |
| SPECIALE       | > 50 TB            |

**Mapping to Form Field:** `hasDatabaseImpactDip` + `storageGb`

**Note:** DIP refers to Oracle Exadata integration. This is data volume impact on the centralized data platform.

---

### 10. Database Impact (Host - Mainframe)

| Band           | Mainframe DB Storage Impact |
|----------------|-----------------------------|
| NO IMPATTI CTO | N/A                         |
| LIGHT          | < 10 GB                     |
| MEDIUM         | 10 - 50 GB                  |
| COMPLESSO      | 50 - 100 GB                 |
| SPECIALE       | > 100 GB                    |

**Mapping to Form Field:** `hasDatabaseImpactHostDb2` + database size

**Note:** This refers to DB2 mainframe database impact.

---

### 11. Computing Power (Cores)

| Band           | Total vCPU Cores |
|----------------|------------------|
| NO IMPATTI CTO | N/A              |
| LIGHT          | 0 - 30 cores     |
| MEDIUM         | 30 - 60 cores    |
| COMPLESSO      | 60 - 200 cores   |
| SPECIALE       | > 200 cores      |

**Mapping to Form Field:** `computeCores`

---

### 12. Batch Scheduling

| Band           | Number of Scheduled Batches |
|----------------|-----------------------------|
| NO IMPATTI CTO | N/A                         |
| LIGHT          | 0 - 30                      |
| MEDIUM         | 30 - 60                     |
| COMPLESSO      | 60 - 200                    |
| SPECIALE       | > 200                       |

**Mapping to Form Field:** `scheduledBatches`

---

### 13. Monitoring Systems

| Band           | Monitoring Approach                           |
|----------------|-----------------------------------------------|
| NO IMPATTI CTO | N/A                                           |
| LIGHT          | Existing systems (no new monitoring required) |
| MEDIUM         | YES - New dashboards/alerts required          |
| COMPLESSO      | YES - Advanced monitoring and observability   |
| SPECIALE       | YES - Enterprise-wide monitoring platform     |

**Mapping to Form Field:** `monitoringSystems`

---

### 14. Observability

| Band           | Observability Requirements                   |
|----------------|----------------------------------------------|
| NO IMPATTI CTO | N/A                                          |
| LIGHT          | Existing observability (no new requirements) |
| MEDIUM         | YES - Basic observability (logs, metrics)    |
| COMPLESSO      | YES - Advanced observability (traces, APM)   |
| SPECIALE       | YES - Full-stack observability platform      |

**Mapping to Form Field:** `observability`

---

---

**NOTE:** Criteria 15-16 (Test Magnitude, Test Complexity) have been removed as application testing is outside CTO scope.

---

## Classification Algorithm

### Step 1: Evaluate All Criteria
For each criterion (1-14), determine which band the project falls into based on the criterion's value.

### Step 2: Apply "Most Restrictive" Rule
The project is classified into the **highest band** that **at least one criterion** matches.

**Example:**
- microservicesCount = 8 → LIGHT (0-15)
- computeCores = 45 → MEDIUM (30-60)
- pipeline = 25 → COMPLESSO (15-40)

**Result:** Project is **COMPLESSO** (highest band matched by at least one criterion).

### Step 3: Validate Against Budget Estimate
Check if the estimated CTO budget aligns with the band's typical range. If significantly different, review classification or estimate.

---

## Usage Instructions for AI Agent

When classifying a project:

1. **Extract Relevant Form Fields:**
   - projectBudget
   - projectDuration
   - architecturalImpact
   - technologicalImpact
   - serviceRisk
   - pipeline (interpreted as number of pipelines)
   - microservicesCount
   - hasDatabaseImpactDip + storageGb
   - hasDatabaseImpactHostDb2
   - computeCores
   - scheduledBatches
   - monitoringSystems
   - observability

2. **Map Each Field to Band Thresholds:**
   - Compare field value against criteria table
   - Record which band each criterion suggests

3. **Determine Final Band:**
   - Select the **highest band** that at least one criterion matches
   - If multiple criteria suggest the same band, increase confidence

4. **Generate Estimate:**
   - Use the band's CAPEX/OPEX range as a **sanity check**
   - Bottom-up estimate should align with the band's typical budget
   - Flag discrepancies for human review

5. **Document Classification:**
   - List which criteria triggered the classification
   - Example: "Project classified as COMPLESSO due to: computeCores=80 (60-200 range), pipeline=25 (15-40 range)"

---

## Example Classifications

### Example 1: LIGHT Project

**Input:**
- microservicesCount: 5
- computeCores: 16
- storageGb: 50
- projectDuration: "3 mesi"

**Analysis:**
- Microservices: 5 → LIGHT (0-15)
- Compute: 16 → LIGHT (0-30)
- Storage: 50 GB → LIGHT (<1 TB)
- Duration: 3 months → LIGHT (1-6 months)
- Testing: 50 cases → LIGHT (<100)

**Classification:** **LIGHT** (all criteria align)

**Expected CTO Budget:** €50-100k

---

### Example 2: MEDIUM Project

**Input:**
- microservicesCount: 20
- computeCores: 40
- storageGb: 300 (with hasDatabaseImpactDip = true → 0.3 TB DIP)
- projectDuration: "6 mesi"

**Analysis:**
- Microservices: 20 → MEDIUM (16-30)
- Compute: 40 → MEDIUM (30-60)
- DIP Storage: 0.3 TB → LIGHT (<1 TB) ⚠️
- Duration: 6 months → LIGHT (1-6) ⚠️
- Testing: 500 cases → MEDIUM (100-1,000)

**Classification:** **MEDIUM** (most criteria align, 2 suggest LIGHT but MEDIUM is higher)

**Expected CTO Budget:** €100-200k

---

### Example 3: COMPLESSO Project

**Input:**
- microservicesCount: 45
- computeCores: 120
- storageGb: 2000 (with hasDatabaseImpactDip = true → 2 TB DIP)
- projectDuration: "18 mesi"
- serviceRisk: "Alto"

**Analysis:**
- Microservices: 45 → COMPLESSO (31-100)
- Compute: 120 → COMPLESSO (60-200)
- DIP Storage: 2 TB → MEDIUM (1-10 TB) ⚠️
- Duration: 18 months → COMPLESSO (>1 year)
- Testing: 3,000 cases → COMPLESSO (1,000-10,000)
- Risk: Alto → COMPLESSO (Relevant)

**Classification:** **COMPLESSO** (majority of criteria align)

**Expected CTO Budget:** €200-500k

---

## Validation Rules

### Rule 1: Budget Alignment Check
If the bottom-up cost estimate is **significantly outside** the band's budget range (±30%), flag for review:

```
IF estimated_budget < band_min * 0.7 OR estimated_budget > band_max * 1.3:
  FLAG "Warning: Estimate (€X) outside typical range for {band} (€{band_min}-{band_max}). Review classification or estimate."
```

### Rule 2: Duration vs Budget Check
Long duration with low budget (or vice versa) may indicate misclassification:

```
IF projectDuration > 12 months AND estimated_budget < €150k:
  FLAG "Warning: Long duration (>1 year) with low budget. Verify resource allocation."
```

### Rule 3: Microservices + Low Compute Check
High microservice count with low compute cores may indicate sizing issue:

```
IF microservicesCount > 30 AND computeCores < 60:
  FLAG "Warning: High microservice count ({count}) with low compute allocation ({cores} cores). Verify sizing."
```

---

## Notes

- **IVA Inclusa:** All budget estimates include 22% IVA (Italian VAT)
- **Reference Only:** Specific costs must be validated with current vendor contracts
- **Thresholds May Evolve:** Classification criteria should be reviewed annually
- **Human Override:** Classification is advisory; final approval authority rests with CTO office

---

**Document Status:** ✅ Validated - Classification criteria extracted from official Budget CTO template
