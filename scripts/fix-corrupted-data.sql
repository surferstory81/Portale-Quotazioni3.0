-- Fix corrupted numeric values in ai_estimations table
-- Corrupted values contain multiple decimal points (e.g., "0.0843240.11038799999999999")

-- Reset corrupted cost values to 0
UPDATE ai_estimations
SET estimated_cost_usd = 0,
    input_tokens = 0,
    output_tokens = 0
WHERE
    -- Detect corrupted decimal values (contains multiple dots or is too long)
    estimated_cost_usd::text LIKE '%.%.%'
    OR LENGTH(estimated_cost_usd::text) > 20
    OR input_tokens::text LIKE '%.%'
    OR output_tokens::text LIKE '%.%';

-- Show affected rows
SELECT
    id,
    quotation_id,
    ai_status,
    estimated_cost_usd,
    input_tokens,
    output_tokens,
    created_at
FROM ai_estimations
ORDER BY updated_at DESC
LIMIT 10;
