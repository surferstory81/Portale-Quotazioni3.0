#!/bin/bash

set -e

# Script per testare la funzionalità multi-model AI
# Richiede: quotation_id e admin JWT token

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

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
QUOTATION_ID="${1}"
ADMIN_TOKEN="${2}"

if [ -z "$QUOTATION_ID" ] || [ -z "$ADMIN_TOKEN" ]; then
    log_error "Usage: $0 <quotation_id> <admin_jwt_token>"
    echo ""
    echo "Example:"
    echo "  $0 550e8400-e29b-41d4-a716-446655440000 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    echo ""
    echo "Environment variables:"
    echo "  BACKEND_URL - Backend API URL (default: http://localhost:3000)"
    exit 1
fi

log_info "Testing multi-model AI feature for quotation: $QUOTATION_ID"
echo ""

# Available models
SONNET_MODEL="eu.anthropic.claude-sonnet-4-5-20250929-v1:0"
OPUS_MODEL="eu.anthropic.claude-opus-4-20250514-v1:0"
HAIKU_MODEL="eu.anthropic.claude-haiku-4-20250514-v1:0"

# Test 1: Generate estimation with Claude Sonnet 4.5
log_info "Test 1: Generating estimation with Claude Sonnet 4.5"
RESPONSE_SONNET=$(curl -s -X POST \
    "$BACKEND_URL/api/ai-estimation/retry/$QUOTATION_ID/model/$SONNET_MODEL" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")

if echo "$RESPONSE_SONNET" | grep -q "Stima AI generata"; then
    log_success "Sonnet estimation generated successfully"
    echo "$RESPONSE_SONNET" | jq '.'
else
    log_error "Failed to generate Sonnet estimation"
    echo "$RESPONSE_SONNET" | jq '.'
fi
echo ""

# Wait for processing
log_info "Waiting 5 seconds for processing..."
sleep 5
echo ""

# Test 2: Generate estimation with Claude Opus 4
log_info "Test 2: Generating estimation with Claude Opus 4"
RESPONSE_OPUS=$(curl -s -X POST \
    "$BACKEND_URL/api/ai-estimation/retry/$QUOTATION_ID/model/$OPUS_MODEL" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")

if echo "$RESPONSE_OPUS" | grep -q "Stima AI generata"; then
    log_success "Opus estimation generated successfully"
    echo "$RESPONSE_OPUS" | jq '.'
else
    log_error "Failed to generate Opus estimation"
    echo "$RESPONSE_OPUS" | jq '.'
fi
echo ""

# Wait for processing
log_info "Waiting 5 seconds for processing..."
sleep 5
echo ""

# Test 3: Get all estimations for comparison
log_info "Test 3: Fetching all estimations for quotation (comparison)"
RESPONSE_ALL=$(curl -s -X GET \
    "$BACKEND_URL/api/ai-estimation/quotation/$QUOTATION_ID/all" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

ESTIMATION_COUNT=$(echo "$RESPONSE_ALL" | jq '. | length')
log_success "Found $ESTIMATION_COUNT estimation(s) for this quotation"
echo ""

if [ "$ESTIMATION_COUNT" -gt 1 ]; then
    log_info "Comparison table:"
    echo "=========================================================================================================="
    printf "%-25s %-20s %-15s %-15s %-20s\n" "MODEL" "TOTAL 1ST YEAR" "CONFIDENCE" "TOKENS (I/O)" "COST AI (USD)"
    echo "=========================================================================================================="

    echo "$RESPONSE_ALL" | jq -r '.[] |
        "\(.modelName // "Claude Sonnet 4.5")\t€\(.estimationData.summary.total_first_year)\t\(.confidence)%\t\(.inputTokens)/\(.outputTokens)\t$\(.estimatedCostUsd)"' |
    while IFS=$'\t' read -r model total conf tokens cost; do
        printf "%-25s %-20s %-15s %-15s %-20s\n" "$model" "$total" "$conf" "$tokens" "$cost"
    done
    echo "=========================================================================================================="
    echo ""

    # Calculate differences
    log_info "Insights:"
    TOTAL_DIFF=$(echo "$RESPONSE_ALL" | jq -r '
        [.[].estimationData.summary.total_first_year] |
        max as $max |
        min as $min |
        (($max - $min) / $min * 100) | round
    ')

    if [ "$TOTAL_DIFF" -gt 10 ]; then
        log_error "⚠️  Large variance detected: ${TOTAL_DIFF}% difference between estimates"
        echo "     Consider reviewing quotation complexity or using a more capable model"
    else
        log_success "✅ Good convergence: Only ${TOTAL_DIFF}% difference between estimates"
    fi
    echo ""

    # Cost efficiency
    CHEAPEST_AI=$(echo "$RESPONSE_ALL" | jq -r 'min_by(.estimatedCostUsd) | "\(.modelName // "Claude Sonnet 4.5") at $\(.estimatedCostUsd)"')
    MOST_EXPENSIVE_AI=$(echo "$RESPONSE_ALL" | jq -r 'max_by(.estimatedCostUsd) | "\(.modelName // "Claude Sonnet 4.5") at $\(.estimatedCostUsd)"')

    log_info "💰 Cheapest AI cost: $CHEAPEST_AI"
    log_info "💸 Most expensive AI cost: $MOST_EXPENSIVE_AI"
else
    log_error "Only 1 estimation found. Generate with multiple models to see comparison."
fi
echo ""

# Test 4: Optional - Generate with Haiku for cost comparison
read -p "Do you want to generate with Claude Haiku 4 (faster, cheaper)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Test 4: Generating estimation with Claude Haiku 4"
    RESPONSE_HAIKU=$(curl -s -X POST \
        "$BACKEND_URL/api/ai-estimation/retry/$QUOTATION_ID/model/$HAIKU_MODEL" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json")

    if echo "$RESPONSE_HAIKU" | grep -q "Stima AI generata"; then
        log_success "Haiku estimation generated successfully"
        echo "$RESPONSE_HAIKU" | jq '.'
    else
        log_error "Failed to generate Haiku estimation"
        echo "$RESPONSE_HAIKU" | jq '.'
    fi
fi

log_success "Multi-model test completed!"
echo ""
log_info "Next steps:"
echo "  1. Open admin dashboard: http://localhost:4200/admin"
echo "  2. Find quotation: $QUOTATION_ID"
echo "  3. Click '📊 Confronta' to see visual comparison"
