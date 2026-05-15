# Professional Services - Costs (CAPEX)

**Last Updated:** 2026-05-13  
**Purpose:** Cost estimation for CTO professional services (feasibility studies, RFC support, infrastructure implementation)

---

## Overview

Professional services cover CTO team support for:
1. **Infrastructure Feasibility Study** - Technical analysis and solution design
2. **RFC Support & Infrastructure Implementation** - Change management and infrastructure realization

**Key Principle:** These services are **optional** based on project needs, determined by form fields.

---

## 1️⃣ Studio di Fattibilità Infrastrutturale

### Decision Tree

```
START
  │
  ├─ requiresFeasibilityStudy == false?
  │  └─ YES → €0 (Not requested)
  │
  ├─ project_classification == LIGHT?
  │  └─ YES → Cloud Engineer only (1 month)
  │
  ├─ project_classification == MEDIUM?
  │  └─ YES → Cloud Engineer + PM (1 month)
  │
  ├─ project_classification == COMPLESSO or SPECIALE?
  │  └─ YES → Full team: Architect + Engineer + PM (2 months)
  │
  └─ Default → €0
```

---

### Cost Levels

#### Level 0 - No Feasibility Study

**Cost:** €0

**When to Apply:**
- `requiresFeasibilityStudy == false`
- Requestor doesn't need CTO feasibility analysis
- Solution already defined by business/vendor

---

#### Level 1 - LIGHT Projects (Cloud Engineer Only)

**Duration:** 1 month (20 working days)

**Team Composition:**
- 1.0 FTE Cloud Engineer @ €450/day

**Calculation:**
```
Cost = 20 days × €450 × 1.22 (IVA)
     = €9,000 × 1.22
     = €10,980
```

**What's Included:**
- Infrastructure requirements analysis
- Technical solution design
- Technology stack recommendation
- Basic architecture diagram
- Feasibility report

**Example Scenarios:**
- Small new application (5-10 microservices)
- Standard infrastructure requirements
- No complex integrations

---

#### Level 2 - MEDIUM Projects (Engineer + PM)

**Duration:** 1 month (20 working days)

**Team Composition:**
- 0.5 FTE Cloud Engineer @ €450/day = 10 days
- 0.3 FTE PM Junior @ €435/day = 6 days

**Calculation:**
```
Engineer:  10 days × €450 = €4,500
PM:         6 days × €435 = €2,610
Subtotal:                   €7,110
IVA 22%:                    €1,564
Total:                      €8,674
```

**What's Included:**
- Comprehensive infrastructure analysis
- Multi-environment design (DEV/TEST/PRE-PROD/PROD)
- Integration architecture
- Risk assessment
- Cost-benefit analysis
- Project planning support
- Feasibility report with recommendations

**Example Scenarios:**
- Medium application (15-30 microservices)
- Multiple integrations
- Requires cost optimization analysis

---

#### Level 3 - COMPLESSO/SPECIALE (Full Team)

**Duration:** 2 months (40 working days)

**Team Composition:**
- 0.5 FTE Cloud Solution Architect @ €610/day = 20 days
- 0.5 FTE Cloud Engineer @ €450/day = 20 days
- 0.3 FTE PM Junior @ €435/day = 12 days

**Calculation:**
```
Architect:  20 days × €610 = €12,200
Engineer:   20 days × €450 =  €9,000
PM:         12 days × €435 =  €5,220
Subtotal:                     €26,420
IVA 22%:                      €5,812
Total:                        €32,232
```

**What's Included:**
- Enterprise architecture design
- Multi-year roadmap planning
- Complex integration architecture
- Performance and scalability analysis
- Security architecture review
- Disaster recovery planning
- Capacity planning and sizing
- Vendor evaluation
- PoC (Proof of Concept) coordination
- Executive presentation
- Comprehensive feasibility study document

**Example Scenarios:**
- Large platform (50+ microservices)
- Strategic multi-year initiative
- Complex hybrid cloud architecture
- Mission-critical business service

---

## 2️⃣ Apertura RFC & Realizzazione Infrastrutture

### Decision Tree

```
START
  │
  ├─ requiresRfcSupport == false?
  │  └─ YES → €0 (Not requested)
  │
  ├─ project_classification == LIGHT?
  │  └─ YES → 1 month × 0.5 FTE (10 days)
  │
  ├─ project_classification == MEDIUM?
  │  └─ YES → 2 months × 0.5 FTE (20 days)
  │
  ├─ project_classification == COMPLESSO?
  │  └─ YES → 3 months × 0.5 FTE (30 days)
  │
  ├─ project_classification == SPECIALE?
  │  └─ YES → 4 months × 0.5 FTE (40 days)
  │
  └─ Default → €0
```

---

### Cost Levels

#### Level 0 - No RFC Support

**Cost:** €0

**When to Apply:**
- `requiresRfcSupport == false`
- Application team handles RFC process internally
- Simple deployment with no change management requirements

---

#### Level 1 - LIGHT Projects

**Duration:** 1 month × 0.5 FTE = 10 working days

**Team Composition:**
- Infrastructure Automation Specialist @ €400/day

**Calculation:**
```
Cost = 10 days × €400 × 1.22 (IVA)
     = €4,000 × 1.22
     = €4,880
```

**What's Included:**
- RFC preparation and submission (1-2 RFCs)
- Change Advisory Board (CAB) support
- Infrastructure implementation coordination
- Basic automation scripts
- Deployment documentation
- Post-deployment validation

---

#### Level 2 - MEDIUM Projects

**Duration:** 2 months × 0.5 FTE = 20 working days

**Team Composition:**
- Senior Infrastructure Automation Specialist @ €500/day

**Calculation:**
```
Cost = 20 days × €500 × 1.22 (IVA)
     = €10,000 × 1.22
     = €12,200
```

**What's Included:**
- Multiple RFC preparation (3-6 RFCs)
- CAB presentations and approvals
- Infrastructure implementation oversight
- Advanced automation (Ansible, Terraform)
- Environment provisioning
- Configuration management
- Integration testing support
- Rollback planning
- Deployment runbooks

---

#### Level 3 - COMPLESSO Projects

**Duration:** 3 months × 0.5 FTE = 30 working days

**Team Composition:**
- Senior Infrastructure Automation Specialist @ €500/day

**Calculation:**
```
Cost = 30 days × €500 × 1.22 (IVA)
     = €15,000 × 1.22
     = €18,300
```

**What's Included:**
- Comprehensive RFC management (6-12 RFCs)
- Complex change coordination
- Multi-environment infrastructure implementation
- CI/CD pipeline integration
- Infrastructure as Code (IaC) implementation
- Automated provisioning and configuration
- Compliance validation
- Performance tuning
- Knowledge transfer to operations team

---

#### Level 4 - SPECIALE Projects

**Duration:** 4 months × 0.5 FTE = 40 working days

**Team Composition:**
- Senior Infrastructure Automation Specialist @ €500/day
- System Administrator @ €430/day (for critical phases)

**Calculation:**
```
Senior Specialist: 40 days × €500 = €20,000
SysAdmin:          10 days × €430 =  €4,300
Subtotal:                           €24,300
IVA 22%:                            €5,346
Total:                              €29,646
```

**What's Included:**
- All Level 3 activities PLUS:
- Enterprise-scale RFC coordination (12+ RFCs)
- Complex dependency management
- Multi-year phased implementation planning
- Advanced automation framework
- Disaster recovery implementation
- High-availability configuration
- Security hardening
- Performance optimization
- Capacity planning execution
- 24/7 deployment support (critical phases)
- Extended knowledge transfer and training

---

## Implementation in AI Agent

### Required Form Fields

```typescript
interface ProfessionalServicesInputs {
  // Existing fields
  project_classification: 'LIGHT' | 'MEDIUM' | 'COMPLESSO' | 'SPECIALE';
  
  // NEW fields for professional services
  requiresFeasibilityStudy: boolean;  // Studio di Fattibilità
  requiresRfcSupport: boolean;        // Apertura RFC e Realizzazione Infra
}
```

---

### Calculation Logic

```typescript
function calculateProfessionalServicesCapex(inputs: ProfessionalServicesInputs): {
  feasibilityStudy: number;
  rfcSupport: number;
  total: number;
} {
  let feasibilityStudy = 0;
  let rfcSupport = 0;
  
  // 1. Studio di Fattibilità
  if (inputs.requiresFeasibilityStudy === true) {
    switch (inputs.project_classification) {
      case 'LIGHT':
        feasibilityStudy = 10980; // 20gg × €450 × 1.22
        break;
      case 'MEDIUM':
        feasibilityStudy = 8674;  // (10×€450 + 6×€435) × 1.22
        break;
      case 'COMPLESSO':
      case 'SPECIALE':
        feasibilityStudy = 32232; // (20×€610 + 20×€450 + 12×€435) × 1.22
        break;
    }
  }
  
  // 2. RFC Support
  if (inputs.requiresRfcSupport === true) {
    switch (inputs.project_classification) {
      case 'LIGHT':
        rfcSupport = 4880;   // 10gg × €400 × 1.22
        break;
      case 'MEDIUM':
        rfcSupport = 12200;  // 20gg × €500 × 1.22
        break;
      case 'COMPLESSO':
        rfcSupport = 18300;  // 30gg × €500 × 1.22
        break;
      case 'SPECIALE':
        rfcSupport = 29646;  // (40×€500 + 10×€430) × 1.22
        break;
    }
  }
  
  return {
    feasibilityStudy,
    rfcSupport,
    total: feasibilityStudy + rfcSupport
  };
}
```

---

## Validation Rules

### Warning Triggers

1. **COMPLESSO/SPECIALE without feasibility study**
   - Flag: "Complex project without feasibility study. Consider adding CTO technical analysis for risk mitigation."

2. **New infrastructure without RFC support**
   - Flag: "New infrastructure deployment without RFC support. Verify if change management process is covered."

3. **Both services declined for large project**
   - Flag: "Large project (COMPLESSO/SPECIALE) with no CTO services. Confirm if external support is sufficient."

---

## Cost Breakdown in Estimate

When including in final estimate:

```json
{
  "breakdown": {
    "capex": {
      "professional_services": {
        "feasibility_study": {
          "level": "LEVEL_3",
          "duration_months": 2,
          "team": [
            {
              "role": "Cloud Solution Architect",
              "fte": 0.5,
              "days": 20,
              "rate": 610,
              "cost": 12200
            },
            {
              "role": "Cloud Engineer",
              "fte": 0.5,
              "days": 20,
              "rate": 450,
              "cost": 9000
            },
            {
              "role": "PM Junior",
              "fte": 0.3,
              "days": 12,
              "rate": 435,
              "cost": 5220
            }
          ],
          "subtotal": 26420,
          "vat_22": 5812,
          "total": 32232
        },
        "rfc_support": {
          "level": "LEVEL_3",
          "duration_months": 3,
          "fte": 0.5,
          "days": 30,
          "rate": 500,
          "role": "Senior Infrastructure Automation Specialist",
          "subtotal": 15000,
          "vat_22": 3300,
          "total": 18300
        },
        "total_professional_services": 50532
      }
    }
  },
  "line_items": [
    {
      "category": "CAPEX",
      "subcategory": "Professional Services - Feasibility Study",
      "description": "Studio di Fattibilità (2 mesi): Architect (0.5 FTE), Engineer (0.5 FTE), PM (0.3 FTE)",
      "total_cost": 32232,
      "notes": "COMPLESSO project - comprehensive feasibility analysis with enterprise architecture design"
    },
    {
      "category": "CAPEX",
      "subcategory": "Professional Services - RFC Support",
      "description": "Apertura RFC e Realizzazione Infrastrutture (3 mesi, 0.5 FTE Senior Specialist)",
      "total_cost": 18300,
      "notes": "Change management and infrastructure implementation support"
    }
  ]
}
```

---

## Tariffario (Reply - 2026)

### Studio di Fattibilità

| Ruolo | Tariffa (IVA esclusa) | Tariffa (IVA 22%) | Fornitore |
|-------|------------------------|-------------------|-----------|
| PM Junior | €435/gg | €531/gg | Reply |
| Cloud Solution Architect | €610/gg | €744/gg | Reply |
| Cloud Engineer | €450/gg | €549/gg | Reply |

### RFC Support & Infrastructure Implementation

| Ruolo | Tariffa (IVA esclusa) | Tariffa (IVA 22%) | Fornitore |
|-------|------------------------|-------------------|-----------|
| Infrastructure Automation Specialist | €400/gg | €488/gg | Reply |
| Senior Infrastructure Automation Specialist | €500/gg | €610/gg | Reply |
| System Administrator | €430/gg | €525/gg | Reply |

---

## Examples

### Example 1: LIGHT Project - Feasibility Only

**Input:**
- project_classification: LIGHT
- requiresFeasibilityStudy: true
- requiresRfcSupport: false

**Result:**
- Feasibility Study: €10,980 (20gg Cloud Engineer)
- RFC Support: €0
- **Total: €10,980**

---

### Example 2: MEDIUM Project - Both Services

**Input:**
- project_classification: MEDIUM
- requiresFeasibilityStudy: true
- requiresRfcSupport: true

**Result:**
- Feasibility Study: €8,674 (Engineer + PM, 1 month)
- RFC Support: €12,200 (Senior Specialist, 2 months × 0.5 FTE)
- **Total: €20,874**

---

### Example 3: COMPLESSO Project - Full Services

**Input:**
- project_classification: COMPLESSO
- requiresFeasibilityStudy: true
- requiresRfcSupport: true

**Result:**
- Feasibility Study: €32,232 (Full team, 2 months)
- RFC Support: €18,300 (Senior Specialist, 3 months × 0.5 FTE)
- **Total: €50,532**

---

### Example 4: SPECIALE Project - Maximum Support

**Input:**
- project_classification: SPECIALE
- requiresFeasibilityStudy: true
- requiresRfcSupport: true

**Result:**
- Feasibility Study: €32,232 (Full team, 2 months)
- RFC Support: €29,646 (Senior Specialist + SysAdmin, 4 months × 0.5 FTE)
- **Total: €61,878**

---

### Example 5: No Services Required

**Input:**
- project_classification: MEDIUM
- requiresFeasibilityStudy: false
- requiresRfcSupport: false

**Result:**
- Feasibility Study: €0
- RFC Support: €0
- **Total: €0**

---

## Notes

- **IVA (22%)** is already included in all costs shown
- **FTE (Full-Time Equivalent):** 1.0 FTE = 20 working days/month
- **0.5 FTE** = 10 working days/month (part-time allocation)
- **Tariffe Reply** are from official tariffario 2026
- **Duration** is indicative; actual duration may vary based on project complexity
- **Services are optional** - determined by project needs and requestor choice
- **RFC Support** covers the entire project lifecycle, not just initial deployment
- **Feasibility Study** is typically performed in project initiation phase (before development starts)

---

**Document Version:** 1.0  
**Source:** Budget CTO v2.1 - Tariffario Reply 2026  
**For:** Crédit Agricole IT Infrastructure Cost Estimation