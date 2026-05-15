# Bug Fix: Em-Dash in Pipeline/Duration/Budget Options

**Date:** 2026-05-15  
**Version:** 1.1.4 (planned)  
**Severity:** HIGH  
**Impact:** AI estimation parsing failures, incorrect CAPEX calculations

---

## 🐛 Problem Description

Form options for pipeline, project duration, and project budget used **em-dash (–, Unicode 8211)** instead of **hyphen-minus (-, ASCII 45)**, causing:

1. **AI parsing failures**: Claude AI couldn't interpret `"5–15"` as a valid range
2. **Incorrect assumptions**: AI assumed "existing pipelines reused" instead of recognizing MEDIO threshold
3. **Missing CAPEX**: Projects with `pipeline = "5–15"` got €0 instead of €7,320

---

## 📋 Affected Options

### Frontend (`quotation-form-config.service.ts`)

**Before:**
```typescript
projectDurationOptions = ['1–6 months', '7–12 months', '> 1 year', 'multi-year']
projectBudgetOptions = ['Up to 500', '500–1,000', '1,000–5,000', '> 5,000']
pipelineOptions = ['< 5', '5–15', '15–40', '> 40']
```

**After:**
```typescript
projectDurationOptions = ['1-6 months', '7-12 months', '> 1 year', 'multi-year']
projectBudgetOptions = ['Up to 500', '500-1,000', '1,000-5,000', '> 5,000']
pipelineOptions = ['< 5', '5-15', '15-40', '> 40']
```

### Backend (`quotations.dto.ts`)

**Before:**
```typescript
export const PROJECT_DURATION_OPTIONS = ['1–6 months', '7–12 months', '> 1 year', 'multi-year'] as const;
export const PROJECT_BUDGET_OPTIONS = ['Up to 500', '500–1,000', '1,000–5,000', '> 5,000'] as const;
export const PIPELINE_OPTIONS = ['< 5', '5–15', '15–40', '> 40'] as const;
```

**After:**
```typescript
export const PROJECT_DURATION_OPTIONS = ['1-6 months', '7-12 months', '> 1 year', 'multi-year'] as const;
export const PROJECT_BUDGET_OPTIONS = ['Up to 500', '500-1,000', '1,000-5,000', '> 5,000'] as const;
export const PIPELINE_OPTIONS = ['< 5', '5-15', '15-40', '> 40'] as const;
```

---

## 🔍 Root Cause Analysis

### Character Comparison

| Character | Name | Unicode | Usage |
|-----------|------|---------|-------|
| `-` | Hyphen-minus | U+002D (45) | ✅ Correct for ranges |
| `–` | En-dash | U+2013 (8211) | ❌ Typographic, not parseable |
| `—` | Em-dash | U+2014 (8212) | ❌ Typographic, not parseable |

### Why It Happened

Likely copy-paste from Word/Google Docs which auto-converts hyphens to em-dashes for typography.

### How AI Interprets

```javascript
// With em-dash (char 8211)
"5–15" → AI sees: "5<strange char>15" → Not recognized as range

// With hyphen (char 45)
"5-15" → AI sees: "5-15" → Recognized as MEDIO threshold (€7,320)
```

---

## 📊 Impact on PRJ0123456

**Case Study: Test versione 1.1.3**

**Form Data:**
```json
{
  "pipeline": "5–15",  // ← Em-dash (8211)
  "microservicesCount": 5,
  "needNewInfrastructure": true,
  "qa": "NO"
}
```

**AI Interpretation:**
- Pipeline value not recognized as "5-15"
- Assumed "existing pipelines reused" (Evolution project)
- CAPEX = €0 (no DevOps Pipeline cost)

**Expected vs Actual:**

| Component | Expected (MEDIO) | Actual | Difference |
|-----------|------------------|--------|------------|
| DevOps Pipeline | €7,320 | €0 | -€7,320 |
| Load Testing (7%) | €512 | €0 | -€512 |
| **Total CAPEX** | **€7,832** | **€0** | **-€7,832** |

**Validation Warnings Triggered:**
- ❌ Missing CAPEX - Professional Services
- ❌ Project Classification Mismatch (LIGHT expected €50-100k, got €3,943)
- ❌ Missing DevOps/Pipeline Costs

---

## ✅ Solution

### Files Modified

1. **frontend/src/app/features/dashboard/services/quotation-form-config.service.ts**
   - Line 7-12: `projectDurationOptions` (2 em-dashes → hyphens)
   - Line 14-19: `projectBudgetOptions` (2 em-dashes → hyphens)
   - Line 47: `pipelineOptions` (2 em-dashes → hyphens)

2. **backend/src/modules/quotations/dto/quotations.dto.ts**
   - Line 15-20: `PROJECT_DURATION_OPTIONS` (2 em-dashes → hyphens)
   - Line 23-28: `PROJECT_BUDGET_OPTIONS` (2 em-dashes → hyphens)
   - Line 50: `PIPELINE_OPTIONS` (2 em-dashes → hyphens)

3. **ai-estimation-service/src/api/estimation.controller.ts**
   - Added JSON logging after estimation generation
   - Added JSON logging after validation completion

### Verification

**Character code test:**
```bash
# Before
echo "5–15" | od -An -tu1
# Output: 53 226 128 147 49 53  (em-dash = 226 128 147 in UTF-8)

# After
echo "5-15" | od -An -tu1
# Output: 53 45 49 53  (hyphen = 45)
```

---

## 🧪 Testing

### Test Case 1: New Quotation with Pipeline 5-15

**Steps:**
1. Create quotation with `pipeline = "5-15"` (fixed value)
2. Set `needNewInfrastructure = true`
3. Set `microservicesCount = 5`
4. Submit for AI estimation

**Expected Result:**
- CAPEX ≥ €7,320 (DevOps Pipeline MEDIO)
- Load testing calculated as 4-11% of CAPEX
- No "Pipeline value not recognized" warnings

### Test Case 2: Existing Quotations

**Database check:**
```sql
SELECT id, project_code, form_data->>'pipeline' AS pipeline_value
FROM quotations
WHERE form_data->>'pipeline' LIKE '%–%'  -- Em-dash search
LIMIT 10;
```

**Action:** Existing quotations with em-dash values remain unchanged in database. New estimations will use corrected form values.

---

## 🚀 Deployment

### Pre-Deployment

- [x] Fix frontend options (em-dash → hyphen)
- [x] Fix backend validation constants
- [x] Add detailed JSON logging to AI service
- [x] Compile all three services
- [ ] Test new quotation creation
- [ ] Verify AI correctly interprets "5-15"

### Post-Deployment

- [ ] Monitor logs for "ESTIMATION DATA" entries
- [ ] Retry estimation for PRJ0123456 (should now calculate €7,320 pipeline)
- [ ] Verify no more "Pipeline value not recognized" assumptions

---

## 📚 Lessons Learned

1. **Always use ASCII characters for machine-readable values**
   - Hyphens for ranges: `5-15`
   - Apostrophes: `'` not `'` or `'`
   - Quotes: `"` not `"` or `"`

2. **Validation should catch non-ASCII characters**
   - Add ESLint rule to flag Unicode dashes in string literals
   - Or use constants: `const HYPHEN = '-'` instead of typing manually

3. **AI is sensitive to exact string formats**
   - Small character differences cause major parsing failures
   - Always log exact character codes when debugging string issues

---

## 🔗 Related Issues

- **Missing CAPEX for PRJ0123456**: Em-dash prevented pipeline recognition
- **Validation warning "Missing DevOps/Pipeline Costs"**: Correct, AI didn't see "5-15"
- **Frontend error "mettendo le pipeline a meno di 5"**: User likely saw validation error due to em-dash

---

**Document Status:** ✅ Complete  
**Changes Committed:** Pending  
**Version Target:** 1.1.4