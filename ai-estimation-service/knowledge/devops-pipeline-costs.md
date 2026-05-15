# DevOps Pipeline & CI/CD Implementation Costs (CAPEX)

**Last Updated:** 2026-05-12  
**Purpose:** Cost estimation for CI/CD pipeline implementation and DevOps automation

---

## Overview

Pipeline costs cover the implementation and configuration of CI/CD automation for build, test, security scanning, and deployment across multiple environments. Costs are based on supplier professional services rates and project complexity.

**Key Consideration:** Evolutive projects (enhancements to existing applications) typically reuse existing pipeline infrastructure and require minimal or no new pipeline setup.

---

## Cost Levels

### LVL1 - No Pipeline Implementation Required

**Cost:** €0 (IVA esclusa)  
**Total:** €0

**When to Apply:**

1. **Evolutiva (enhancement to existing application)**
   - Application already has CI/CD pipelines in place
   - Existing pipeline infrastructure is reusable
   - Only code changes, no infrastructure/deployment changes
   
2. **Application with existing pipeline infrastructure**
   - Pipelines already implemented and operational
   - No new build/deploy workflows required
   - Minor configuration updates handled within OPEX maintenance
   
3. **Project without CI/CD requirements**
   - Infrastructure-only projects (no application code)
   - Appliance/hardware deployment
   - Configuration-only changes
   - Manual deployment process accepted by business

**Example Scenarios:**
- Adding new features to existing microservices (code changes only)
- Database schema migration (no CI/CD required)
- Network appliance configuration
- Existing application with 5 microservices, adding 2 more endpoints (same pipeline)

---

### LVL2 - Standard Pipeline Implementation

**Cost:** €6,000 (IVA esclusa) = **€7,320** (IVA 22% inclusa)

**When to Apply:**

1. **New LIGHT or MEDIUM classified project**
   - project_classification: LIGHT or MEDIUM
   - Standard complexity CI/CD requirements
   - Limited number of pipelines (<10)
   
2. **Standard pipeline requirements**
   - Basic build automation
   - Standard deployment workflow (DEV → TEST → PRE-PROD → PROD)
   - Basic automated testing integration
   - Standard artifact management

**What's Included:**
- Build pipeline setup (Maven/Gradle, npm, Docker)
- Deployment automation to OpenShift/Kubernetes
- Basic test integration (unit tests execution)
- Artifact repository configuration (Nexus/Artifactory)
- Standard security scanning (SonarQube)
- Multi-environment deployment configuration

**Example Scenarios:**
- New web application with 8 microservices (LIGHT)
- MEDIUM project with standard 3-tier architecture
- Mobile app backend with standard CI/CD flow
- Internal tool with basic build/deploy requirements

---

### LVL3 - Advanced Pipeline Implementation

**Cost:** €10,000 (IVA esclusa) = **€12,200** (IVA 22% inclusa)

**When to Apply:**

1. **New COMPLESSO or SPECIALE classified project**
   - project_classification: COMPLESSO or SPECIALE
   - Complex CI/CD requirements
   - Many pipelines (10+) or complex orchestration
   
2. **Advanced pipeline requirements**
   - Complex build orchestration (monorepo, multi-module)
   - Advanced deployment strategies (blue/green, canary)
   - Comprehensive automated testing (integration, performance, security)
   - Multi-cloud or hybrid deployment
   - Advanced compliance/governance requirements

**What's Included:**
- All LVL2 components PLUS:
- Complex build orchestration and dependency management
- Advanced deployment strategies (blue/green, canary, rolling updates)
- Comprehensive test automation integration (E2E, performance, security tests)
- Advanced security scanning (SAST, DAST, dependency scanning)
- Container security scanning
- Compliance checks and approval gates
- Multi-cloud/hybrid deployment configuration
- GitOps implementation (ArgoCD/Flux)
- Advanced monitoring integration (deployment tracking, rollback automation)

**Example Scenarios:**
- COMPLESSO project with 50 microservices across multiple domains
- Mission-critical application requiring blue/green deployments
- Multi-cloud deployment (on-premise + AWS)
- Application requiring comprehensive compliance automation (security gates, approval workflows)

---

## Decision Tree

```
START
  │
  ├─ Is this an evolutiva (enhancement to existing app)?
  │  └─ YES → LVL1 (€0)
  │
  ├─ Application already has pipeline infrastructure?
  │  └─ YES → LVL1 (€0)
  │
  ├─ Project type = Infrastructure only / Appliance / Configuration?
  │  └─ YES → LVL1 (€0)
  │
  ├─ Project classification = COMPLESSO or SPECIALE?
  │  └─ YES → LVL3 (€12,200)
  │
  ├─ Project classification = MEDIUM or LIGHT?
  │  └─ YES → LVL2 (€7,320)
  │
  └─ Default (new application) → LVL2 (€7,320)
```

---

## Implementation in AI Agent

### Required Form Fields

```typescript
interface PipelineInputs {
  // Existing fields
  project_classification: 'LIGHT' | 'MEDIUM' | 'COMPLESSO' | 'SPECIALE';
  microservicesCount: number;
  
  // Fields for pipeline logic (verify presence in form)
  projectType?: 'Nuovo' | 'Evolutiva' | 'Infrastruttura' | 'Configurazione';
  hasExistingPipelines?: boolean;
  requiresAdvancedDeployment?: boolean; // blue/green, canary, etc.
  requiresMultiCloudDeployment?: boolean;
  requiresComplianceAutomation?: boolean;
}
```

### Calculation Logic

```typescript
function calculatePipelineCapex(inputs: PipelineInputs): number {
  const LVL1 = 0;
  const LVL2 = 7320;  // €6,000 + IVA 22%
  const LVL3 = 12200; // €10,000 + IVA 22%
  
  // LVL1: No pipeline implementation required
  if (inputs.projectType === 'Evolutiva') {
    return LVL1;
  }
  
  if (inputs.hasExistingPipelines === true) {
    return LVL1;
  }
  
  if (inputs.projectType === 'Infrastruttura' || 
      inputs.projectType === 'Configurazione') {
    return LVL1;
  }
  
  // LVL3: Complex pipeline requirements
  if (inputs.project_classification === 'COMPLESSO' || 
      inputs.project_classification === 'SPECIALE') {
    return LVL3;
  }
  
  if (inputs.requiresAdvancedDeployment === true ||
      inputs.requiresMultiCloudDeployment === true ||
      inputs.requiresComplianceAutomation === true) {
    return LVL3;
  }
  
  // LVL2: Standard pipeline implementation
  return LVL2;
}
```

---

## Pipeline Scope by Project Classification

### LIGHT Projects
- **Expected Pipelines:** <5
- **Typical Setup:** 1-2 microservices, simple build/deploy
- **Cost Level:** LVL2 (€7,320)
- **Example:** Mobile app backend with 3 microservices

### MEDIUM Projects
- **Expected Pipelines:** 5-15
- **Typical Setup:** Multiple microservices, standard 3-tier architecture
- **Cost Level:** LVL2 (€7,320)
- **Example:** Internal portal with 12 microservices

### COMPLESSO Projects
- **Expected Pipelines:** 15-40
- **Typical Setup:** Complex microservices architecture, multiple domains
- **Cost Level:** LVL3 (€12,200)
- **Example:** Customer platform with 35 microservices across 5 domains

### SPECIALE Projects
- **Expected Pipelines:** >40
- **Typical Setup:** Enterprise-wide platform, multi-cloud, advanced automation
- **Cost Level:** LVL3 (€12,200)
- **Example:** Open Banking platform with 80 microservices, hybrid cloud deployment

---

## Validation Rules

### Warning Triggers

1. **COMPLESSO/SPECIALE with LVL1**
   - Flag: "Complex project classified with no CI/CD pipeline. Verify if evolutiva or infrastructure-only."

2. **High microservice count (>15) with LVL1**
   - Flag: "High microservice count ({count}) with no pipeline implementation. Verify if existing pipelines cover new services."

3. **New application with LVL1**
   - Flag: "New application with no CI/CD pipeline. Manual deployment processes increase operational risk."

4. **LIGHT/MEDIUM with LVL3**
   - Flag: "Simple project with advanced pipeline costs. Verify if requirements justify complexity."

---

## Cost Breakdown in Estimate

When including in final estimate:

```json
{
  "breakdown": {
    "capex": {
      "devops_pipeline": {
        "level": "LVL2",
        "cost": 7320,
        "description": "CI/CD pipeline implementation (build, test, deploy automation)",
        "environments": ["DEV", "TEST", "PRE-PROD", "PROD"],
        "components": [
          "Build automation",
          "Deployment automation",
          "Test integration",
          "Security scanning",
          "Artifact management"
        ]
      }
    }
  },
  "line_items": [
    {
      "category": "CAPEX",
      "subcategory": "DevOps Pipeline",
      "description": "CI/CD pipeline setup for MEDIUM project (standard build/deploy/test automation)",
      "unit_cost": 7320,
      "quantity": 1,
      "total_cost": 7320,
      "notes": "Standard pipeline covering 12 microservices with multi-environment deployment"
    }
  ]
}
```

---

## Professional Services Breakdown

Pipeline implementation costs are based on supplier rates:

| Activity | Effort (days) | Rate (€/day) | Cost |
|----------|---------------|--------------|------|
| **LVL2 - Standard Pipeline** ||||
| Requirements analysis | 1 | €650 | €650 |
| Pipeline design | 2 | €650 | €1,300 |
| Implementation & configuration | 5 | €650 | €3,250 |
| Testing & validation | 1 | €500 | €500 |
| Documentation | 0.5 | €500 | €250 |
| **Subtotal** | **9.5 days** || **€5,950** |
| **IVA 22%** ||| **€1,309** |
| **Total LVL2** ||| **€7,259** ≈ **€7,320** |

| Activity | Effort (days) | Rate (€/day) | Cost |
|----------|---------------|--------------|------|
| **LVL3 - Advanced Pipeline** ||||
| Requirements analysis | 2 | €700 | €1,400 |
| Advanced pipeline design | 3 | €700 | €2,100 |
| Implementation & configuration | 7 | €700 | €4,900 |
| Advanced testing (performance, security) | 2 | €650 | €1,300 |
| Documentation & knowledge transfer | 1 | €500 | €500 |
| **Subtotal** | **15 days** || **€10,200** |
| **IVA 22%** ||| **€2,244** |
| **Total LVL3** ||| **€12,444** ≈ **€12,200** |

---

## Notes

- **IVA (22%)** is already included in the costs shown
- **Pipeline infrastructure** (Jenkins, GitLab CI, ArgoCD) is assumed to be already available (OPEX)
- **Pipeline maintenance** and ongoing updates are covered by OPEX support contracts
- **Reusable templates** may reduce effort for subsequent similar projects (considered in evolutiva logic)
- **Cloud-native deployments** (OpenShift, Kubernetes) are standard; VM-based deployments may require adjustments

---

**Document Version:** 1.0  
**Source:** Budget CTO v2.1 - DevOps cost structure  
**For:** Crédit Agricole IT Infrastructure Cost Estimation