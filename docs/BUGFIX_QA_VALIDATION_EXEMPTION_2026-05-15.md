# Bug Fix: QA Validation False Positive for qa="NO"

**Date:** 2026-05-15  
**Version:** 1.1.4  
**Severity:** MEDIUM  
**Impact:** Validation agent incorrectly flagging valid governance exemptions

---

## 🐛 Problem Description

The validation agent was flagging **HIGH severity errors** for quotations with `qa = "NO"`, even though this is a valid governance exemption.

**Validation Warning (Incorrect):**
> "QA costs are €0 (0% of total project cost). Crédit Agricole governance requires MINIMUM 10% of total project cost allocated to QA. The form shows 'qa_required: NO' but this violates mandatory governance policy."

**Reality:**
- Governance **does** require QA ≥10% of total cost
- **EXCEPTION**: `qa = "NO"` is an explicit exemption (project owner choice)
- Validation should **NOT** flag when `qa = "NO"`

---

## 📋 Case Study: PRJ0123456

**Form Data:**
```json
{
  "qa": "NO",
  "projectType": "Evolution",
  "microservicesCount": 5,
  "total_project_cost": 3943
}
```

**Validation Output (Before Fix):**
```json
{
  "severity": "HIGH",
  "category": "QA Budget Compliance",
  "message": "QA costs are €0 (0% of total project cost). Governance requires minimum 10% of total project cost for QA activities. The assumption 'qa=NO' contradicts standard governance requirements for production systems affecting 50 volumes/day and Central Directorate Users."
}
```

**Problem:** Validation agent didn't recognize `qa = "NO"` as a valid exemption.

---

## ✅ Governance Rules (Clarified)

### Rule
**Crédit Agricole governance requires QA costs ≥ 10% of total project cost.**

### Exception
**If `qa = "NO"` in form data:**
- Rule does **NOT** apply
- This is an **explicit governance exemption**
- Project owner has consciously chosen to exclude QA services
- Validation agent should **NOT** flag this as an error

### When to Flag QA Issues
**Only flag when:**
```javascript
if (qa != "NO" && qa_cost < (total_project_cost * 0.10)) {
  // Flag: MEDIUM severity
  // Message: "QA costs are X% of total budget. Governance requires minimum 10%."
}
```

**Do NOT flag when:**
```javascript
if (qa == "NO") {
  // Skip QA validation entirely
  // This is a valid exemption
}
```

---

## 🔧 Solution Implemented

### File Modified
**ai-estimation-service/prompts/validation-agent-prompt.md**

### Changes

**1. Updated Rule Definition (Line 30-33)**

**Before:**
```markdown
- **QA costs must be ≥10%** of total project cost (governance requirement)
```

**After:**
```markdown
- **QA costs must be ≥10%** of total project cost (governance requirement)
  - **EXCEPTION**: If `qa_required = "NO"` in form data, this rule does NOT apply (explicit governance exemption)
  - Only validate QA percentage if QA is actually required/requested
```

**2. Added Governance Exemptions Section (New Section 1.1)**

```markdown
### 1.1 Governance Exemptions (Do NOT flag these scenarios)

**QA = "NO" Exemption:**
When form data shows `qa = "NO"` or `qa_required = "NO"`:
- DO NOT flag "QA costs are €0"
- DO NOT flag "QA is 0% of total project cost"
- DO NOT require minimum 10% QA budget
- This is an **explicit governance exemption** requested by project owner
- The requestor has consciously chosen to exclude QA services

**Only flag QA budget issues when:**
- `qa != "NO"` AND QA costs < 10% of total project cost
- In this case, use MEDIUM severity (not HIGH)
```

**3. Updated Example (Line 144-148)**

**Before:**
```json
{
  "severity": "MEDIUM",
  "category": "QA Budget",
  "message": "QA costs are 8% of total project budget. Governance requires minimum 10%.",
  "recommendation": "Increase QA budget to at least 10%..."
}
```

**After:**
```json
{
  "severity": "MEDIUM",
  "category": "QA Budget",
  "message": "QA costs are 8% of total project budget. Governance requires minimum 10%.",
  "recommendation": "Increase QA budget to at least 10%...",
  "note": "IMPORTANT: Only flag this if qa_required != 'NO' in form data. If qa='NO', skip this check entirely (explicit governance exemption)."
}
```

---

## 🧪 Expected Behavior After Fix

### Test Case 1: qa = "NO" (Valid Exemption)

**Input:**
```json
{
  "qa": "NO",
  "total_project_cost": 10000,
  "qa_cost": 0
}
```

**Expected Validation:**
- ✅ No QA-related warnings
- ✅ No governance violation flags
- ✅ Exemption recognized

**Before Fix:** ❌ HIGH severity "QA Budget Compliance" error  
**After Fix:** ✅ No error

---

### Test Case 2: qa = "YES", QA < 10% (Violation)

**Input:**
```json
{
  "qa": "YES",
  "total_project_cost": 10000,
  "qa_cost": 800
}
```

**Expected Validation:**
- ⚠️ MEDIUM severity warning
- Message: "QA costs are 8% of total budget. Governance requires minimum 10%."

**Before Fix:** ✅ Correctly flagged  
**After Fix:** ✅ Correctly flagged

---

### Test Case 3: qa = "YES", QA ≥ 10% (Compliant)

**Input:**
```json
{
  "qa": "YES",
  "total_project_cost": 10000,
  "qa_cost": 1000
}
```

**Expected Validation:**
- ✅ No warnings
- ✅ Compliant with governance

**Before Fix:** ✅ No error  
**After Fix:** ✅ No error

---

## 📊 Impact Analysis

### Quotations Affected

Any quotation with `qa = "NO"` was receiving false positive HIGH severity errors:

```sql
SELECT 
  id, 
  project_code, 
  form_data->>'qa' AS qa_value
FROM quotations
WHERE form_data->>'qa' = 'NO'
  AND status IN ('IN VALUTAZIONE', 'COMPLETATA');
```

**Expected:** ~20-30% of quotations (Evolution/LIGHT projects often skip QA)

### Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| `qa = "NO"`, €0 QA cost | ❌ HIGH severity error | ✅ No error |
| `qa = "YES"`, 8% QA cost | ✅ MEDIUM warning | ✅ MEDIUM warning |
| `qa = "YES"`, 12% QA cost | ✅ No error | ✅ No error |

---

## 🎯 Root Cause

**Validation prompt lacked conditional logic:**
- Original rule: "QA costs must be ≥10%" (absolute)
- Missing: "UNLESS qa = 'NO'" (exemption)

**Why it happened:**
- Initial validation prompt written with strict governance rules
- Exemptions were known but not explicitly documented
- AI couldn't infer exemption logic from context alone

---

## 📚 Related Knowledge Base Files

### qa-quality-assurance-costs.md (Already Correct)

Line 21 already documented the exemption:
```markdown
├─ qa field = 'NO'?
│  └─ YES → €0 (Requestor explicitly declined QA)
```

**The knowledge base was correct, but the validation prompt wasn't checking form data correctly.**

---

## 🚀 Deployment Notes

### Pre-Deployment
- [x] Update validation prompt with exemption logic
- [x] Add explicit section for governance exemptions
- [x] Update example warnings with conditional note
- [x] Build AI service (successful)

### Post-Deployment
- [ ] Retry validation for PRJ0123456
- [ ] Verify "QA Budget Compliance" warning disappears
- [ ] Test new quotation with `qa = "NO"` → should NOT trigger warning
- [ ] Test quotation with `qa = "YES"` + low QA → SHOULD trigger warning

### Monitoring
Check validation logs for:
```bash
grep "QA Budget" ai-estimation-service/logs/ai-estimation-2026-05-15.log
```

Should NOT appear for quotations with `qa = "NO"`.

---

## 🔗 Related Issues

- **PRJ0123456 validation warnings**: QA warning was false positive
- **Em-dash bug**: Separate issue causing pipeline misrecognition
- **Knowledge base alignment**: qa-quality-assurance-costs.md already correct

---

## 🎓 Lessons Learned

1. **Validation prompts must mirror knowledge base exemptions**
   - Knowledge base had `qa = "NO" → €0` logic
   - Validation prompt didn't check this condition

2. **Conditional rules need explicit "DO NOT flag" instructions**
   - Negative conditions are harder for AI to infer
   - Better to be explicit: "If X, skip this check"

3. **Governance exemptions should be prominently documented**
   - Added dedicated section "Governance Exemptions"
   - Makes it impossible for AI to miss

4. **Test both positive and negative scenarios**
   - Test `qa = "NO"` → should pass
   - Test `qa = "YES"` with low % → should fail
   - Test `qa = "YES"` with high % → should pass

---

**Document Status:** ✅ Complete  
**Changes Committed:** Pending  
**Version Target:** 1.1.4 (same as em-dash fix)
