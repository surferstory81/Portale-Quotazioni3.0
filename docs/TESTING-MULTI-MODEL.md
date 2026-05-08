# Testing Guide - Multi-Model AI Feature

## Pre-requisiti

✅ Migration database eseguita (model_id e model_name aggiunti)
✅ Backend compilato e avviato (porta 3000)
✅ AI Service compilato e avviato (porta 3001)
✅ Frontend compilato e servito (porta 4200)

## Test 1: Verifica Database

```sql
-- Verifica che le colonne esistano
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ai_estimations' 
AND column_name IN ('model_id', 'model_name');

-- Risultato atteso: 2 righe
-- model_id   | character varying
-- model_name | character varying
```

## Test 2: Verifica Backend API

### 2.1 Health Check
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":"...","version":"1.0.0"}

curl http://localhost:3001/health
# Expected: {"status":"ok","service":"ai-estimation-service",...}
```

### 2.2 Test Endpoint Comparazione
```bash
# Sostituisci {QUOTATION_ID} con un ID reale dal database
curl -H "Authorization: Bearer {YOUR_ADMIN_TOKEN}" \
  http://localhost:3000/ai-estimation/quotation/{QUOTATION_ID}/all

# Expected: Array di estimations (anche vuoto se nuova quotazione)
```

### 2.3 Test Endpoint Retry con Modello
```bash
curl -X POST \
  -H "Authorization: Bearer {YOUR_ADMIN_TOKEN}" \
  http://localhost:3000/ai-estimation/retry/{QUOTATION_ID}/model/eu.anthropic.claude-opus-4-20250514-v1:0

# Expected: {"message":"Stima AI generata con modello...","quotationId":"..."}
```

## Test 3: Test Frontend UI

### 3.1 Login Admin
1. Apri http://localhost:4200
2. Login con utente ADMIN
3. Naviga a Admin Dashboard

### 3.2 Verifica UI Dropdown
1. Trova una quotazione nella tabella
2. Click su "🔄 Retry AI ▼"
3. Verifica che appaia dropdown con 3 modelli:
   - Claude Sonnet 4.5 ($3.00/MTok)
   - Claude Opus 4 ($15.00/MTok)
   - Claude Haiku 4 ($0.80/MTok)
4. Click su un modello
5. Verifica che:
   - Pulsante diventa "⏳ Processando..."
   - Dopo ~1-2 minuti appare messaggio successo

### 3.3 Test Generazione con Modello Alternativo
1. Seleziona quotazione esistente (preferibilmente con stima Sonnet già generata)
2. Click "Retry AI" → Seleziona "Claude Opus 4"
3. Attendi completamento (~90 secondi)
4. Nel database verifica:
```sql
SELECT id, model_name, confidence, 
       estimation_data->'summary'->>'total_first_year' as total,
       created_at
FROM ai_estimations
WHERE quotation_id = '{QUOTATION_ID}'
ORDER BY created_at DESC;

-- Expected: 2 righe (Sonnet e Opus)
```

### 3.4 Test Comparazione (se esistono multiple stime)
1. Se quotazione ha >1 stima, appare pulsante "📊 Confronta"
2. Click su "Confronta"
3. Verifica modale:
   - Header: "📊 Comparazione Modelli AI"
   - Tabella con colonne per ogni modello
   - Metriche: Total 1° Anno, CAPEX, OPEX, Confidence, Token, Costo AI
   - Section Insights con suggerimenti
4. Verifica valori numerici corretti
5. Click "Chiudi" per chiudere modale

## Test 4: Test Performance

### 4.1 Tempi di Processing
Genera stime con tutti e 3 i modelli per la stessa quotazione e misura:

```bash
time curl -X POST \
  -H "Authorization: Bearer {TOKEN}" \
  http://localhost:3000/ai-estimation/retry/{ID}/model/{MODEL_ID}
```

**Tempi attesi** (approssimativi):
- Haiku 4: ~45-60 secondi (più veloce)
- Sonnet 4.5: ~70-80 secondi (bilanciato)
- Opus 4: ~85-100 secondi (più lento ma accurato)

### 4.2 Costi AI
Verifica che i costi siano calcolati correttamente:

```sql
SELECT 
  model_name,
  input_tokens,
  output_tokens,
  estimated_cost_usd,
  -- Verifica manuale del calcolo
  ROUND((input_tokens::numeric / 1000000) * 
    CASE 
      WHEN model_id LIKE '%sonnet%' THEN 3.00
      WHEN model_id LIKE '%opus%' THEN 15.00
      WHEN model_id LIKE '%haiku%' THEN 0.80
    END +
    (output_tokens::numeric / 1000000) *
    CASE 
      WHEN model_id LIKE '%sonnet%' THEN 15.00
      WHEN model_id LIKE '%opus%' THEN 75.00
      WHEN model_id LIKE '%haiku%' THEN 4.00
    END, 6) AS calculated_cost
FROM ai_estimations
ORDER BY created_at DESC
LIMIT 5;

-- Verifica che estimated_cost_usd ≈ calculated_cost
```

## Test 5: Scenari Edge Case

### 5.1 Retry con stesso modello
1. Genera stima con Sonnet
2. Retry di nuovo con Sonnet
3. Verifica che aggiorni la stima esistente (non crea duplicato)

```sql
SELECT COUNT(*) 
FROM ai_estimations 
WHERE quotation_id = '{ID}' AND model_id LIKE '%sonnet%';
-- Expected: 1 (non 2)
```

### 5.2 Modello ID invalido
```bash
curl -X POST \
  -H "Authorization: Bearer {TOKEN}" \
  http://localhost:3000/ai-estimation/retry/{ID}/model/invalid-model-id

# Expected: 400 Bad Request o 500 con errore Bedrock
```

### 5.3 Quotazione inesistente
```bash
curl -X POST \
  -H "Authorization: Bearer {TOKEN}" \
  http://localhost:3000/ai-estimation/retry/00000000-0000-0000-0000-000000000000/model/eu.anthropic.claude-sonnet-4-5-20250929-v1:0

# Expected: 404 Not Found
```

## Test 6: Validazione Dati

### 6.1 Verifica modelId salvato correttamente
```sql
SELECT 
  model_id,
  model_name,
  CASE 
    WHEN model_id = 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0' 
      AND model_name = 'Claude Sonnet 4.5' THEN 'OK'
    WHEN model_id = 'eu.anthropic.claude-opus-4-20250514-v1:0' 
      AND model_name = 'Claude Opus 4' THEN 'OK'
    WHEN model_id = 'eu.anthropic.claude-haiku-4-20250514-v1:0' 
      AND model_name = 'Claude Haiku 4' THEN 'OK'
    ELSE 'MISMATCH'
  END as validation
FROM ai_estimations
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Tutti "OK"
```

### 6.2 Verifica backward compatibility
```sql
-- Stime vecchie (senza model_id) dovrebbero essere NULL
SELECT COUNT(*) 
FROM ai_estimations 
WHERE model_id IS NULL;

-- Se > 0, sono stime pre-migration (OK, funzionano ugualmente)
```

## Test 7: Confronto Qualità Modelli

Genera la stessa quotazione con tutti e 3 i modelli e confronta:

### 7.1 Accuracy
- Verifica che i totali siano simili (±10%)
- Opus dovrebbe avere confidence più alto
- Haiku potrebbe avere confidence più basso

### 7.2 Detail Level
```sql
SELECT 
  model_name,
  jsonb_array_length(estimation_data->'line_items') as line_items_count,
  jsonb_array_length(estimation_data->'assumptions') as assumptions_count
FROM ai_estimations
WHERE quotation_id = '{ID}'
ORDER BY created_at DESC;

-- Opus probabilmente ha più line_items e assumptions (più dettagliato)
```

## Checklist Finale

- [ ] Migration database completata
- [ ] Backend avviato senza errori
- [ ] AI service avviato senza errori
- [ ] Frontend compila correttamente
- [ ] Dropdown modelli appare e funziona
- [ ] Retry con Opus 4 genera nuova stima
- [ ] Retry con Haiku 4 genera nuova stima
- [ ] Comparazione mostra tutte le stime
- [ ] Costi AI calcolati correttamente
- [ ] modelId e modelName salvati nel DB
- [ ] Retry con stesso modello non crea duplicati
- [ ] Performance entro range attesi

## Troubleshooting

### Dropdown non appare
- Verifica console browser per errori
- Verifica che `AVAILABLE_MODELS` sia importato
- Verifica CSS caricato correttamente

### Retry fallisce con 500
- Controlla log backend: `tail -f backend/logs/backend-2026-05-08.log`
- Controlla log AI service: `tail -f ai-estimation-service/logs/ai-estimation-2026-05-08.log`
- Verifica che modelId sia valido (uno dei 3 configurati)

### Modale comparazione vuoto
- Verifica che esistano multiple stime nel DB per quella quotazione
- Controlla endpoint `/ai-estimation/quotation/{ID}/all` con curl
- Verifica token JWT valido e ruolo ADMIN

### Costi AI errati
- Verifica pricing in `models.config.ts` (backend e AI service)
- Confronta con calcolo manuale SQL sopra
- Verifica che non ci siano concatenazioni stringa (bug risolto in commit precedente)

## Report Bug

Se trovi problemi, includi nel report:
1. Versione commit Git (`git rev-parse HEAD`)
2. Log completo errore (backend o AI service)
3. Query SQL per riprodurre lo stato DB
4. Screenshot UI se applicabile
5. Steps esatti per riprodurre
