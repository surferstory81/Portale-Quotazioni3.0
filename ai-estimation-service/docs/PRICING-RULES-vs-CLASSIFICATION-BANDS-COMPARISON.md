# Comparison: pricing-rules.md vs project-classification-bands.md

**Analysis Date:** 2026-05-08  
**Purpose:** Identify overlaps, conflicts, and harmonization opportunities

---

## 📊 Overview

| Aspect | pricing-rules.md | project-classification-bands.md |
|--------|------------------|--------------------------------|
| **Source** | Generic industry best practices | CA Budget CTO v2.1 (official) |
| **Purpose** | General pricing guidelines | CA-specific project classification |
| **Authority** | Reference/Template | **Authoritative for CA** |
| **Date** | Unknown (pre-existing) | 2026-05-08 (extracted from Excel) |
| **Validation** | Not CA-validated | ✅ CA-validated |

---

## 🔍 Detailed Comparison

### 1. PROJECT SIZE CLASSIFICATION

#### pricing-rules.md (Generic)
```
Small Projects:
  - Budget: <€50,000
  - Duration: 1-3 months
  - Team size: 1-3 people
  - Complexity: Low

Medium Projects:
  - Budget: €50,000-€250,000
  - Duration: 3-9 months
  - Team size: 3-8 people
  - Complexity: Medium

Large Projects:
  - Budget: >€250,000
  - Duration: 9+ months
  - Team size: 8+ people
  - Complexity: High
```

#### project-classification-bands.md (CA Official)
```
LIGHT:
  - CTO Budget: €50,000 - €100,000 (IVA inclusa)
  - Duration: 1-6 months
  - Microservices: 0-15
  - Cores: 0-30
  - Test Cases: <100

MEDIUM:
  - CTO Budget: €100,000 - €200,000 (IVA inclusa)
  - Duration: 7-9 months
  - Microservices: 16-30
  - Cores: 30-60
  - Test Cases: 100-1,000

COMPLESSO:
  - CTO Budget: €200,000 - €500,000 (IVA inclusa)
  - Duration: >1 year
  - Microservices: 31-100
  - Cores: 60-200
  - Test Cases: 1,000-10,000

SPECIALE:
  - CTO Budget: >€500,000 (IVA inclusa)
  - Duration: Multi-year
  - Microservices: >100
  - Cores: >200
  - Test Cases: >10,000
```

**Analysis:**

| Criteria | Generic (pricing-rules) | CA (classification-bands) | Status |
|----------|------------------------|---------------------------|--------|
| **Budget thresholds** | €50k / €250k | €50-100k / €100-200k / €200-500k / >€500k | ⚠️ **Conflict** |
| **Duration bands** | 1-3 / 3-9 / 9+ months | 1-6 / 7-9 / >12 months | ⚠️ **Different** |
| **Granularity** | 3 bands (Small/Medium/Large) | 4 bands (LIGHT/MEDIUM/COMPLESSO/SPECIALE) | ℹ️ CA more granular |
| **Technical criteria** | ❌ None (only budget/team/duration) | ✅ 16 criteria (microservices, cores, storage, etc.) | ✅ **CA superior** |

**Recommendation:** 🔴 **REPLACE** generic bands with CA classification-bands.md

---

### 2. ESTIMATION ACCURACY TARGETS

#### pricing-rules.md
```
Small projects (<€50k): ±20% accuracy
Medium projects (€50k-€250k): ±15% accuracy
Large projects (>€250k): ±10% accuracy
```

#### project-classification-bands.md
```
No explicit accuracy targets defined.
```

**Analysis:**
- ✅ **Complementary:** classification-bands doesn't cover accuracy expectations
- 💡 **Action:** Add accuracy targets to classification-bands based on band:
  ```
  LIGHT: ±20% accuracy
  MEDIUM: ±15% accuracy
  COMPLESSO: ±10% accuracy
  SPECIALE: ±10% accuracy (custom review)
  ```

**Recommendation:** ✅ **MERGE** accuracy targets into classification-bands

---

### 3. RISK BUFFERS

#### pricing-rules.md
```
Low risk projects: +10% contingency
Medium risk projects: +15% contingency
High risk projects: +20-30% contingency
```

#### project-classification-bands.md
```
Service Risk criterion:
  - LIGHT: Minimal risk
  - MEDIUM: Moderate risk
  - COMPLESSO: Relevant risk
  - SPECIALE: Radical risk

No explicit contingency percentages defined.
```

**Analysis:**
- ⚠️ **Partial overlap:** classification-bands defines risk levels, pricing-rules defines contingency %
- 💡 **Mapping needed:**
  ```
  LIGHT (Minimal risk) → +10% contingency
  MEDIUM (Moderate risk) → +15% contingency
  COMPLESSO (Relevant risk) → +20% contingency
  SPECIALE (Radical risk) → +25-30% contingency
  ```

**Recommendation:** ✅ **MERGE** risk buffers into classification-bands with explicit percentages

---

### 4. CAPEX vs OPEX CLASSIFICATION

#### pricing-rules.md
```
CAPEX (Capital Expenditure):
  - Hardware purchases
  - Software licenses (perpetual)
  - Infrastructure setup
  - Initial development costs

OPEX (Operational Expenditure):
  - Cloud services (monthly)
  - Software subscriptions
  - Maintenance and support
  - Personnel costs
  - Training
```

#### project-classification-bands.md
```
CTO Budget Estimate (per band):
  - Total = CAPEX + OPEX
  - CAPEX: One-time costs (range per band)
  - OPEX: Recurring costs (range per band)

No detailed breakdown of what goes into CAPEX vs OPEX.
```

**Analysis:**
- ✅ **Complementary:** pricing-rules provides CAPEX/OPEX definitions, classification-bands provides budget ranges
- 💡 **Action:** Cross-reference pricing-rules CAPEX/OPEX definitions in classification-bands

**Recommendation:** ✅ **KEEP BOTH** - pricing-rules defines categories, classification-bands provides CA budget ranges

---

### 5. DISCOUNTS AND PREMIUMS

#### pricing-rules.md
```
Volume Discounts:
  - Infrastructure >€100k: -5-10%
  - Licenses >€50k: -10-15%
  - Professional services >6 months: -5-10%

Premiums:
  - Urgent delivery (<30 days): +20-30%
  - Weekend/holiday work: +50-100%
  - On-site vs. remote: +15-25%
  - Legacy system integration: +20-40%
```

#### project-classification-bands.md
```
No discount or premium information.
```

**Analysis:**
- ✅ **Complementary:** classification-bands doesn't cover discounts/premiums
- ⚠️ **Validation needed:** Are these generic discounts/premiums applicable to CA contracts with ACN?

**Recommendation:** ⏸️ **VALIDATE with CA procurement** before applying generic discounts

---

### 6. TIME ESTIMATES

#### pricing-rules.md
```
Development:
  - Simple CRUD app: 2-4 weeks
  - Medium complexity app: 2-4 months
  - Enterprise application: 6-18 months

Testing:
  - Unit testing: 15-20% of development time
  - Integration testing: 10-15% of development time
  - UAT: 10-15% of total project time

Deployment and Migration:
  - Simple deployment: 1-3 days
  - Complex migration: 1-4 weeks
  - Zero-downtime migration: 2-8 weeks
```

#### project-classification-bands.md
```
Project Duration:
  - LIGHT: 1-6 months
  - MEDIUM: 7-9 months
  - COMPLESSO: >1 year
  - SPECIALE: Multi-year

Test Magnitude:
  - LIGHT: <100 test cases
  - MEDIUM: 100-1,000 test cases
  - COMPLESSO: 1,000-10,000 test cases
  - SPECIALE: >10,000 test cases
```

**Analysis:**
- ⚠️ **Partial conflict:** pricing-rules gives effort percentages, classification-bands gives test case counts
- 💡 **Harmonization:** Map test case counts to effort percentages:
  ```
  <100 test cases (LIGHT) → 15% testing effort
  100-1,000 test cases (MEDIUM) → 20% testing effort
  1,000-10,000 test cases (COMPLESSO) → 25% testing effort
  >10,000 test cases (SPECIALE) → 30% testing effort
  ```

**Recommendation:** ✅ **MERGE** - keep CA test case thresholds, add effort % mapping from pricing-rules

---

### 7. INFRASTRUCTURE SIZING

#### pricing-rules.md
```
Application Servers:
  - Small load (<1000 users): 2 vCPU, 4GB RAM
  - Medium load (1000-10000 users): 4-8 vCPU, 8-16GB RAM
  - Large load (>10000 users): 8+ vCPU, 16+ GB RAM

Database Servers:
  - Small database (<10GB): 2 vCPU, 8GB RAM
  - Medium database (10-100GB): 4 vCPU, 16GB RAM
  - Large database (>100GB): 8+ vCPU, 32+ GB RAM
```

#### project-classification-bands.md
```
Computing Power:
  - LIGHT: 0-30 cores
  - MEDIUM: 30-60 cores
  - COMPLESSO: 60-200 cores
  - SPECIALE: >200 cores

Database Impact (DIP):
  - LIGHT: <1 TB
  - MEDIUM: 1-10 TB
  - COMPLESSO: 10-50 TB
  - SPECIALE: >50 TB
```

**Analysis:**
- ⚠️ **Different approaches:** 
  - pricing-rules: Sizing by user load (generic)
  - classification-bands: Thresholds for total cores and storage (CA-specific)
- ✅ **CA approach is authoritative** - based on actual infrastructure allocation

**Recommendation:** 🔴 **REPLACE** generic sizing rules with CA classification thresholds

---

### 8. MAINTENANCE AND SUPPORT

#### pricing-rules.md
```
Annual Maintenance:
  - Hardware: 15-20% of purchase price
  - Software: 20-25% of license cost
  - Application support: 15-20% of development cost

Support Levels:
  - Business hours (8x5): 10-15% of system value/year
  - Extended hours (16x5): 15-20% of system value/year
  - 24x7: 25-35% of system value/year
```

#### project-classification-bands.md
```
No maintenance or support cost information.
```

**Analysis:**
- ✅ **Complementary:** classification-bands doesn't cover maintenance multipliers
- ⚠️ **Validation needed:** Are these generic percentages applicable to CA/ACN contracts?

**Recommendation:** ⏸️ **VALIDATE with CA operations** - ACN contracts may have specific maintenance rates

---

### 9. TRAINING

#### pricing-rules.md
```
End User Training:
  - Basic training: 1-2 days per 20 users
  - Advanced training: 2-3 days per 10 users

Administrator Training:
  - System administration: 3-5 days
  - Advanced configuration: 2-3 days
```

#### project-classification-bands.md
```
No training cost information.
```

**Analysis:**
- ✅ **Complementary:** classification-bands doesn't cover training
- 💡 **Action:** Training is typically CAPEX - should be included in CAPEX estimates

**Recommendation:** ✅ **KEEP in pricing-rules** - add reference in classification-bands

---

### 10. PAYMENT TERMS

#### pricing-rules.md
```
Standard:
  - 30% upfront
  - 40% at milestones
  - 30% on completion

Large Projects:
  - 20% upfront
  - 70% at milestones (monthly/quarterly)
  - 10% on acceptance
```

#### project-classification-bands.md
```
No payment terms information.
```

**Analysis:**
- ✅ **Complementary:** classification-bands doesn't cover payment schedules
- ℹ️ **Out of scope:** Payment terms are procurement/finance domain, not AI estimation

**Recommendation:** ✅ **KEEP in pricing-rules** - reference only, not used in AI estimation

---

## 🎯 CRITICAL CONFLICTS TO RESOLVE

### Conflict #1: Budget Thresholds

| Band Name | pricing-rules.md | project-classification-bands.md | Winner |
|-----------|------------------|--------------------------------|--------|
| Small/LIGHT | <€50k | €50-100k | ✅ **classification-bands** |
| Medium/MEDIUM | €50-250k | €100-200k | ✅ **classification-bands** |
| Large/COMPLESSO | >€250k | €200-500k | ✅ **classification-bands** |
| N/A/SPECIALE | N/A | >€500k | ✅ **classification-bands** |

**Decision:** 🔴 **Use classification-bands thresholds** (CA official)

---

### Conflict #2: Duration Bands

| Band | pricing-rules.md | project-classification-bands.md | Winner |
|------|------------------|--------------------------------|--------|
| Small/LIGHT | 1-3 months | 1-6 months | ✅ **classification-bands** |
| Medium/MEDIUM | 3-9 months | 7-9 months | ✅ **classification-bands** |
| Large/COMPLESSO | 9+ months | >12 months | ✅ **classification-bands** |

**Decision:** 🔴 **Use classification-bands thresholds** (CA official)

---

### Conflict #3: Classification Approach

| Aspect | pricing-rules.md | project-classification-bands.md |
|--------|------------------|--------------------------------|
| **Criteria** | Budget, duration, team size | 16 technical criteria (microservices, cores, storage, etc.) |
| **Decision Rule** | Budget-first classification | "At least one parameter" rule |
| **Granularity** | Generic 3-tier | CA-specific 4-tier |

**Decision:** 🔴 **Use classification-bands approach** (CA-specific and more comprehensive)

---

## ✅ HARMONIZATION PLAN

### Action 1: Update pricing-rules.md

**Add CA-specific section at the top:**

```markdown
# Pricing Rules and Guidelines

⚠️ **IMPORTANT:** For Crédit Agricole projects, use the official classification system defined in `project-classification-bands.md`. This file contains generic industry best practices for reference only.

## Crédit Agricole Projects

For CA projects, classification is determined by the **Fasce Budget CTO** system:
- See `project-classification-bands.md` for official thresholds
- Classification based on 16 technical criteria
- Budget ranges: LIGHT (€50-100k), MEDIUM (€100-200k), COMPLESSO (€200-500k), SPECIALE (>€500k)
```

**Recommendation:** ✅ **Add CA disclaimer** at top of pricing-rules.md

---

### Action 2: Enhance project-classification-bands.md

**Add missing sections from pricing-rules.md:**

1. **Estimation Accuracy Targets:**
   ```markdown
   ## Estimation Accuracy by Band
   - LIGHT: ±20% accuracy
   - MEDIUM: ±15% accuracy
   - COMPLESSO: ±10% accuracy
   - SPECIALE: ±10% accuracy (with custom review)
   ```

2. **Risk Contingency Buffers:**
   ```markdown
   ## Risk Contingency by Service Risk Level
   - Minimal (LIGHT): +10% contingency
   - Moderate (MEDIUM): +15% contingency
   - Relevant (COMPLESSO): +20% contingency
   - Radical (SPECIALE): +25-30% contingency
   ```

3. **Testing Effort Percentages:**
   ```markdown
   ## Testing Effort by Test Magnitude
   - Bassa (<100 cases): 15% of development time
   - Media (100-1,000 cases): 20% of development time
   - Alta (1,000-10,000 cases): 25% of development time
   - Very High (>10,000 cases): 30% of development time
   ```

**Recommendation:** ✅ **Enhance classification-bands** with complementary metrics

---

### Action 3: Create Cross-Reference Table

**New file:** `ai-estimation-service/knowledge/README.md`

```markdown
# Knowledge Base Structure

## Primary Files (CA-Specific)

1. **project-classification-bands.md** ⭐ AUTHORITATIVE
   - CA official project classification (Fasce Budget CTO)
   - 16 technical criteria with thresholds
   - Budget ranges: LIGHT/MEDIUM/COMPLESSO/SPECIALE
   - Use for: All CA project classification and budget estimation

2. **field-to-cost-mapping.md** (To be created with CA data)
   - Direct mapping of form fields to infrastructure costs
   - CA-specific pricing (ACN, licenses, professional services)
   - Use for: Bottom-up cost calculation

3. **composition-rules.md** (To be created)
   - Boolean flag combination logic
   - On-premise vs cloud decision rules
   - Database allocation policies
   - Use for: Architecture decision automation

## Reference Files (Generic)

4. **pricing-rules.md**
   - Generic industry best practices
   - ⚠️ NOT authoritative for CA
   - Use for: General guidance, gap-filling where CA-specific data unavailable

5. **infrastructure-costs.md**
   - Generic cloud/on-prem pricing
   - ⚠️ Replace with CA-specific ACN pricing

6. **professional-services.md**
   - Generic daily rates
   - ⚠️ Replace with CA tariffario and supplier rates

7. **software-licenses.md**
   - Generic license costs
   - ⚠️ Replace with ACN listino licenze

## Priority for AI Agent

**Decision Hierarchy:**
1. project-classification-bands.md (CA official)
2. CA-INFRASTRUCTURE-ARCHITECTURE.md (CA policies)
3. field-to-cost-mapping.md (CA pricing - when complete)
4. composition-rules.md (CA logic - when complete)
5. pricing-rules.md (generic fallback)
```

**Recommendation:** ✅ **Create README.md** to clarify precedence

---

## 📝 SUMMARY

### Files Status

| File | Status | Authority | Action Required |
|------|--------|-----------|-----------------|
| **project-classification-bands.md** | ✅ Complete | ⭐ **CA Official** | Add accuracy/risk/testing % |
| **pricing-rules.md** | ⚠️ Generic | Reference only | Add CA disclaimer at top |
| **infrastructure-costs.md** | ❌ Generic | Replace | Update with ACN pricing |
| **professional-services.md** | ❌ Generic | Replace | Update with CA tariffario |
| **software-licenses.md** | ❌ Generic | Replace | Update with ACN listino |
| **field-to-cost-mapping.md** | ❌ Incomplete | To be created | Create with CA data |
| **composition-rules.md** | ❌ Missing | To be created | Create with CA logic |

---

### Key Takeaways

1. **🔴 CRITICAL:** `project-classification-bands.md` is **authoritative** for CA - use its thresholds, not generic pricing-rules.md

2. **✅ COMPLEMENTARY:** pricing-rules.md contains useful percentages (accuracy, risk buffers, testing effort) that should be **merged into** classification-bands.md

3. **⚠️ VALIDATION NEEDED:** Generic discounts, maintenance %, and support tiers need validation against CA/ACN contracts

4. **🎯 PRIORITY:** Update classification-bands.md with missing percentages, then deprecate conflicting sections of pricing-rules.md

---

**Recommendation:** Execute harmonization in this order:
1. Add CA disclaimer to pricing-rules.md (5 min)
2. Enhance classification-bands.md with accuracy/risk/testing % (15 min)
3. Create knowledge base README.md with precedence rules (10 min)
4. Update AI agent prompt to prioritize classification-bands over pricing-rules (20 min)

**Total effort:** ~1 hour

---

**Document Status:** ✅ Analysis Complete - Ready for harmonization implementation
