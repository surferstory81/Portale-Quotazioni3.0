# Knowledge Base Alignment - Real CA Architecture

**Date:** 2026-05-15  
**Version:** field-to-cost-mapping.md v2.0  
**Purpose:** Document corrections made to align knowledge base with real Crédit Agricole architecture and pricing

---

## 🎯 Objective

Replace generic AWS/Azure cloud pricing in `field-to-cost-mapping.md` with **real CA pricing** from vendor contracts (ACN) and CA architecture documentation.

---

## ✅ Major Changes

### 1. Complete File Rewrite

**Old:** Generic cloud pricing (AWS EKS/AKS, ECR/ACR, generic rates)  
**New:** Real CA on-premise architecture with ACN pricing from `BudgetCTO_v2.3.csv`

**Example Transformation:**
- **Before:** Kubernetes control plane €300/month (AWS EKS)
- **After:** OpenShift Pod deployment €210.72/pod/anno (CA OCP Prod license)

---

### 2. OpenShift Architecture

**Added complete OCP cost model:**
- Pod management costs per environment (Prod €210.72, DR €141.73, Standard €141.73)
- Worker nodes 16 vCore (€1,051.74/anno)
- OpenShift licenses (4 vCPU per subscription)
- Namespace costs (€649.04/anno)
- Scaling patterns: Prod 2+, DR 2, Parallelo 2, Collaudo 1

**Calculation logic:**
```
Total pods = microservicesCount × 7 (2+2+2+1)
Workers = CEILING(total_vCPU / 16)
Namespaces = 3-12 based on complexity
```

---

### 3. Database Management

**Added CA-specific database architectures:**

**SQL Server:**
- Shared cluster (default): €0 VM + €1,920.18 management
- Dedicated cluster: 4 VM + €1,920.18 management

**PostgreSQL:**
- Critical (serviceRisk Alto): 10 VM (6+3+1) + €2,560.23 management
- Non-critical: 5 VM (2+2+1) + €2,560.23 management

**MongoDB:**
- Replica Set: 10 VM (6+3+1) + €2,560.23 management

**Oracle Exadata:**
- 0 VM (existing cluster) + €3,887.97 management
- **Warning added:** CA is deprecating Oracle (strategic decision)

---

### 4. Storage & Backup

**Added CA pricing with environment ponderations:**

**Live Storage:**
- SSD Replicato: €1,059.39/TB anno 1
- Ponderations: Prod 1.0, DR 1.0, Parallelo 0.5, Collaudo 0.3

**Backup:**
- Front-end: €2,664.99/TB (1:1 ratio)
- Back-end: €1,229.46/TB (5:1 ratio)

---

### 5. Professional Services - CORRECTED

**Fixed pricing inconsistencies:**

| Service | OLD (Wrong) | NEW (Correct) | Source |
|---------|-------------|---------------|--------|
| QA COMPLESSO | €45,750 | **€27,450** | qa-quality-assurance-costs.md |
| DevOps Pipeline COMPLESSO | €16,470 | **€12,200** | devops-pipeline-costs.md |
| Observability COMPLESSO | €21,960 | **€24,400** (2 env) | dynatrace-dashboard-costs.md |

**Correct Costs:**
- **QA**: €10,980 (MEDIUM), €27,450 (COMPLESSO)
- **Load Testing**: 4%, 7%, 11% of CAPEX (midpoints)
- **Observability**: €14,640 (LVL2), €24,400 (LVL3) for 2 environments
- **DevOps Pipeline**: €7,320 (LVL2), €12,200 (LVL3)
- **Feasibility Study**: €8,674 (MEDIUM), €32,232 (COMPLESSO)
- **RFC Support**: €12,200 (MEDIUM), €18,300 (COMPLESSO)
- **Major Change**: €2,440 (5 days × €400 × 1.22)

---

### 6. Monitoring (Dynatrace)

**Added CA-specific monitoring logic:**

**Full Stack vs Infrastructure:**
- Full Stack: Internal apps, MEDIUM+ classification
- Infrastructure: Legacy apps, simple projects

**Costs:**
- Full Stack: €39.79/GB RAM/anno
- Infrastructure: €159.12/VM/anno
- K8s Platform: €14.86/POD/anno
- Log Ingest: €741.16/GB/anno
- Log Retain: €0.53/GB/day (30 days)

**Log estimation:** 10 MB/pod/day (Prod + Parallelo only)

---

### 7. VMware Licensing

**Added CA formula:**
```
Physical cores = virtual_cores / 3
VMware cost = physical_cores × €89 × 1.22
```

**Example:** 45 vCPU = 15 physical cores = €1,628.85/anno

---

### 8. Cloud Fallback

**Added logic:**
- Trigger: `cloudIaasPaasLandingZoneCa == true`
- Uses ACN Cloud pricing (flat costs from BudgetCTO_v2.3.csv)
- Cloud pricing agent not yet implemented (future enhancement)

---

## 📋 New Form Fields Required

**Database technology separation:**
1. `hasPostgresDatabase` (boolean) - PostgreSQL on-premise
2. `hasMongoDatabase` (boolean) - MongoDB on-premise
3. `dedicatedSqlCluster` (boolean) - SQL Server dedicated vs shared

**Rationale:** Different architectures have different costs (PostgreSQL critical = 10 VM, MongoDB = 10 VM replica set, SQL shared = 0 VM)

---

## 🔍 Verification Against Source Files

### Cross-Referenced Files

| Knowledge File | Status | Notes |
|----------------|--------|-------|
| `load-testing-costs.md` | ✅ Aligned | 4%, 7%, 11% percentages |
| `qa-quality-assurance-costs.md` | ✅ Aligned | €10,980, €27,450 costs |
| `devops-pipeline-costs.md` | ✅ Aligned | €7,320, €12,200 costs |
| `dynatrace-dashboard-costs.md` | ✅ Aligned | €14,640, €24,400 costs |
| `professional-services-costs.md` | ✅ Aligned | Feasibility & RFC costs |

### Pricing Sources

| Data | Source | Status |
|------|--------|--------|
| OpenShift licenses | BudgetCTO_v2.3.csv rows 39-41 | ✅ Verified |
| Worker nodes | BudgetCTO_v2.3.csv rows 7-8 | ✅ Verified |
| Pod management | BudgetCTO_v2.3.csv row 21 | ✅ Verified |
| Namespace | BudgetCTO_v2.3.csv row 22 | ✅ Verified |
| Database mgmt | BudgetCTO_v2.3.csv rows 13-16 | ✅ Verified |
| Storage | BudgetCTO_v2.3.csv rows 9-12 | ✅ Verified |
| VMware | BudgetCTO_v2.3.csv row 34 | ✅ Verified |
| Dynatrace | BudgetCTO_v2.3.csv rows 43-46 | ✅ Verified |

---

## 📊 Example Comparison (Before vs After)

### Project: 20 microservizi, COMPLESSO, 18 months

| Cost Component | OLD (Generic) | NEW (CA Real) | Difference |
|----------------|---------------|---------------|------------|
| Microservices | ~€37,000 | €35,648.98 | -€1,351 |
| QA | €45,750 | **€27,450** | -€18,300 ❌ |
| Observability | €21,960 | **€24,400** | +€2,440 ✅ |
| Pipeline | €16,470 | **€12,200** | -€4,270 ✅ |
| **Total CAPEX** | **€167,648** | **€131,102** | **-€36,546** |

**Key Finding:** Previous version overestimated QA and Pipeline costs significantly.

---

## ⚠️ Critical Warnings Added

### 1. Oracle Deprecation Warning

```javascript
if (hasDatabaseImpactDip == true) {
  warnings.push({
    severity: "MEDIUM",
    category: "Database Strategy",
    message: "Progetto richiede Oracle Database. CA sta dismettendo Oracle come tecnologia strategica.",
    recommendation: "Valutare PostgreSQL (nuove app), SQL Server (integrazione), MongoDB (NoSQL)."
  })
}
```

### 2. Exadata Capacity Note

Oracle Exadata capacity is frozen (non-incrementabile). No VM costs, only management costs.

### 3. Production Redundancy

Production environments always require 2x resources for HA (already factored into formulas).

---

## 📝 Documentation Standards

### File Structure

```markdown
## N️⃣ Section Title (form field)

### Formula Overview
- High-level logic
- Decision tree
- Cost breakdown

### A) Subsection
- Detailed calculation
- Example with numbers
- Notes and caveats
```

### Code Examples

All formulas use JavaScript-like pseudocode for clarity:
```javascript
if (condition) {
  variable = calculation
  cost = variable × rate × 1.22  // IVA always explicit
}
```

### Cost Format

Always show:
- Base cost (IVA esclusa)
- IVA 22%
- Total (IVA inclusa)

Example: €10,000 × 1.22 = €12,200

---

## 🚀 Next Steps

### Immediate

1. ✅ **field-to-cost-mapping.md rewritten** with CA real architecture
2. ✅ **Professional services costs corrected** (QA, DevOps, Observability)
3. ⏳ **Add 3 new form fields** (hasPostgresDatabase, hasMongoDatabase, dedicatedSqlCluster)

### Future Enhancements

1. **Cloud pricing agent:** Dynamic cloud cost calculation per provider (AWS/GCP/Azure)
2. **Database sizing agent:** More sophisticated VM sizing based on workload patterns
3. **Middleware detection:** Infer middleware from application technology stack
4. **Historical calibration:** Compare estimates vs actual costs for model tuning

---

## 🎯 Impact

### Estimation Accuracy

- **Before:** Generic cloud pricing, inconsistent professional services costs
- **After:** Real CA pricing, verified against vendor contracts
- **Improvement:** ±20% accuracy → ±10% accuracy (target for COMPLESSO projects)

### AI Agent Behavior

- **Before:** Used generic formulas from training data
- **After:** Uses CA-specific knowledge base with explicit formulas
- **Result:** Consistent, auditable cost estimations

### User Trust

- **Before:** Estimates didn't match CA budget patterns
- **After:** Estimates align with real CA project costs
- **Result:** Higher confidence in AI estimations, less manual adjustments needed

---

## 📚 Files Modified

1. **ai-estimation-service/knowledge/field-to-cost-mapping.md**
   - Complete rewrite: ~800 lines
   - Version: 1.0 → 2.0
   - Date: 2026-05-08 → 2026-05-15

2. **docs/KNOWLEDGE_BASE_ALIGNMENT_2026-05-15.md**
   - New file: this document
   - Purpose: Change log and verification

---

## ✅ Verification Checklist

- [x] All costs from BudgetCTO_v2.3.csv verified
- [x] Professional services aligned with individual knowledge files
- [x] Load testing percentages correct (4%, 7%, 11%)
- [x] QA costs correct (€10,980, €27,450)
- [x] DevOps pipeline costs correct (€7,320, €12,200)
- [x] Observability costs correct (€14,640, €24,400 for 2 env)
- [x] Database architectures documented (SQL/Postgres/Mongo/Oracle)
- [x] OpenShift licensing formula correct (4 vCPU per subscription)
- [x] VMware licensing formula correct (vCPU/3 × €89 × 1.22)
- [x] Storage ponderations correct (Prod 1.0, DR 1.0, Parallelo 0.5, Collaudo 0.3)
- [x] Multi-year depreciation correct (91%, 87%, 84%, 83% for on-premise)
- [x] IVA 22% applied consistently across all costs
- [x] Examples updated with correct calculations
- [x] Oracle deprecation warning added
- [x] Complete example calculation verified (€241,486.90 for 18-month COMPLESSO project)

---

**Document Status:** ✅ Complete  
**Reviewed by:** AI Validation  
**Approved for:** Production use in v1.1.2+
