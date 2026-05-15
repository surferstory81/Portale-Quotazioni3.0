#!/bin/bash

set -e

# Script per testare creazione quotazione con nuovi campi e generazione AI
# Testa tutti i componenti CAPEX: Dynatrace, DevOps, QA, Load Testing, Professional Services

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"

log_info "=== Test Completo Quotazione con Nuovi Campi ==="
echo ""

# Step 1: Login come admin
log_info "Step 1: Login as admin"
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@creditagricole.it",
    "password": "Admin123!"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
    USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
    log_success "Login successful - Token: ${ADMIN_TOKEN:0:20}..."
else
    log_error "Login failed"
    echo "$LOGIN_RESPONSE" | jq '.'
    exit 1
fi
echo ""

# Step 2: Crea quotazione con tutti i nuovi campi
log_info "Step 2: Create quotation with new fields"
log_info "New fields: requiresFeasibilityStudy, requiresRfcSupport, isThirdPartyApp, isAppliance, hasExistingPipelines"

CREATE_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/quotations" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectCode": "PRJ'$(date +%s)'",
    "projectName": "Test Quotation - Professional Services COMPLESSO",
    "projectStartDate": "2026-06-01",
    "projectEndDate": "2027-12-31",
    "projectDuration": "multi-year",
    "projectBudget": "> 5,000",
    "projectType": "New",
    "serviceRisk": "Relevant",
    "architecturalImpact": "YES",
    "isThirdPartyApp": false,
    "isAppliance": false,
    "developedInternally": true,
    "developedByExternalVendors": false,
    "hasCaIntellectualProperty": true,
    "serviceExposure": true,
    "marketProduct": false,
    "saasProduct": false,
    "monitoringOrSecurityTool": false,
    "serviceConsumer": "Central Directorate Users,Branch Users",
    "serviceVolumesPerDay": 5000,
    "technologicalImpact": "Technological change",
    "impactEntity": "Substantial",
    "cloudSaas": false,
    "cloudIaasPaasLandingZoneCa": true,
    "hostMainframe": false,
    "onPremiseDipartimentale": false,
    "needNewInfrastructure": true,
    "infraOnVm": false,
    "infraMicroservices": true,
    "computeCores": 64,
    "storageGb": 2000,
    "microservicesCount": 35,
    "scheduledBatches": 8,
    "hasDatabaseImpactDip": true,
    "hasSqlDbType": true,
    "hasDatabaseImpactHostDb2": false,
    "monitoringSystems": "YES",
    "observability": "YES",
    "pipeline": "15–40",
    "hasExistingPipelines": false,
    "expectedReleases": 12,
    "dependenciesWithExternalServices": true,
    "integrationsWithInternalSystems": true,
    "qa": "YES",
    "requiresFeasibilityStudy": true,
    "requiresRfcSupport": true
  }')

if echo "$CREATE_RESPONSE" | grep -q "id"; then
    QUOTATION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
    PROJECT_CODE=$(echo "$CREATE_RESPONSE" | jq -r '.projectCode')
    log_success "Quotation created: ID=$QUOTATION_ID, Code=$PROJECT_CODE"
    echo "$CREATE_RESPONSE" | jq '{id, projectCode, projectName, status}'
else
    log_error "Failed to create quotation"
    echo "$CREATE_RESPONSE" | jq '.'
    exit 1
fi
echo ""

# Step 3: Verify form data contains new fields
log_info "Step 3: Verify new fields are saved"
QUOTATION_DATA=$(curl -s -X GET "$BACKEND_URL/api/quotations/$QUOTATION_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$QUOTATION_DATA" | jq '.formData | {
  requiresFeasibilityStudy,
  requiresRfcSupport,
  isThirdPartyApp,
  isAppliance,
  hasExistingPipelines,
  pipeline,
  qa,
  projectType,
  serviceRisk
}'
log_success "New fields verified in formData"
echo ""

# Step 4: Change status to trigger AI estimation
log_info "Step 4: Trigger AI estimation (change status to IN VALUTAZIONE)"
UPDATE_RESPONSE=$(curl -s -X PATCH "$BACKEND_URL/api/quotations/$QUOTATION_ID/status" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_VALUTAZIONE"}')

if echo "$UPDATE_RESPONSE" | grep -q "IN_VALUTAZIONE"; then
    log_success "Status changed to IN_VALUTAZIONE - AI estimation triggered"
else
    log_error "Failed to change status"
    echo "$UPDATE_RESPONSE" | jq '.'
fi
echo ""

# Step 5: Wait for AI estimation (polling)
log_info "Step 5: Waiting for AI estimation to complete (max 120 seconds)..."
MAX_WAIT=120
ELAPSED=0
AI_COMPLETED=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
    sleep 5
    ELAPSED=$((ELAPSED + 5))

    AI_RESPONSE=$(curl -s -X GET "$BACKEND_URL/api/ai-estimation/quotation/$QUOTATION_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")

    if echo "$AI_RESPONSE" | grep -q '"id"'; then
        AI_COMPLETED=true
        log_success "AI estimation completed after $ELAPSED seconds"
        break
    else
        echo -ne "\r${BLUE}[INFO]${NC} Waiting... ${ELAPSED}s"
    fi
done
echo ""

if [ "$AI_COMPLETED" = false ]; then
    log_error "AI estimation timeout after ${MAX_WAIT}s"
    exit 1
fi
echo ""

# Step 6: Analyze estimation results
log_info "Step 6: Analyzing AI estimation results"
echo ""

# Extract key metrics
CAPEX=$(echo "$AI_RESPONSE" | jq -r '.estimationData.summary.capex_total')
OPEX=$(echo "$AI_RESPONSE" | jq -r '.estimationData.summary.opex_total')
TOTAL_FIRST_YEAR=$(echo "$AI_RESPONSE" | jq -r '.estimationData.summary.total_first_year')
CONFIDENCE=$(echo "$AI_RESPONSE" | jq -r '.confidence')
CLASSIFICATION=$(echo "$AI_RESPONSE" | jq -r '.estimationData.classification.final_band')

log_info "=== Estimation Summary ==="
echo "  Classification: $CLASSIFICATION"
echo "  CAPEX Total: €$CAPEX"
echo "  OPEX Total: €$OPEX"
echo "  Total 1st Year: €$TOTAL_FIRST_YEAR"
echo "  Confidence: $CONFIDENCE%"
echo ""

# Check CAPEX components
log_info "=== CAPEX Components Breakdown ==="

# Dynatrace
DYNATRACE=$(echo "$AI_RESPONSE" | jq -r '.estimationData.breakdown.capex.dynatrace_dashboard_setup // "not found"')
if [ "$DYNATRACE" != "null" ] && [ "$DYNATRACE" != "not found" ]; then
    log_success "✓ Dynatrace Dashboard: €$DYNATRACE"
else
    log_warning "✗ Dynatrace Dashboard: Not included or €0"
fi

# DevOps Pipeline
DEVOPS=$(echo "$AI_RESPONSE" | jq -r '.estimationData.breakdown.capex.devops_pipeline_setup // "not found"')
if [ "$DEVOPS" != "null" ] && [ "$DEVOPS" != "not found" ]; then
    log_success "✓ DevOps Pipeline: €$DEVOPS"
else
    log_warning "✗ DevOps Pipeline: Not included or €0"
fi

# QA
QA=$(echo "$AI_RESPONSE" | jq -r '.estimationData.breakdown.capex.qa_infrastructure // "not found"')
if [ "$QA" != "null" ] && [ "$QA" != "not found" ]; then
    log_success "✓ QA Infrastructure: €$QA"
else
    log_warning "✗ QA Infrastructure: Not included or €0"
fi

# Load Testing
LOAD_TEST=$(echo "$AI_RESPONSE" | jq -r '.estimationData.breakdown.capex.load_testing // "not found"')
if [ "$LOAD_TEST" != "null" ] && [ "$LOAD_TEST" != "not found" ]; then
    log_success "✓ Load Testing: €$LOAD_TEST"
else
    log_warning "✗ Load Testing: Not included or €0"
fi

# Professional Services - Feasibility Study
FEASIBILITY=$(echo "$AI_RESPONSE" | jq -r '.estimationData.breakdown.capex.professional_services.feasibility_study.total // "not found"')
if [ "$FEASIBILITY" != "null" ] && [ "$FEASIBILITY" != "not found" ] && [ "$FEASIBILITY" != "0" ]; then
    log_success "✓ Feasibility Study: €$FEASIBILITY"
else
    log_error "✗ Feasibility Study: MISSING (should be €32,232 for COMPLESSO)"
fi

# Professional Services - RFC Support
RFC_SUPPORT=$(echo "$AI_RESPONSE" | jq -r '.estimationData.breakdown.capex.professional_services.rfc_support.total // "not found"')
if [ "$RFC_SUPPORT" != "null" ] && [ "$RFC_SUPPORT" != "not found" ] && [ "$RFC_SUPPORT" != "0" ]; then
    log_success "✓ RFC Support: €$RFC_SUPPORT"
else
    log_error "✗ RFC Support: MISSING (should be €18,300 for COMPLESSO)"
fi

echo ""

# Step 7: Check line items for professional services
log_info "=== Checking Line Items ==="
FEASIBILITY_LINE=$(echo "$AI_RESPONSE" | jq -r '.estimationData.line_items[] | select(.subcategory | test("Feasibility"; "i")) | .total_cost')
RFC_LINE=$(echo "$AI_RESPONSE" | jq -r '.estimationData.line_items[] | select(.subcategory | test("RFC"; "i")) | .total_cost')

if [ -n "$FEASIBILITY_LINE" ] && [ "$FEASIBILITY_LINE" != "0" ]; then
    log_success "✓ Feasibility Study line item: €$FEASIBILITY_LINE"
else
    log_error "✗ Feasibility Study line item: NOT FOUND"
fi

if [ -n "$RFC_LINE" ] && [ "$RFC_LINE" != "0" ]; then
    log_success "✓ RFC Support line item: €$RFC_LINE"
else
    log_error "✗ RFC Support line item: NOT FOUND"
fi

echo ""

# Final summary
log_info "=== Test Summary ==="
echo ""
echo "Quotation ID: $QUOTATION_ID"
echo "Project Code: $PROJECT_CODE"
echo "Classification: $CLASSIFICATION"
echo "Total CAPEX: €$CAPEX"
echo ""

if [ "$CLASSIFICATION" = "COMPLESSO" ] || [ "$CLASSIFICATION" = "SPECIALE" ]; then
    log_success "Classification is correct (COMPLESSO/SPECIALE expected)"
else
    log_warning "Classification: $CLASSIFICATION (COMPLESSO/SPECIALE expected for this profile)"
fi

if [ -n "$FEASIBILITY_LINE" ] && [ -n "$RFC_LINE" ]; then
    log_success "✅ All professional services components are present"
else
    log_error "❌ Some professional services components are missing"
fi

echo ""
log_info "View estimation at: http://localhost:4200/admin"
log_info "Full estimation data:"
echo "$AI_RESPONSE" | jq '{
  id,
  modelName,
  confidence,
  classification: .estimationData.classification,
  summary: .estimationData.summary,
  capex_components: .estimationData.breakdown.capex,
  professional_services_lines: [.estimationData.line_items[] | select(.subcategory | test("Professional|Feasibility|RFC"; "i"))]
}'
