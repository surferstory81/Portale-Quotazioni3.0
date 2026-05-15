# Dynatrace Dashboard Implementation Costs (CAPEX)

**Last Updated:** 2026-05-12  
**Purpose:** Cost estimation for Dynatrace dashboard implementation via external service provider

---

## Overview

Crédit Agricole uses **Dynatrace** for application and infrastructure monitoring across **2 environments**:
- Production (PROD)
- Pre-Production (PRE-PROD)

Dashboard implementation is performed by an **external service provider** with costs varying based on application criticality and monitoring scope.

---

## Cost Levels

### LVL1 - No Monitoring Required

**Cost:** €0 (IVA esclusa)  
**Total (2 environments):** €0

**When to Apply:**

1. **Third-party application with no integration monitoring**
   - Vendor-provided monitoring sufficient
   - No CA-specific metrics required
   
2. **Already monitored application with no new critical components**
   - Existing dashboard covers all functionality
   - No architecture changes requiring monitoring updates
   
3. **Low-criticality microservices application**
   - Business impact minimal if unavailable
   - Basic infrastructure monitoring sufficient
   
4. **Appliance/hardware device**
   - Vendor-managed monitoring
   - No application-level observability required

**Example Scenarios:**
- Cisco firewall appliance (vendor SNMP monitoring)
- SaaS application (vendor provides monitoring)
- Existing dashboard for application with no changes

---

### LVL2 - Integrative Monitoring

**Cost:** €6,000 (IVA esclusa) = **€7,320** (IVA 22% inclusa)  
**Total (2 environments):** €7,320 × 2 = **€14,640**

**When to Apply:**

1. **Third-party application requiring integrative monitoring**
   - Business owner requests CA-specific monitoring
   - Integration points need observability
   - Custom metrics required beyond vendor monitoring
   
2. **New low-criticality application**
   - serviceRisk: Basso
   - Limited business impact
   - Standard monitoring sufficient
   
3. **Existing monitored application with new critical components/features**
   - Dashboard exists but needs extension
   - New microservices added
   - New integration points
   - New critical functionality

**Example Scenarios:**
- Third-party CRM with custom integration monitoring
- New internal tool with 8 microservices (serviceRisk: Basso)
- Existing app adding payment gateway integration
- Adding 5 new microservices to existing monitored platform

---

### LVL3 - Full Application Monitoring

**Cost:** €10,000 (IVA esclusa) = **€12,200** (IVA 22% inclusa)  
**Total (2 environments):** €12,200 × 2 = **€24,400**

**When to Apply:**

1. **New application with medium or high criticality**
   - serviceRisk: Medio or Alto
   - Significant business impact if unavailable
   - Requires comprehensive full-stack monitoring
   
2. **Complex or Special projects (by classification)**
   - project_classification: COMPLESSO or SPECIALE
   - Extensive architecture requiring deep observability
   
3. **Mission-critical business applications**
   - Production outage has severe business consequences
   - Requires proactive monitoring, alerting, and SLA tracking

**Example Scenarios:**
- New customer-facing banking portal (serviceRisk: Alto)
- COMPLESSO project with 60 microservices
- Payment processing platform (mission-critical)
- Public API gateway serving external clients

---

## Decision Tree

```
START
  │
  ├─ Is appliance/hardware device?
  │  └─ YES → LVL1 (€0)
  │
  ├─ Third-party app with no CA monitoring needs?
  │  └─ YES → LVL1 (€0)
  │
  ├─ Already monitored + no new critical components?
  │  └─ YES → LVL1 (€0)
  │
  ├─ Project classification = COMPLESSO or SPECIALE?
  │  └─ YES → LVL3 (€24,400)
  │
  ├─ serviceRisk = Alto or Medio?
  │  └─ YES → LVL3 (€24,400)
  │
  ├─ New application + serviceRisk = Basso?
  │  └─ YES → LVL2 (€14,640)
  │
  ├─ Third-party app + monitoring integration requested?
  │  └─ YES → LVL2 (€14,640)
  │
  ├─ Already monitored + new critical components/features?
  │  └─ YES → LVL2 (€14,640)
  │
  └─ Default (safety) → LVL2 (€14,640)
```

---

## Implementation in AI Agent

### Required Form Fields

```typescript
interface MonitoringInputs {
  // Existing fields
  project_classification: 'LIGHT' | 'MEDIUM' | 'COMPLESSO' | 'SPECIALE';
  serviceRisk: 'Alto' | 'Medio' | 'Basso';
  microservicesCount: number;
  
  // Fields for monitoring logic (verify presence in form)
  isAppliance?: boolean;
  isThirdPartyApp?: boolean;
  requiresMonitoringIntegration?: boolean; // if third-party
  hasExistingMonitoring?: boolean;
  hasNewCriticalComponents?: boolean; // if existing monitoring
  isNewApplication?: boolean;
}
```

### Calculation Logic

```typescript
function calculateDynatraceDashboardCapex(inputs: MonitoringInputs): number {
  const LVL1 = 0;
  const LVL2 = 14640; // €7,320 × 2 environments
  const LVL3 = 24400; // €12,200 × 2 environments
  
  // LVL1: No monitoring required
  if (inputs.isAppliance === true) {
    return LVL1;
  }
  
  if (inputs.isThirdPartyApp === true && 
      inputs.requiresMonitoringIntegration !== true) {
    return LVL1;
  }
  
  if (inputs.hasExistingMonitoring === true && 
      inputs.hasNewCriticalComponents !== true) {
    return LVL1;
  }
  
  // LVL3: High criticality
  if (inputs.project_classification === 'COMPLESSO' || 
      inputs.project_classification === 'SPECIALE') {
    return LVL3;
  }
  
  if (inputs.serviceRisk === 'Alto' || inputs.serviceRisk === 'Medio') {
    return LVL3;
  }
  
  // LVL2: All other cases requiring monitoring
  return LVL2;
}
```

---

## Validation Rules

### Warning Triggers

1. **COMPLESSO/SPECIALE with LVL1**
   - Flag: "Complex project classified with no monitoring. Verify if this is correct."

2. **serviceRisk Alto with LVL1 or LVL2**
   - Flag: "High-risk service with insufficient monitoring level. Consider LVL3."

3. **Many microservices (>30) with LVL1**
   - Flag: "High microservice count ({count}) with no monitoring. Verify configuration."

---

## Cost Breakdown in Estimate

When including in final estimate:

```json
{
  "breakdown": {
    "capex": {
      "monitoring_observability": {
        "dashboard_implementation": {
          "level": "LVL3",
          "cost_per_environment": 12200,
          "environments": 2,
          "total": 24400,
          "description": "Dynatrace full-stack dashboard implementation for PROD and PRE-PROD environments",
          "provider": "External service"
        }
      }
    }
  },
  "line_items": [
    {
      "category": "CAPEX",
      "subcategory": "Monitoring & Observability",
      "description": "Dynatrace dashboard implementation (LVL3 - Full monitoring) for 2 environments",
      "unit_cost": 12200,
      "quantity": 2,
      "total_cost": 24400,
      "notes": "New application with Alto service risk requires comprehensive monitoring"
    }
  ]
}
```

---

## Notes

- **IVA (22%)** is already included in the costs shown
- **2 environments** (PROD + PRE-PROD) are standard for all projects
- **External service provider** handles implementation (not internal CA resources)
- **License costs (OPEX)** are separate and calculated based on monitored resources
- **Dashboard maintenance** post-implementation is covered by OPEX support contracts

---

**Document Version:** 1.0  
**Source:** Budget CTO v2.1 - Monitoring cost structure  
**For:** Crédit Agricole IT Infrastructure Cost Estimation
