# Bugfix: OPEX Multi-Year Projection Validation

**Date:** 2026-05-14  
**Version:** 1.1.2  
**Severity:** MEDIUM - False positive validation error  
**Reported by:** l.falcioni@reply.it

---

## 🐛 Problem Description

The validation agent was incorrectly flagging **decreasing OPEX projections as errors**, even when the infrastructure is on-premise where decreasing costs are **expected and correct**.

**Error message received:**
```
Mathematical Error - OPEX Projection: 5-year OPEX projection shows decreasing 
costs (Y2: €108,723 → Y5: €99,050), but this is unrealistic. Cloud services 
typically increase 3-5% annually due to inflation and growth. The calculation 
appears to assume decreasing usage, which contradicts a production service 
with 5,000 daily transactions.
```

**Issue:** The validator assumed ALL infrastructure follows cloud pricing patterns (increasing costs), but:
- **On-premise infrastructure**: Costs DECREASE over time due to depreciation
- **Cloud infrastructure**: Costs INCREASE over time due to inflation
- The validator wasn't distinguishing between the two

---

## 🔍 Root Cause

### Estimation Agent
The estimation prompt explained multi-year projection but was brief:

```markdown
**On-premise infrastructure:** Costs depreciate over 5 years (decreasing)
**Cloud infrastructure:** Flat annual fees (no depreciation)
```

Missing:
- Cloud inflation rate (+3-5% annually)
- Hybrid infrastructure handling
- Clear examples of both patterns

### Validation Agent
The validation prompt had a generic rule:

```markdown
- Verify OPEX projections over 5 years are consistent
```

This rule didn't:
- Check infrastructure type (on-premise vs cloud)
- Understand that decreasing OPEX is normal for on-premise
- Have specific validation logic for each scenario

---

## ✅ Solution

### 1. Enhanced Estimation Prompt

**Added to `estimation-agent-prompt.md` Step 8:**

#### Clear distinction between patterns:

**On-Premise Infrastructure (decreasing costs):**
```
Year 1: 100% (baseline)
Year 2: 91%
Year 3: 87%
Year 4: 84%
Year 5: 83%

Example: €120k → €109k → €104k → €101k → €100k
```

**Cloud Infrastructure (increasing costs):**
```
Year 1: 100% (baseline)
Year 2: 103-105% (+3-5% inflation)
Year 3: 106-110%
Year 4: 109-116%
Year 5: 113-122%

Example: €120k → €125k → €130k → €135k → €140k (4% annual)
```

**Hybrid Infrastructure (mixed pattern):**
```
1. Calculate on-premise OPEX with decreasing pattern
2. Calculate cloud OPEX with increasing pattern
3. Sum both for total projection

Example: €80k on-prem + €40k cloud
Year 2: (€80k × 0.91) + (€40k × 1.04) = €114k (slight decrease)
```

---

### 2. Enhanced Validation Prompt

**Added to `validation-agent-prompt.md`:**

#### Updated Mathematical Accuracy rule:
```markdown
- Verify OPEX projections over 5 years follow correct pattern:
  - **On-premise**: DECREASING costs (83-91% Y2-5) ✅ EXPECTED
  - **Cloud**: INCREASING costs (+3-5% annually) ✅ EXPECTED
  - **Hybrid**: Mix of both patterns
  - ⚠️ DO NOT flag decreasing OPEX as error if infrastructure is on-premise
```

#### New dedicated section: "Multi-Year OPEX Projection Validation"

**Validation steps:**
1. Check infrastructure type from quotation data:
   - `cloudSaas: false` AND `cloudIaasPaasLandingZoneCa: false` → On-premise
   - Either cloud flag = true → Cloud present

2. Analyze OPEX projection trend (increasing/decreasing)

3. Match trend to infrastructure type:
   - On-premise + decreasing → ✅ VALID
   - Cloud + increasing → ✅ VALID
   - Hybrid + mixed → ✅ VALID
   - On-premise + increasing → ⚠️ WARNING
   - Cloud + decreasing → ❌ ERROR

4. Only flag clear mismatches

**Examples added:**
- On-premise with decreasing costs: VALID ✅
- Cloud with increasing costs: VALID ✅
- Cloud with decreasing costs: ERROR ❌
- Unrealistic changes (>±20%): ERROR ❌
- Flat costs for 5 years: WARNING ⚠️

---

## 📊 Examples

### Example 1: On-Premise Project (VALID - No Error)

**Infrastructure:**
- cloudSaas: false
- cloudIaasPaasLandingZoneCa: false
- On-premise VMs and containers

**OPEX Projection:**
```
Year 1: €120,000
Year 2: €109,200 (91% - depreciation)
Year 3: €104,400 (87%)
Year 4: €100,800 (84%)
Year 5: €99,600 (83%)
```

**Validation Result:** ✅ PASS
- Trend: Decreasing
- Infrastructure: On-premise
- Match: ✅ Expected pattern

---

### Example 2: Cloud Project (VALID - No Error)

**Infrastructure:**
- cloudSaas: true
- cloudIaasPaasLandingZoneCa: false
- SaaS platform with managed services

**OPEX Projection:**
```
Year 1: €120,000
Year 2: €124,800 (+4% inflation)
Year 3: €129,792 (+4%)
Year 4: €134,984 (+4%)
Year 5: €140,383 (+4%)
```

**Validation Result:** ✅ PASS
- Trend: Increasing
- Infrastructure: Cloud
- Match: ✅ Expected pattern

---

### Example 3: Hybrid Project (VALID - No Error)

**Infrastructure:**
- cloudSaas: false
- cloudIaasPaasLandingZoneCa: true
- Hybrid: On-premise VMs + Cloud IaaS

**OPEX Breakdown:**
- On-premise: €80,000 Year 1
- Cloud: €40,000 Year 1

**OPEX Projection:**
```
Year 1: €120,000 (€80k + €40k)
Year 2: €114,400 (€72.8k + €41.6k) - slight decrease
Year 3: €112,800 (€69.6k + €43.2k)
Year 4: €112,176 (€67.2k + €44.976k)
Year 5: €112,575 (€66.4k + €46.175k) - starts increasing
```

**Validation Result:** ✅ PASS
- Trend: Mixed (decreases then increases)
- Infrastructure: Hybrid
- Match: ✅ Expected for 67% on-prem / 33% cloud mix

---

### Example 4: Cloud with Decreasing Costs (ERROR ❌)

**Infrastructure:**
- cloudSaas: true
- Cloud platform

**OPEX Projection:**
```
Year 1: €120,000
Year 2: €108,000 (DECREASING)
Year 3: €100,000 (DECREASING)
```

**Validation Result:** ❌ ERROR
- Trend: Decreasing
- Infrastructure: Cloud
- Mismatch: Cloud should increase 3-5% annually
- **Error message:** "Cloud services show decreasing costs, but cloud typically increases 3-5% annually due to inflation and usage growth"

---

## 🎯 Impact

### Before Fix
- ❌ False positive errors on valid on-premise projections
- Confusion about which pattern is correct
- Unnecessary manual review of correct estimations
- User frustration with validation errors

### After Fix
- ✅ Correct validation based on infrastructure type
- Clear understanding: on-premise decreases, cloud increases
- No false positives for valid patterns
- Better error messages that explain WHY something is wrong

---

## 🧪 Testing

### Test Case 1: Pure On-Premise
- Create quotation: no cloud flags
- OPEX projection: decreasing (91% → 83%)
- **Expected:** ✅ No validation errors

### Test Case 2: Pure Cloud
- Create quotation: cloudSaas = true
- OPEX projection: increasing (+4% annually)
- **Expected:** ✅ No validation errors

### Test Case 3: Hybrid
- Create quotation: cloudIaasPaasLandingZoneCa = true
- OPEX projection: mixed pattern
- **Expected:** ✅ No validation errors

### Test Case 4: Cloud with Wrong Pattern
- Create quotation: cloudSaas = true
- OPEX projection: DECREASING (wrong!)
- **Expected:** ❌ Validation error flagged

---

## 📝 Summary

**Files Modified:**
- `ai-estimation-service/prompts/estimation-agent-prompt.md`
  - Step 8: Expanded multi-year projection with 3 scenarios
  - Added examples for each pattern
  
- `ai-estimation-service/prompts/validation-agent-prompt.md`
  - Mathematical Accuracy: Updated OPEX projection validation rule
  - New section: "Multi-Year OPEX Projection Validation" with detailed logic

**Lines Changed:** ~120 lines added

**Result:**
- ✅ Accurate validation based on infrastructure type
- ✅ No more false positives for on-premise decreasing costs
- ✅ Clear error messages when pattern is truly wrong
- ✅ Better understanding of depreciation vs inflation

---

**Fix Version:** 1.1.2  
**Reported:** 2026-05-14  
**Fixed:** 2026-05-14  
**Status:** ✅ RESOLVED
