# 🧪 Manual Test Instructions - v1.1.1

**Date:** 2026-05-14  
**Purpose:** Verify AI estimation with Professional Services costs

---

## ✅ Prerequisites

All services are running:
- ✅ Backend: http://localhost:3000 (v1.1.1)
- ✅ AI Service: http://localhost:3001 (v1.1.1)
- ✅ Frontend: http://localhost:4200 (running)

---

## 📝 Test Quotation Details

**Quotation ID:** `b491b4b3-d338-4902-85ae-57a60ad8051c`  
**Project Code:** `PRJ6746195`  
**Status:** INVIATA (ready for AI estimation)

**Test User Created:**
- Email: `testTEST745215@ca.it`
- Matricola: `TEST745215`
- Password: `Password123!`
- Role: USER (not admin)

---

## 🎯 Test Steps

### Step 1: Open Frontend
```
URL: http://localhost:4200/admin
```

### Step 2: Login as Admin
**You need an existing admin account.**

If you don't have one, you have two options:

**Option A - Use existing admin:**
- Check if you have admin credentials from previous sessions
- Login with those credentials

**Option B - Create new admin via database:**
```bash
# Use SQLite browser or command line to run:
UPDATE user SET role = 'ADMIN' WHERE email = 'testTEST745215@ca.it';
```

Then login with:
- Email: `testTEST745215@ca.it`
- Password: `Password123!`

### Step 3: Find Test Quotation
In the admin dashboard:
1. Navigate to "Gestione Quotazioni" or search
2. Search for: **PRJ6746195**
3. Or filter by status: **INVIATA**

You should see:
- Project Name: "Test Quotation - Professional Services COMPLESSO"
- User: testTEST745215@ca.it
- Status: INVIATA

### Step 4: Trigger AI Estimation
1. Click on the quotation to open details
2. Look for "Take in Charge" or status change dropdown
3. Change status to: **IN VALUTAZIONE**
4. System will automatically trigger AI estimation

### Step 5: Wait for Processing
- Processing time: **70-90 seconds**
- You should see a progress indicator
- Dashboard may auto-refresh every 10s

### Step 6: View AI Estimation
Once completed, you should see:
1. Status changed to **AI_VALIDATED** (if successful)
2. "View AI Estimation" button or link
3. Click to view detailed estimation

---

## ✅ Verification Checklist

### Classification
- [ ] Classification band = **COMPLESSO** or **SPECIALE**

### CAPEX Components
- [ ] Dynatrace Dashboard Setup present
- [ ] DevOps Pipeline Setup present
- [ ] QA Infrastructure present
- [ ] Load Testing present

### **Professional Services (NEW - MAIN TEST)**

#### Feasibility Study
- [ ] **Line item "Studio di Fattibilità" exists**
- [ ] **Cost = €32,232** (or close for COMPLESSO)
- [ ] Breakdown shows:
  - [ ] Cloud Solution Architect: 20 days × €610
  - [ ] Cloud Engineer: 20 days × €450
  - [ ] PM Junior: 12 days × €435
- [ ] Duration: 2 months
- [ ] Level: LEVEL_3

#### RFC Support
- [ ] **Line item "Apertura RFC e Realizzazione Infrastrutture" exists**
- [ ] **Cost = €18,300** (for COMPLESSO)
- [ ] Breakdown shows:
  - [ ] Senior Infrastructure Automation Specialist: 30 days × €500
- [ ] Duration: 3 months × 0.5 FTE
- [ ] Level: LEVEL_3

#### Total Professional Services
- [ ] **Total = €50,532** (€32,232 + €18,300)
- [ ] Included in total CAPEX

### AI Output Quality
- [ ] Assumptions mention professional services
- [ ] Reasoning explains classification choice
- [ ] No high-severity validation errors
- [ ] Confidence > 70%

---

## 📊 Expected Values (COMPLESSO Profile)

| Component | Expected Cost | Notes |
|-----------|---------------|-------|
| Dynatrace Dashboard | €24,400 | serviceRisk Relevant |
| DevOps Pipeline | €12,200 | COMPLESSO + no existing pipelines |
| QA Infrastructure | €27,450 | COMPLESSO + QA=YES |
| Load Testing | ~7% of CAPEX | COMPLESSO + high risk |
| **Feasibility Study** | **€32,232** | **requiresFeasibilityStudy=true** |
| **RFC Support** | **€18,300** | **requiresRfcSupport=true** |

**Total Professional Services: €50,532**

---

## 🐛 Troubleshooting

### If AI estimation fails:
1. Check backend logs: `C:/Users/J18331-CyberArk/IdeaProjects/Portale-Quotazioni3.0/backend/logs/`
2. Check AI service logs: `C:/Users/J18331-CyberArk/IdeaProjects/Portale-Quotazioni3.0/ai-estimation-service/logs/`
3. Verify AWS Bedrock credentials are configured
4. Retry estimation from admin dashboard

### If professional services are missing:
1. Check that knowledge files exist:
   - `ai-estimation-service/knowledge/professional-services-costs.md`
2. Verify form data saved correctly:
   ```bash
   curl -H "Authorization: Bearer TOKEN" \
     http://localhost:3000/quotations/b491b4b3-d338-4902-85ae-57a60ad8051c
   ```
3. Check that AI service loaded knowledge files on startup

### If quotation not found:
- Create a new one using: `node scripts/test-quotation.js`
- Or use the web UI to create manually with the same fields

---

## 📸 What to Look For

### In the Estimation Viewer
You should see line items like:

```
CAPEX Components:
  ├─ Dynatrace Dashboard Setup          €24,400
  ├─ DevOps Pipeline Setup               €12,200
  ├─ QA Infrastructure                   €27,450
  ├─ Load Testing                        €XX,XXX (variable)
  ├─ 🆕 Studio di Fattibilità           €32,232 ⭐
  └─ 🆕 RFC Support & Infra Implementation €18,300 ⭐
```

### In the Breakdown Section
Should have:
```json
{
  "capex": {
    "professional_services": {
      "feasibility_study": {
        "level": "LEVEL_3",
        "duration_months": 2,
        "total": 32232,
        "team": [...]
      },
      "rfc_support": {
        "level": "LEVEL_3",
        "duration_months": 3,
        "fte": 0.5,
        "total": 18300
      },
      "total_professional_services": 50532
    }
  }
}
```

---

## ✅ Success Criteria

The test is **PASSED** if:
1. ✅ AI estimation completes without errors
2. ✅ Classification is COMPLESSO or SPECIALE
3. ✅ **Feasibility Study line item present with €32,232**
4. ✅ **RFC Support line item present with €18,300**
5. ✅ Both services show correct team composition and duration
6. ✅ Total CAPEX includes professional services

The test is **FAILED** if:
- ❌ Professional services not included in estimation
- ❌ Costs are significantly different (> 10% variance)
- ❌ Line items missing from breakdown
- ❌ AI doesn't mention professional services in reasoning

---

## 📞 Next Steps

**After verification:**
1. Document results (screenshot or copy estimation data)
2. If PASSED: Update `docs/VERIFICATION_V1.1.1.md` status to ✅ PASSED
3. If FAILED: Review AI service logs and knowledge files
4. Create commit with verification results

**Test completed by:** _____________  
**Date:** _____________  
**Result:** [ ] PASSED  [ ] FAILED  
**Notes:** _____________________________________________________________

---

**Quick Links:**
- Frontend: http://localhost:4200/admin
- Backend Health: http://localhost:3000/health
- AI Service Health: http://localhost:3001/health
- Test Quotation: PRJ6746195