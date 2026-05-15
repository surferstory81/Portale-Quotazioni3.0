# Bugfix: OPEX Double-Counting in AI Estimation

**Date:** 2026-05-14  
**Issue:** Mathematical error - Line items sum doesn't match total_opex_year_1  
**Severity:** HIGH - Produces incorrect cost estimates  
**Reported by:** l.falcioni@reply.it

---

## 🐛 Problem Description

The AI estimation agent was creating **double-counting** in OPEX calculations by:

1. Creating line items with base costs
2. Adding separate line items for "Project Duration Adjustment"
3. Adding separate line items for "Risk Contingency"
4. Summing all line items to get total_opex_year_1

**Example of the error:**
```
Line Items:
  - Infrastructure Management: €24,000
  - Database Management: €12,000
  - Licenses: €8,000
  - Project Duration Adjustment (18 months): €22,000
  - Risk Contingency (15%): €9,900
  
Total in line_items: €75,900
Stated total_opex_year_1: €75,900

BUT: Duration and contingency are already applied to the base costs!
Actual should be: €44,000 * (18/12) * 1.15 = €75,900

Line items show: €44,000 (base) + €22,000 (duration) + €9,900 (risk) = DOUBLE COUNTING
```

**Reported error message:**
```
Mathematical Error - Line Item Totals: OPEX line items sum to €401,331 
but stated 'total_opex_year_1' is €762,528. Difference of €361,197 is 
attributed to 'Project Duration Adjustment' (€234k) and 'Risk Contingency' 
(€127k), but these are already included in line_items. Double-counting detected.
```

---

## 🔍 Root Cause

The estimation prompt (`estimation-agent-prompt.md`) explained the calculation steps:

1. **Step 7: Project Duration Proration** - Apply duration adjustment
2. **Step 2: Apply Risk Buffer** - Apply risk contingency

But it didn't explicitly state that these should **NOT** be separate line items.

The AI interpreted this as:
- Create base line items (annual costs)
- Create adjustment line items (duration + risk)
- Sum everything

Instead of:
- Create line items with ALREADY ADJUSTED costs
- No separate adjustment line items

---

## ✅ Solution

### 1. Clarified Project Duration Proration

**Added to Step 7:**
```markdown
**⚠️ CRITICAL - Line Items:**
- Each OPEX line item should show the ALREADY PRORATED cost
- DO NOT create separate line items for "Project Duration Adjustment" or "Project Duration Proration"
- Example: If annual infrastructure management is €24,000 for 18 months:
  - Line item cost: €36,000 (€24,000 / 12 * 18)
  - Line item description: "Infrastructure Management - On-premise (18 months prorated)"
  - NO separate "Duration Adjustment" line item
```

### 2. Clarified Risk Contingency Application

**Added to Step 2:**
```markdown
**⚠️ CRITICAL - Line Items:**
- Risk contingency is applied to subtotals, NOT as a separate line item
- DO NOT create line items called "Risk Contingency", "Risk Buffer", or "Contingency Adjustment"
- Instead: include contingency in the cost of each component
- Document in assumptions: "All costs include {X}% risk contingency for {serviceRisk} risk level"
- The line items should already reflect the contingency-adjusted costs
```

### 3. Added Mathematical Validation Section

Created new section with explicit validation rules:

```markdown
## ⚠️ MATHEMATICAL VALIDATION RULES

**Before submitting your estimation, perform these checks:**

### 1. Line Items Must Sum to Totals
SUM(line_items where category='CAPEX') MUST EQUAL summary.total_capex
SUM(line_items where category='OPEX') MUST EQUAL summary.total_opex_year_1

### 2. No Double-Counting of Adjustments
[Shows WRONG vs CORRECT examples]

### 3. Breakdown Must Match Summary
breakdown.capex.* components sum MUST EQUAL summary.total_capex
breakdown.opex_year_1.* components sum MUST EQUAL summary.total_opex_year_1

### 4. First Year Calculation
summary.total_first_year MUST EQUAL summary.total_capex + summary.total_opex_year_1
```

---

## 📝 Changes Made

### File: `ai-estimation-service/prompts/estimation-agent-prompt.md`

**Lines 88-100:** Added explicit warning about risk contingency line items

**Lines 215-232:** Added explicit warning about project duration proration line items

**Lines 348-420:** Added new "MATHEMATICAL VALIDATION RULES" section with:
- Sum validation rules
- Double-counting examples (WRONG vs CORRECT)
- Breakdown validation
- First year calculation check

---

## 🧪 Testing

### Before Fix (Example Error)
```json
{
  "line_items": [
    {"category": "OPEX", "description": "Infrastructure Mgmt", "total_cost": 120000},
    {"category": "OPEX", "description": "Database Mgmt", "total_cost": 50000},
    {"category": "OPEX", "description": "Licenses", "total_cost": 80000},
    {"category": "OPEX", "description": "Support", "total_cost": 40000},
    {"category": "OPEX", "description": "Project Duration Adj (multi-year)", "total_cost": 234000},
    {"category": "OPEX", "description": "Risk Contingency 15%", "total_cost": 127000}
  ],
  "summary": {
    "total_opex_year_1": 651000
  }
}
```

Line items sum: 120k + 50k + 80k + 40k + 234k + 127k = **651k** ✅ (matches)
But 234k and 127k are ALREADY in the base costs = **DOUBLE COUNTING**

Actual base: 120k + 50k + 80k + 40k = 290k
Expected with adjustments: 290k × (24/12) × 1.15 = 667k
Actual stated: 651k
**Discrepancy indicates calculation error**

### After Fix (Expected)
```json
{
  "line_items": [
    {"category": "OPEX", "description": "Infrastructure Mgmt - multi-year prorated, 15% contingency", "total_cost": 276000},
    {"category": "OPEX", "description": "Database Mgmt - multi-year prorated, 15% contingency", "total_cost": 115000},
    {"category": "OPEX", "description": "Licenses - multi-year prorated, 15% contingency", "total_cost": 184000},
    {"category": "OPEX", "description": "Support - multi-year prorated, 15% contingency", "total_cost": 92000}
  ],
  "summary": {
    "total_opex_year_1": 667000
  },
  "assumptions": [
    "All OPEX costs include 15% risk contingency (Moderate risk level)",
    "OPEX costs prorated for multi-year project duration (24 months)"
  ]
}
```

Line items sum: 276k + 115k + 184k + 92k = **667k** ✅
No separate adjustment line items ✅
Calculation: 290k × (24/12) × 1.15 = 667k ✅

---

## ✅ Verification Checklist

To verify the fix works:

- [ ] Create new estimation with multi-year project
- [ ] Check that line_items sum equals summary totals
- [ ] Verify NO line items contain "Duration Adjustment", "Risk Contingency", or similar
- [ ] Verify line item descriptions mention duration and contingency
- [ ] Verify assumptions document the adjustments applied
- [ ] Calculate manually: base × (months/12) × (1 + risk%) should match totals

---

## 🎯 Impact

**Affected estimations:**
- All estimations with project duration != 12 months
- All estimations with serviceRisk that triggers contingency

**Risk before fix:**
- Estimates could be inflated by 50-100%
- Wrong financial decisions based on incorrect costs
- Loss of credibility with business stakeholders

**After fix:**
- Correct mathematical calculations
- Clear, auditable line items
- Transparent assumptions
- AI self-validates before submitting

---

## 📚 Related Documentation

- `ai-estimation-service/prompts/estimation-agent-prompt.md` - Main prompt (updated)
- `ai-estimation-service/knowledge/project-classification-bands.md` - Risk contingency levels
- `docs/VERIFICATION_V1.1.1.md` - Testing documentation

---

## 🔄 Next Steps

1. **Immediate:**
   - Rebuild AI service with updated prompt
   - Test with existing quotation PRJ6746195
   - Verify line items sum correctly

2. **Short-term:**
   - Add backend validation to catch double-counting
   - Create automated tests for sum validation
   - Add UI warning if line items don't match totals

3. **Long-term:**
   - Consider structured output format to prevent this error
   - Add validation-agent check for mathematical consistency
   - Create regression tests for common calculation patterns

---

**Fix Version:** 1.1.2  
**Fixed By:** Claude Code AI  
**Tested By:** _____________  
**Date Verified:** _____________