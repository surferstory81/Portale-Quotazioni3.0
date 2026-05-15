# Testing Guide for v1.1.4 Bug Fixes

## Overview

Version 1.1.4 fixes 4 critical bugs. This document provides testing procedures to verify each fix.

## Quick Test (Automated Script)

### Prerequisites
- Backend running on port 3000
- AI estimation service running on port 3001
- Admin credentials

### Run Test Script

```bash
# From project root
ADMIN_EMAIL=your-email@credit-agricole.it ADMIN_PASSWORD=YourPassword node scripts/test-v1.1.4-manual.js
```

The script will:
1. Login as admin
2. Create test quotation with pipeline "5-15", qa="NO", 3 months duration
3. Take quotation in charge
4. Trigger AI estimation
5. Wait for completion (70-90 seconds)
6. Display results with automated verification

### Expected Results

✅ **Test 1 - Em-dash Fix**: CAPEX ≥ €7,000 (includes pipeline MEDIO ~€7,320)  
✅ **Test 2 - QA Exemption**: No QA governance warnings (qa="NO" correctly exempted)  
✅ **Test 3 - OPEX Projection**: Year 2 = 3.0-4.0x Year 1 (annualized, not prorated)  
✅ **Test 4 - Dynatrace Pricing**: No obsolete €0.08/hour pricing in assumptions

---

## Manual Test (UI)

If you prefer to test via UI, follow these steps:

### 1. Create Test Quotation

Navigate to **User Dashboard → New Quotation**

**Basic Info:**
- Project Code: `TEST-V114-MANUAL`
- Project Name: `Manual Test v1.1.4`
- Start Date: `2026-06-01`
- End Date: `2026-08-31` (3 months)
- Duration: `1-6 months`
- Budget: `Up to 500`
- Type: `Evolution`
- Risk: `Minimal`

**Architecture:**
- Architectural Impact: `YES`
- New Infrastructure: `YES`
- Microservices: `YES`
- Microservices Count: `5`
- On-Premise Dipartimentale: `YES`

**Resources:**
- Compute Cores: `10`
- Storage GB: `50`
- Scheduled Batches: `2`

**Pipeline (CRITICAL FOR TEST):**
- Pipeline: `5-15` ← **Must be this value to test em-dash fix**
- Has Existing Pipelines: `YES`

**Monitoring:**
- Monitoring Systems: `Existing (no action)`
- Observability: `Existing (no action)`

**QA (CRITICAL FOR TEST):**
- QA: `NO` ← **Must be NO to test exemption logic**

**Database:**
- All database options: `NO`

**Service:**
- Impact Entity: `Limited`
- Service Consumer: `Central Directorate Users`
- Service Volumes Per Day: `50`
- Technological Impact: `Continuity with AS IS`
- Service Exposure: `NO`

**Development:**
- Developed Internally: `YES`
- CA Intellectual Property: `YES`
- Expected Releases: `2`

Submit quotation.

### 2. Admin Processing

Navigate to **Admin Dashboard → Quotations Management**

1. Find quotation `TEST-V114-MANUAL`
2. Click "Take in Charge" (👤 button)
3. Click "Change Status" → Select `IN VALUTAZIONE`
4. Wait 70-90 seconds for AI estimation

### 3. Verify Results

Click "View Details" on the quotation.

#### Test 1: Em-dash Fix (Pipeline Recognition)

**What to check:**
- Go to "AI Estimation" section
- Check "Total CAPEX" value
- Look for "DevOps Pipeline" line item in breakdown

**Expected:**
- ✅ Total CAPEX ≥ €7,000
- ✅ DevOps Pipeline line item shows ~€7,320 (MEDIO complexity)
- ✅ Line item mentions "5-15 pipelines"

**If FAIL:**
- ❌ Total CAPEX = €0 or very low
- ❌ No pipeline line item
- ❌ Line item shows €0 or mentions "unknown pipeline complexity"

**Why it matters:**  
Before v1.1.4, the frontend/backend used em-dash "5–15" (Unicode 8211) but the AI expected hyphen "5-15" (ASCII 45). This caused the AI to not recognize the pipeline complexity, resulting in €0 CAPEX instead of €7,320.

---

#### Test 2: QA Validation Exemption

**What to check:**
- Go to "Validation Issues" section
- Look for any warnings mentioning "QA" or "Quality Assurance"

**Expected:**
- ✅ No QA-related warnings
- ✅ No "Missing QA Costs - Governance Violation" message
- ✅ No "QA costs are €0" warnings

**If FAIL:**
- ❌ Warning: "QA costs are €0 (0% of total project cost)"
- ❌ Warning: "Crédit Agricole governance requires MINIMUM 10% of total project cost allocated to QA"
- ❌ Severity: HIGH or MEDIUM

**Why it matters:**  
Before v1.1.4, the validation agent flagged qa="NO" as a governance violation. The rule "QA must be ≥10% of total project cost" is true, BUT when qa="NO", this rule should be skipped (explicit exemption). The fix added "Governance Exemptions" section to the validation prompt.

---

#### Test 3: OPEX Multi-Year Projection

**What to check:**
- Go to "AI Estimation" section
- Look for "OPEX Projection (5 years)" table
- Compare Year 1 vs Year 2 values

**Expected:**
- ✅ Year 2 is ~3.0-4.0x Year 1 (for 3-month project)
- ✅ Example: Year 1 = €10,000 → Year 2 = €33,000-€37,000
- ✅ Validation does NOT flag "OPEX projection shows increasing costs"

**If FAIL:**
- ❌ Year 2 ≈ Year 1 (no increase)
- ❌ Year 2 < Year 1 (wrong depreciation base)
- ❌ Validation warning: "OPEX projection shows 350%+ increase"

**Why it matters:**  
For short projects (< 12 months), Year 1 OPEX is **prorated** to project duration (e.g., 3 months = Annual/4). Before v1.1.4, the AI calculated Year 2-5 by applying depreciation to the prorated Year 1 value, which is wrong. 

**Correct logic:**
- Year 1: €40,000 × 3/12 = **€10,000** (prorated)
- Year 2: €40,000 × 0.91 = **€36,400** (annualized + depreciation)
- Year 3: €40,000 × 0.87 = €34,800
- etc.

The fix added explicit instructions in the estimation prompt to store both `opex_year_1` (prorated) and `opex_year_1_annualized` (full annual cost), then use the annualized value for Year 2-5 calculations.

---

#### Test 4: Dynatrace Pricing

**What to check:**
- Go to "AI Estimation" section
- Expand "Assumptions" or "Line Items"
- Look for any text mentioning "Dynatrace", "monitoring", or "€0.08"

**Expected:**
- ✅ No mentions of "€0.08/hour"
- ✅ No mentions of "0.08 per hour"
- ✅ If Dynatrace costs present, should reference CA pricing:
  - €39.79/GB RAM/year
  - €14.86/POD/year
  - €159.12/VM/year
  - €741.16/GB logs/year

**If FAIL:**
- ❌ Text mentions "€0.08/hour per host"
- ❌ Text mentions "€0.08-0.15/hour"
- ❌ Dynatrace cost calculated with obsolete AWS/Azure pricing

**Why it matters:**  
The knowledge base file `software-licenses.md` contained obsolete generic Dynatrace pricing (€0.08/hour) that was never correct for Crédit Agricole. The real CA pricing is documented in `field-to-cost-mapping.md` and is significantly different (€39.79/GB RAM, not per-hour). The fix removed the obsolete section and redirected to the correct CA pricing.

---

## Troubleshooting

### Backend not responding
```bash
# Check if backend is running
curl http://localhost:3000/health

# If not, start backend
cd backend
npm run start:dev
```

### AI estimation stuck at "PROCESSING"
```bash
# Check AI service logs
cd ai-estimation-service
npm run start:dev

# Check if AWS Bedrock credentials are configured
# File: ai-estimation-service/.env
# AWS_REGION=eu-central-1
# (Uses IAM role or environment credentials)
```

### Quotation created but no AI estimation triggered
- Verify you clicked "Take in Charge" before changing status
- Status must be changed to "IN_VALUTAZIONE" to trigger AI
- Check backend logs for errors:
  ```bash
  cd backend
  tail -f logs/app-2026-05-15.log
  ```

### AI estimation failed (status = FAILED or ERROR)
- Check AI service logs for detailed error
- Verify AWS Bedrock quota not exceeded
- Check if form data is complete (all required fields)

---

## Verification Summary

After running tests (automated or manual), you should be able to confirm:

| Test | Component | Expected Result | Pass/Fail |
|------|-----------|----------------|-----------|
| 1. Em-dash | Frontend + Backend | Pipeline "5-15" → CAPEX €7,320 | ⬜ |
| 2. QA Exemption | AI Validation Agent | qa="NO" → No QA warnings | ⬜ |
| 3. OPEX Projection | AI Estimation Agent | Year 2 = 3.0-4.0x Year 1 | ⬜ |
| 4. Dynatrace Pricing | Knowledge Base | No €0.08/hour mentions | ⬜ |

---

## Related Documentation

- **CHANGELOG.md**: Full list of changes in v1.1.4
- **docs/BUGFIX_EM_DASH_PIPELINE_2026-05-15.md**: Detailed analysis of em-dash bug
- **docs/BUGFIX_QA_VALIDATION_EXEMPTION_2026-05-15.md**: QA exemption logic
- **docs/BUGFIX_OPEX_PROJECTION_2026-05-15.md**: Multi-year OPEX calculation fix
- **docs/FEATURE_CORRECTION_AGENT.md**: Future feature to auto-detect similar issues

---

## Questions?

If tests fail or you encounter unexpected behavior, check:

1. **Git branch**: Ensure you're on `dev` branch with latest commits
2. **Version**: Check `http://localhost:3000/health` shows version `1.1.4`
3. **Logs**: Check `ai-estimation-service/logs/` and `backend/logs/` for detailed error messages
4. **Database**: Query `ai_estimations` table to see raw `estimation_data` and `validation_data` JSON

For assistance, contact the development team or open an issue in the project repository.