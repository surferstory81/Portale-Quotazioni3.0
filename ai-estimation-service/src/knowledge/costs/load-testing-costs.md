# Load Testing Applicativo - Costs (CAPEX)

**Last Updated:** 2026-05-12  
**Purpose:** Cost estimation for application load testing execution

---

## Overview

Load testing costs cover the **execution** of application performance tests under load conditions. This is separate from QA, which includes **verification of load test results**.

**Key Principle:** Load testing applies to **new applications** released by projects. Cost is calculated as a **percentage of estimated CAPEX**, as precise quotation depends on:
- Number of functionalities to test
- Integrations with other applications
- Transaction complexity
- Data volumes

Since these details are not fully captured in the form, we use a **parametric approach** based on project classification, service risk, and budget.

---

## Decision Tree

```
START
  │
  ├─ projectType = 'Evolution'?
  │  └─ YES → €0 (Existing app, load tests already done or not needed)
  │
  ├─ Exclusively SaaS? (saasProduct=true AND microservicesCount=0 AND infraOnVm=false)
  │  └─ YES → €0 (SaaS vendor responsibility)
  │
  ├─ hostMainframe = true?
  │  └─ YES → €0 (Mainframe testing separate scope)
  │
  ├─ project_classification = COMPLESSO or SPECIALE?
  │  ├─ serviceRisk = Alto or Radical?
  │  │  └─ LVL3: 10-12% of estimated_capex
  │  └─ serviceRisk = Medio or Relevant?
  │     └─ LVL2: 6-8% of estimated_capex
  │
  ├─ project_classification = MEDIUM?
  │  ├─ serviceRisk = Alto or Relevant?
  │  │  └─ LVL2: 6-8% of estimated_capex
  │  └─ serviceRisk = Basso or Minimal?
  │     └─ LVL1: 3-5% of estimated_capex
  │
  └─ project_classification = LIGHT?
     └─ LVL1: 3-5% of estimated_capex
```

---

## Cost Levels

### Level 0 - No Load Testing Required

**Cost:** €0 (0% of CAPEX)

**When to Apply:**

1. **Evolutive projects**
   - `projectType = 'Evolution'`
   - Existing application with load tests already performed
   - No new major functionality requiring load validation

2. **Exclusively SaaS products**
   - `saasProduct = true`
   - AND `microservicesCount = 0`
   - AND `infraOnVm = false`
   - Vendor is responsible for load testing SaaS platform

3. **Mainframe components**
   - `hostMainframe = true`
   - Mainframe testing handled separately (different methodology)

**Example Scenarios:**
- Enhancement to existing portal (adding 2 new features)
- Pure SaaS subscription (Salesforce, ServiceNow)
- Mainframe batch job implementation

---

### Level 1 - Light Load Testing

**Cost:** **3-5% of estimated CAPEX**

**When to Apply:**
- `project_classification = 'LIGHT'` (any service risk)
- OR `project_classification = 'MEDIUM'` AND `serviceRisk = 'Minimal'` or `'Basso'`

**Typical Scenarios:**
- Small to medium new applications
- Limited number of functionalities (3-5 key transactions)
- Few integrations with other systems
- Low to moderate expected user volumes

**What's Included:**
- Analysis of 3-5 key functionalities
- Basic load test scenarios (login, key transaction, logout)
- Single integration point testing
- Test script preparation
- Load test execution (ramp-up + steady state)
- Results analysis and basic report
- ~10-15 working days effort

**Example Calculation:**
- Estimated CAPEX: €200,000
- Percentage: 4% (midpoint of 3-5%)
- **Load Testing Cost: €8,000**

---

### Level 2 - Standard Load Testing

**Cost:** **6-8% of estimated CAPEX**

**When to Apply:**
- `project_classification = 'MEDIUM'` AND `serviceRisk = 'Relevant'` or `'Alto'`
- OR `project_classification = 'COMPLESSO'` AND `serviceRisk = 'Minimal'` or `'Moderate'`

**Typical Scenarios:**
- Medium to large applications
- Multiple functionalities (6-12 key transactions)
- Several integrations with internal/external systems
- Moderate to high expected user volumes
- Business-critical transactions

**What's Included:**
- Analysis of 6-12 key functionalities
- Comprehensive load test scenarios (multiple user journeys)
- Multiple integration points testing
- Advanced test script preparation (data variability, correlation)
- Load test execution (ramp-up + steady state + stress test)
- Performance bottleneck analysis
- Detailed results analysis and recommendations
- Re-test after optimizations
- ~20-30 working days effort

**Example Calculation:**
- Estimated CAPEX: €350,000
- Percentage: 7% (midpoint of 6-8%)
- **Load Testing Cost: €24,500**

---

### Level 3 - Comprehensive Load Testing

**Cost:** **10-12% of estimated CAPEX**

**When to Apply:**
- `project_classification = 'COMPLESSO'` or `'SPECIALE'` AND `serviceRisk = 'Relevant'`, `'Radical'`, or `'Alto'`

**Typical Scenarios:**
- Large, complex applications
- Many functionalities (12+ key transactions)
- Complex integrations across multiple domains
- High to very high expected user volumes
- Mission-critical business services
- Public-facing applications (customers, partners)

**What's Included:**
- Analysis of 12+ key functionalities
- Extensive load test scenarios (multiple complex user journeys)
- Complex integration chains and end-to-end flows
- Advanced test script preparation with full data variability
- Comprehensive load test execution:
  - Baseline testing
  - Load testing (ramp-up + steady state)
  - Stress testing (peak load + breaking point)
  - Soak/endurance testing (sustained load over time)
  - Spike testing (sudden load increases)
- Performance profiling and bottleneck identification
- Capacity planning recommendations
- Detailed results analysis with KPIs and SLAs validation
- Multiple optimization cycles with re-testing
- Comprehensive documentation and knowledge transfer
- ~40-50 working days effort

**Example Calculation:**
- Estimated CAPEX: €600,000
- Percentage: 11% (midpoint of 10-12%)
- **Load Testing Cost: €66,000**

---

## Implementation in AI Agent

### Required Form Fields

```typescript
interface LoadTestingInputs {
  // Existing fields
  project_classification: 'LIGHT' | 'MEDIUM' | 'COMPLESSO' | 'SPECIALE';
  projectType: 'New' | 'Evolution' | 'CIF';
  serviceRisk: 'Minimal' | 'Moderate' | 'Relevant' | 'Radical';
  hostMainframe: boolean;
  saasProduct: boolean;
  microservicesCount: number;
  infraOnVm: boolean;
  
  // Calculated
  estimated_capex: number; // Total CAPEX from other components (before load testing)
}
```

### Calculation Logic

```typescript
function calculateLoadTestingCapex(inputs: LoadTestingInputs): number {
  // LEVEL 0: Evolution projects
  if (inputs.projectType === 'Evolution') {
    return 0;
  }
  
  // LEVEL 0: Exclusively SaaS
  if (inputs.saasProduct === true && 
      inputs.microservicesCount === 0 && 
      inputs.infraOnVm === false) {
    return 0;
  }
  
  // LEVEL 0: Mainframe
  if (inputs.hostMainframe === true) {
    return 0;
  }
  
  let percentage = 0;
  
  // LEVEL 3: COMPLESSO/SPECIALE with high risk
  if ((inputs.project_classification === 'COMPLESSO' || 
       inputs.project_classification === 'SPECIALE') &&
      (inputs.serviceRisk === 'Relevant' || 
       inputs.serviceRisk === 'Radical' || 
       inputs.serviceRisk === 'Alto')) {
    percentage = 0.11; // 11% (midpoint of 10-12%)
  }
  
  // LEVEL 2: COMPLESSO/SPECIALE with lower risk OR MEDIUM with high risk
  else if ((inputs.project_classification === 'COMPLESSO' || 
            inputs.project_classification === 'SPECIALE') ||
           (inputs.project_classification === 'MEDIUM' &&
            (inputs.serviceRisk === 'Relevant' || 
             inputs.serviceRisk === 'Alto'))) {
    percentage = 0.07; // 7% (midpoint of 6-8%)
  }
  
  // LEVEL 1: LIGHT or MEDIUM with low risk
  else {
    percentage = 0.04; // 4% (midpoint of 3-5%)
  }
  
  return inputs.estimated_capex * percentage;
}
```

---

## Validation Rules

### Warning Triggers

1. **New high-risk application without load testing**
   - Flag: "New application with serviceRisk: Alto but projectType: Evolution. Verify if load testing is required."

2. **Very high CAPEX with low load testing percentage**
   - Flag: "Estimated CAPEX >€1M but classified as LIGHT. Verify project complexity classification."

3. **High service volumes without adequate load testing**
   - Flag: "serviceVolumesPerDay: {volume} (>10,000) but LVL1 load testing. Consider increasing load testing scope."

---

## Cost Breakdown in Estimate

When including in final estimate:

```json
{
  "breakdown": {
    "capex": {
      "load_testing": {
        "level": "LVL2",
        "percentage": 7,
        "base_capex": 350000,
        "calculated_cost": 24500,
        "description": "Application load testing (7% of CAPEX) - Standard level for MEDIUM project with high risk"
      }
    }
  },
  "line_items": [
    {
      "category": "CAPEX",
      "subcategory": "Load Testing",
      "description": "Application load testing execution (6-12 key functionalities, multiple integration points)",
      "unit_cost": 24500,
      "quantity": 1,
      "total_cost": 24500,
      "notes": "Calculated as 7% of estimated CAPEX (€350k). Includes test preparation, execution, analysis, and optimization cycles (~20-30 days effort)."
    }
  ],
  "assumptions": [
    "Load testing cost calculated as 7% of CAPEX based on MEDIUM classification with serviceRisk: Alto",
    "Actual cost may vary based on number of functionalities and integration complexity",
    "QA verification of load test results included separately in QA costs"
  ]
}
```

---

## Load Testing Scope

### ✅ What's Included in Load Testing

- **Functionality analysis:** Identify key transactions and user journeys
- **Test scenario design:** Define load patterns, user concurrency, data volumes
- **Test script development:** Create automated load test scripts (JMeter, Gatling, K6, etc.)
- **Test environment setup:** Configure load generators and monitoring
- **Test execution:** Run load tests with different patterns (ramp-up, steady, stress, soak)
- **Monitoring and analysis:** Capture performance metrics (response time, throughput, errors)
- **Bottleneck identification:** Identify performance issues (slow queries, resource contention, etc.)
- **Results reporting:** Document findings with graphs, KPIs, and recommendations
- **Optimization support:** Work with dev team on performance improvements
- **Re-testing:** Execute tests after optimizations to validate improvements

### ❌ What's NOT Included

- **QA verification:** Reviewing and approving load test results (covered by QA CAPEX)
- **Application development:** Fixing performance issues in code (development team)
- **Infrastructure scaling:** Adding resources based on test findings (OPEX or separate CAPEX)
- **Functional testing:** Validating business logic correctness (application team responsibility)
- **Security testing:** Penetration testing, vulnerability scanning (separate security testing)

---

## Calculation Notes

### Important Considerations

1. **Base CAPEX for calculation:**
   - Use **total estimated CAPEX** from all other components
   - Load testing cost is calculated AFTER summing other CAPEX items
   - Then load testing cost is ADDED to total CAPEX

2. **Percentage selection:**
   - Use **midpoint** of range by default (4%, 7%, 11%)
   - Adjust upward if:
     - Very high `serviceVolumesPerDay` (>10,000 users/day)
     - Many integrations indicated (`integrationsWithInternalSystems = true` AND `dependenciesWithExternalServices = true`)
     - Public-facing service (`serviceExposure = true`)
   - Adjust downward if:
     - Simple architecture (few microservices <5)
     - Limited integrations
     - Internal tool with low concurrency

3. **IVA (22%) handling:**
   - Calculate percentage on CAPEX amount (already includes IVA)
   - Result automatically includes IVA proportionally

4. **Minimum/Maximum bounds:**
   - Consider setting minimum: €5,000 (below this, load testing may not be meaningful)
   - Consider setting maximum: 15% of CAPEX (cap for very large projects to avoid excessive costs)

---

## Examples

### Example 1: LIGHT Project - New Internal Tool

**Input:**
- project_classification: LIGHT
- projectType: New
- serviceRisk: Minimal
- estimated_capex: €80,000

**Calculation:** €80,000 × 4% = **€3,200**

---

### Example 2: MEDIUM Project - Customer Portal (High Risk)

**Input:**
- project_classification: MEDIUM
- projectType: New
- serviceRisk: Alto
- estimated_capex: €300,000

**Calculation:** €300,000 × 7% = **€21,000**

---

### Example 3: COMPLESSO Project - Banking Platform

**Input:**
- project_classification: COMPLESSO
- projectType: New
- serviceRisk: Radical
- estimated_capex: €800,000

**Calculation:** €800,000 × 11% = **€88,000**

---

### Example 4: Evolutive Project - No Load Testing

**Input:**
- project_classification: MEDIUM
- projectType: Evolution
- serviceRisk: Medio
- estimated_capex: €250,000

**Calculation:** €0 (Evolution → no new load testing needed)

---

### Example 5: SaaS Only - No Load Testing

**Input:**
- project_classification: LIGHT
- projectType: New
- saasProduct: true
- microservicesCount: 0
- infraOnVm: false
- estimated_capex: €100,000

**Calculation:** €0 (SaaS vendor responsibility)

---

## Professional Services Indicative Breakdown

For transparency, here's an indicative effort breakdown:

### LVL1 (3-5% / ~€8k on €200k CAPEX)
- Performance Engineer: 10-15 days @ €650/day = €6,500-9,750
- Tools and environment: included in engineer's setup

### LVL2 (6-8% / ~€24k on €350k CAPEX)
- Performance Engineer: 20-30 days @ €650/day = €13,000-19,500
- Senior Performance Engineer: 5-7 days @ €750/day = €3,750-5,250
- Total: ~€16,750-24,750

### LVL3 (10-12% / ~€66k on €600k CAPEX)
- Performance Engineer: 40-50 days @ €650/day = €26,000-32,500
- Senior Performance Engineer: 15-20 days @ €750/day = €11,250-15,000
- Performance Architect: 5-10 days @ €850/day = €4,250-8,500
- Total: ~€41,500-56,000

**Note:** These are indicative breakdowns. Actual percentage-based calculation takes precedence as it accounts for project-specific complexity factors.

---

**Document Version:** 1.0  
**Source:** Budget CTO v2.1 - Load testing cost estimation methodology  
**For:** Crédit Agricole IT Infrastructure Cost Estimation