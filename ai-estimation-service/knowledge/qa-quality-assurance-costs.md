# Quality Assurance (QA) Costs (CAPEX)

**Last Updated:** 2026-05-12  
**Purpose:** Cost estimation for Quality Assurance activities in infrastructure projects

---

## Overview

Quality Assurance costs cover testing activities for infrastructure and integration components. QA is **optional** based on project owner's request and applies only to specific project categories.

**Key Principle:** QA is determined by the `qa` form field, which indicates if the requestor wants QA services.

---

## Decision Tree

```
START
  │
  ├─ qa field = 'NO'?
  │  └─ YES → €0 (Requestor explicitly declined QA)
  │
  ├─ hostMainframe = true?
  │  └─ YES → €0 (Mainframe components excluded from QA scope)
  │
  ├─ Exclusively SaaS? (saasProduct=true AND microservicesCount=0 AND infraOnVm=false)
  │  └─ YES → €0 (No infrastructure to test)
  │
  ├─ project_classification = COMPLESSO or SPECIALE?
  │  └─ YES → €27,450 (5 months × 0.5 FTE)
  │
  ├─ project_classification = MEDIUM AND estimated_capex >= €500,000?
  │  └─ YES → €10,980 (2 months × 0.5 FTE)
  │
  └─ Otherwise → €0 (LIGHT or MEDIUM below threshold)
```

---

## Cost Levels

### Level 0 - No QA Required

**Cost:** €0

**When to Apply:**

1. **Requestor declined QA**
   - Form field `qa = 'NO'`
   - Explicit decision not to include QA services
   
2. **Mainframe components present**
   - `hostMainframe = true`
   - Mainframe testing excluded from CTO scope (handled separately)
   
3. **Exclusively SaaS product**
   - `saasProduct = true`
   - AND `microservicesCount = 0`
   - AND `infraOnVm = false`
   - No infrastructure to test (SaaS vendor responsibility)

4. **Small projects below threshold**
   - `project_classification = 'LIGHT'`
   - OR `project_classification = 'MEDIUM'` with estimated CAPEX < €500k

**Example Scenarios:**
- Project owner chooses not to include QA
- Mainframe-only deployment
- Pure SaaS subscription (no custom infrastructure)
- Small LIGHT project with limited scope

---

### Level 1 - Standard QA (MEDIUM Projects)

**Cost:** €9,000 (IVA esclusa) = **€10,980** (IVA 22% inclusa)

**Effort:** 2 months × 0.5 FTE = 20 working days

**When to Apply:**
- `project_classification = 'MEDIUM'`
- AND estimated `total_capex >= €500,000`
- AND `qa != 'NO'`
- AND NOT mainframe
- AND NOT exclusively SaaS

**What's Included:**
- Infrastructure integration testing
- Performance and load testing (infrastructure level)
- Disaster recovery testing
- Backup/restore validation
- Smoke tests for infrastructure components
- Basic automation framework setup
- Test documentation and reports

**Professional Services Breakdown:**

| Activity | Effort | Rate (€/day) | Cost |
|----------|--------|--------------|------|
| QA planning and strategy | 2 days | €450 | €900 |
| Test case design (infrastructure) | 4 days | €450 | €1,800 |
| Test environment setup | 2 days | €450 | €900 |
| Test execution (manual + automated) | 8 days | €450 | €3,600 |
| Performance/load testing | 2 days | €450 | €900 |
| Defect reporting and verification | 1 day | €450 | €450 |
| Test documentation | 1 day | €450 | €450 |
| **Total** | **20 days** || **€9,000** |
| **IVA 22%** ||| **€1,980** |
| **Total with IVA** ||| **€10,980** |

**Example Scenarios:**
- MEDIUM project with €550k estimated CAPEX
- New infrastructure deployment with moderate complexity
- Integration testing for 20 microservices
- Performance validation for 40 compute cores

---

### Level 2 - Extended QA (COMPLESSO/SPECIALE Projects)

**Cost:** €22,500 (IVA esclusa) = **€27,450** (IVA 22% inclusa)

**Effort:** 5 months × 0.5 FTE = 50 working days

**When to Apply:**
- `project_classification = 'COMPLESSO'` OR `'SPECIALE'`
- AND `qa != 'NO'`
- AND NOT mainframe
- AND NOT exclusively SaaS

**What's Included:**
- All Level 1 activities PLUS:
- Comprehensive integration testing across multiple domains
- Advanced performance testing (stress, endurance, spike tests)
- Security testing (infrastructure vulnerabilities, penetration testing)
- Disaster recovery drills and failover testing
- Multi-environment testing (DEV, TEST, PRE-PROD, PROD)
- Advanced test automation (CI/CD integration)
- Capacity planning validation
- Compliance testing (regulatory requirements)
- Detailed test metrics and KPIs
- Knowledge transfer and training

**Professional Services Breakdown:**

| Activity | Effort | Rate (€/day) | Cost |
|----------|--------|--------------|------|
| QA strategy and planning | 4 days | €450 | €1,800 |
| Test case design (comprehensive) | 10 days | €450 | €4,500 |
| Test environment setup (multi-env) | 4 days | €450 | €1,800 |
| Test execution (manual + automated) | 18 days | €450 | €8,100 |
| Performance/load/stress testing | 6 days | €450 | €2,700 |
| Security testing | 3 days | €450 | €1,350 |
| Disaster recovery testing | 2 days | €450 | €900 |
| Defect management and verification | 2 days | €450 | €900 |
| Test documentation and reporting | 1 day | €450 | €450 |
| **Total** | **50 days** || **€22,500** |
| **IVA 22%** ||| **€4,950** |
| **Total with IVA** ||| **€27,450** |

**Example Scenarios:**
- COMPLESSO project with 60 microservices
- Multi-year SPECIALE initiative with complex architecture
- High-risk service requiring comprehensive validation
- Enterprise-wide platform deployment

---

## Implementation in AI Agent

### Required Form Fields

```typescript
interface QAInputs {
  // Existing fields
  project_classification: 'LIGHT' | 'MEDIUM' | 'COMPLESSO' | 'SPECIALE';
  qa: 'N/A' | 'YES' | 'NO';
  hostMainframe: boolean;
  saasProduct: boolean;
  microservicesCount: number;
  infraOnVm: boolean;
  
  // Calculated
  estimated_capex: number; // Total CAPEX from other components
}
```

### Calculation Logic

```typescript
function calculateQACapex(inputs: QAInputs): number {
  const LEVEL_0 = 0;
  const LEVEL_1_MEDIUM = 10980;  // €9,000 + IVA 22%
  const LEVEL_2_COMPLEX = 27450; // €22,500 + IVA 22%
  
  // LEVEL 0: Requestor declined QA
  if (inputs.qa === 'NO') {
    return LEVEL_0;
  }
  
  // LEVEL 0: Mainframe excluded
  if (inputs.hostMainframe === true) {
    return LEVEL_0;
  }
  
  // LEVEL 0: Exclusively SaaS (no infrastructure)
  if (inputs.saasProduct === true && 
      inputs.microservicesCount === 0 && 
      inputs.infraOnVm === false) {
    return LEVEL_0;
  }
  
  // LEVEL 2: COMPLESSO or SPECIALE
  if (inputs.project_classification === 'COMPLESSO' || 
      inputs.project_classification === 'SPECIALE') {
    return LEVEL_2_COMPLEX;
  }
  
  // LEVEL 1: MEDIUM with high CAPEX
  if (inputs.project_classification === 'MEDIUM' && 
      inputs.estimated_capex >= 500000) {
    return LEVEL_1_MEDIUM;
  }
  
  // LEVEL 0: All other cases (LIGHT, MEDIUM below threshold)
  return LEVEL_0;
}
```

---

## Validation Rules

### Warning Triggers

1. **COMPLESSO/SPECIALE with qa='NO'**
   - Flag: "Complex project with QA declined. Verify if this aligns with risk management requirements."

2. **High CAPEX MEDIUM without QA**
   - Flag: "MEDIUM project with CAPEX €{amount} (≥€500k threshold) but QA declined. Consider QA for projects of this scale."

3. **High serviceRisk without QA**
   - Flag: "High-risk service (serviceRisk: Alto) without QA. Recommend including QA for risk mitigation."

4. **Mainframe with qa='YES'**
   - Flag: "Mainframe components detected. QA for mainframe is handled separately (out of CTO scope)."

---

## Cost Breakdown in Estimate

When including in final estimate:

```json
{
  "breakdown": {
    "capex": {
      "qa_quality_assurance": {
        "level": "LEVEL_2",
        "effort_months": 5,
        "fte": 0.5,
        "working_days": 50,
        "daily_rate": 450,
        "cost_excluding_vat": 22500,
        "vat_22": 4950,
        "total_cost": 27450,
        "description": "Quality Assurance services for COMPLESSO project (5 months, 0.5 FTE)"
      }
    }
  },
  "line_items": [
    {
      "category": "CAPEX",
      "subcategory": "Quality Assurance",
      "description": "QA services for infrastructure and integration testing (5 months × 0.5 FTE)",
      "unit_cost": 450,
      "quantity": 50,
      "total_cost": 27450,
      "notes": "COMPLESSO project - comprehensive testing including performance, security, and DR validation"
    }
  ]
}
```

---

## QA Scope (What's Included)

### ✅ In Scope for CTO QA

- **Infrastructure testing:** VM, containers, networking, storage
- **Integration testing:** Service-to-service communication, API endpoints
- **Performance testing:** Load, stress, endurance testing (infrastructure level)
- **Disaster recovery:** Backup/restore, failover, recovery procedures
- **Security testing:** Infrastructure vulnerabilities, network security
- **Capacity validation:** Sizing, scalability, resource limits

### ❌ Out of Scope for CTO QA

- **Application functional testing:** Business logic, user workflows (application team responsibility)
- **User Acceptance Testing (UAT):** End-user validation (business owner responsibility)
- **Unit testing:** Code-level testing (development team responsibility)
- **Mainframe testing:** DB2, CICS, batch jobs (separate mainframe team)
- **SaaS vendor testing:** Third-party SaaS functionality (vendor responsibility)

---

## Notes

- **IVA (22%)** is already included in the costs shown
- **0.5 FTE** means part-time allocation over the specified months (can work on multiple projects)
- **QA effort is CAPEX** (one-time setup and validation), not OPEX
- **Ongoing support testing** (after go-live) is covered by OPEX support contracts
- **Field `qa`** in form allows project owner to opt-out even if project qualifies
- **Mainframe exclusion** is automatic regardless of `qa` field value
- **CAPEX threshold (€500k)** for MEDIUM projects is calculated from **total estimated CAPEX**, not project budget

---

## Examples

### Example 1: COMPLESSO Project with QA

**Input:**
- project_classification: COMPLESSO
- qa: 'YES'
- hostMainframe: false
- estimated_capex: €350,000

**Result:** €27,450 (Level 2 - Extended QA)

---

### Example 2: MEDIUM Project Below Threshold

**Input:**
- project_classification: MEDIUM
- qa: 'YES'
- hostMainframe: false
- estimated_capex: €400,000

**Result:** €0 (Below €500k threshold)

---

### Example 3: MEDIUM Project Above Threshold

**Input:**
- project_classification: MEDIUM
- qa: 'YES'
- hostMainframe: false
- estimated_capex: €550,000

**Result:** €10,980 (Level 1 - Standard QA)

---

### Example 4: Mainframe Project

**Input:**
- project_classification: COMPLESSO
- qa: 'YES'
- hostMainframe: true
- estimated_capex: €800,000

**Result:** €0 (Mainframe excluded)

---

### Example 5: Exclusively SaaS

**Input:**
- project_classification: MEDIUM
- qa: 'YES'
- saasProduct: true
- microservicesCount: 0
- infraOnVm: false
- estimated_capex: €200,000

**Result:** €0 (No infrastructure to test)

---

### Example 6: QA Declined by Requestor

**Input:**
- project_classification: COMPLESSO
- qa: 'NO'
- hostMainframe: false
- estimated_capex: €600,000

**Result:** €0 (Requestor explicitly declined)

---

**Document Version:** 1.0  
**Source:** Budget CTO v2.1 - QA cost structure  
**For:** Crédit Agricole IT Infrastructure Cost Estimation
