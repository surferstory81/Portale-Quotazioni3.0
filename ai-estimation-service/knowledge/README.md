# AI Estimation Knowledge Base

This directory contains the knowledge base files used by the AI estimation service to generate cost estimates for Crédit Agricole projects.

---

## 📋 File Hierarchy and Priority

When generating estimates, files should be consulted in this order:

### 1️⃣ **Primary Files (CA-Specific)** ⭐ AUTHORITATIVE

#### `project-classification-bands.md` 
**Status:** ✅ CA Official (extracted from Budget CTO v2.1)  
**Purpose:** Project classification system (LIGHT/MEDIUM/COMPLESSO/SPECIALE)  
**Contains:**
- 16 technical criteria with thresholds (microservices, cores, storage, duration, etc.)
- Budget ranges by band (CAPEX/OPEX breakdown)
- "At least one parameter" classification rule
- Estimation accuracy targets
- Risk contingency percentages
- Testing effort percentages

**Use for:** All CA project classification and budget range validation

---

### 2️⃣ **Architecture & Policy Files (CA-Specific)**

#### `../docs/CA-INFRASTRUCTURE-ARCHITECTURE.md`
**Status:** ✅ CA Validated by User  
**Purpose:** CA infrastructure architecture and policies  
**Contains:**
- On-premise primary architecture (VMware, OCP, Mirantis)
- Database architecture and constraints (Oracle Exadata frozen capacity)
- CAPEX vs OPEX structure
- Critical policies (no per-microservice DBs, prod = 2x resources, backup ratios)
- Field-to-architecture mapping rules

**Use for:** Infrastructure type decisions, resource allocation rules, architecture constraints

---

### 3️⃣ **Mapping Files (To Be Created with CA Data)**

#### `field-to-cost-mapping.md` (⚠️ Currently Generic - Needs CA Data)
**Status:** ⚠️ Incomplete - Contains generic estimates  
**Purpose:** Direct mapping of form fields to infrastructure costs  
**Needs:** CA-specific pricing from:
- ACN vendor contracts (on-premise infrastructure)
- Software license agreements (RedHat, Dynatrace, VMware)
- Professional services rates (CA suppliers)
- Cloud provider agreements (AWS/Azure/GCP)

**Use for:** Bottom-up cost calculation from form field values

---

#### `composition-rules.md` (❌ Missing - To Be Created)
**Status:** ❌ Not yet created  
**Purpose:** Boolean flag combination logic  
**Should contain:**
- On-premise vs cloud decision rules
- Database allocation policies
- Infrastructure type selection logic
- Production vs non-production resource multipliers

**Use for:** Architecture decision automation based on form field flags

---

### 4️⃣ **Reference Files (Generic Industry Best Practices)**

#### `pricing-rules.md`
**Status:** ⚠️ Generic - NOT authoritative for CA  
**Purpose:** General industry pricing guidelines  
**Contains:**
- Generic project size classification (conflicts with CA bands)
- Risk buffers and estimation accuracy (now merged into classification-bands.md)
- CAPEX/OPEX definitions
- Maintenance and support percentages
- Training effort estimates

**Use for:** Gap-filling where CA-specific data unavailable, general reference only

---

#### `infrastructure-costs.md`
**Status:** ⚠️ Generic - Needs replacement with CA data  
**Purpose:** Generic cloud/on-prem pricing  
**Action required:** Replace with ACN pricing from CA contracts

---

#### `professional-services.md`
**Status:** ⚠️ Generic - Needs replacement with CA data  
**Purpose:** Generic daily rates  
**Action required:** Replace with CA tariffario and supplier rates

---

#### `software-licenses.md`
**Status:** ⚠️ Generic - Needs replacement with CA data  
**Purpose:** Generic license costs  
**Action required:** Replace with ACN listino licenze

---

## 🎯 Decision Hierarchy for AI Agent

When generating cost estimates, follow this priority order:

1. **project-classification-bands.md** (CA official classification)
2. **CA-INFRASTRUCTURE-ARCHITECTURE.md** (CA policies and architecture)
3. **field-to-cost-mapping.md** (CA pricing - when complete with validated data)
4. **composition-rules.md** (CA logic - when created)
5. **pricing-rules.md** (generic fallback for gaps only)

---

## ⚠️ Critical Rules

### For CA Projects:

1. **ALWAYS use project-classification-bands.md** for classification, not generic pricing-rules.md thresholds
2. **Respect database constraints:** No per-microservice databases on-premise, Exadata capacity frozen
3. **Apply production redundancy:** Production = 2x resources, Non-prod = 1x
4. **On-premise is default:** Cloud only for specific use cases (cloudSaas, cloudIaasPaas flags)
5. **Apply IVA universally:** All costs * 1.22 (22% Italian VAT)
6. **Use multi-year depreciation:** On-premise infrastructure costs spread over 3-5 years
7. **Flag capacity issues:** High database volume with hasDatabaseImpactDip = potential Exadata blocker

---

## 📊 Budget Bands Quick Reference

| Band | Budget Range | Duration | Microservices | Cores |
|------|-------------|----------|---------------|-------|
| **LIGHT** | €50-100k | 1-6 months | 0-15 | 0-30 |
| **MEDIUM** | €100-200k | 7-9 months | 16-30 | 30-60 |
| **COMPLESSO** | €200-500k | >1 year | 31-100 | 60-200 |
| **SPECIALE** | >€500k | Multi-year | >100 | >200 |

**Rule:** **At least one parameter** from a band classifies the project in that band.

---

## 🚀 Next Steps

### Immediate (Required for Production):

1. **Validate CA pricing data:** Obtain current ACN contracts and license agreements
2. **Update field-to-cost-mapping.md:** Replace generic estimates with validated CA pricing
3. **Create composition-rules.md:** Document boolean flag logic and decision rules

### Medium-term (Accuracy Improvement):

4. **Extract historical benchmarks:** Create historical-benchmarks.md from completed projects
5. **Calibrate formulas:** Adjust multipliers and ratios based on historical accuracy
6. **Update AI agent prompt:** Add CA-specific instructions and file precedence rules

### Long-term (Continuous Improvement):

7. **Quarterly review:** Update pricing with new contract data
8. **Annual threshold review:** Validate classification band criteria with CTO office
9. **Feedback loop:** Compare estimates vs actuals, adjust knowledge base

---

## 📁 File Status Summary

| File | Status | Authority | Action Required |
|------|--------|-----------|-----------------|
| **project-classification-bands.md** | ✅ Complete | ⭐ CA Official | None (add periodic reviews) |
| **CA-INFRASTRUCTURE-ARCHITECTURE.md** | ✅ Complete | ⭐ CA Validated | None (update if policies change) |
| **pricing-rules.md** | ✅ Updated | Reference only | None (CA disclaimer added) |
| **field-to-cost-mapping.md** | ⚠️ Incomplete | To be updated | Replace with CA pricing data |
| **composition-rules.md** | ❌ Missing | To be created | Create with CA logic |
| **infrastructure-costs.md** | ⚠️ Generic | To be replaced | Update with ACN pricing |
| **professional-services.md** | ⚠️ Generic | To be replaced | Update with CA tariffario |
| **software-licenses.md** | ⚠️ Generic | To be replaced | Update with ACN listino |

---

**Last Updated:** 2026-05-08  
**Maintained by:** AI Estimation Service Team  
**Review Frequency:** Quarterly or when pricing/policies change
