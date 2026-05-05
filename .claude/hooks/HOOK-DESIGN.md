# Hook System Design - Rationale & Philosophy

## Problema Originale

Gli hook precedenti erano **permission-based**, non **validation-based**:
```json
{
  "permissions": {
    "allow": ["Bash(git checkout *)", "Bash(npm install *)"]
  }
}
```

**Limitazioni**:
- ❌ Approvano comandi, non validano qualità
- ❌ Nessun enforcement principi architetturali
- ❌ Skill `microservice-interaction-auditor.md` dichiarata ma mai applicata
- ❌ Contraddizione: skill dicono "microservices best practices", codice le viola

---

## Filosofia Nuovo Sistema

### Principio: **Shift-Left Quality**

> "Catch issues at development time, not in production"

**Hook come guardrail automatici**:
- 🛡️ **Pre-commit**: Previene codice problematico da entrare in repository
- 📊 **Pre-push**: Fornisce visibility su architectural debt prima di merge
- 🎯 **CI/CD ready**: Stessi check riutilizzabili in pipeline

### Principio: **Pragmatic, Not Pedantic**

**Severity levels**:
- **ERROR** (blocca): Violazioni gravi (security, data loss, hang infinito)
- **WARNING** (non blocca): Debt tecnico che accumula rischio
- **INFO** (suggerimento): Miglioramenti opzionali

**Rationale**: 
- Se blocchiamo tutto, developer useranno `--no-verify` sempre
- Se non blocchiamo nulla, codebase degrada
- **Balance**: Blocca solo violazioni inaccettabili

---

## Hook Implementati

### 1. Architecture Validation (Pre-Commit)

**Obiettivo**: Enforce principi da `microservice-interaction-auditor.md`

**Check implementati**:

| Check | Rationale | Severity |
|-------|-----------|----------|
| **HTTP timeout required** | Senza timeout, chiamata può hangare indefinitamente. In VDI con network instabile, questo blocca thread. | ERROR |
| **@Public() security** | Bypass JWT = zero trust violato. Espone endpoint senza autenticazione, attaccabile da chiunque nella rete. | ERROR |
| **Retry logic** | Network può fallire temporaneamente. Senza retry, failure rate aumenta inutilmente. | WARNING |
| **Idempotency** | Retry senza idempotency = duplicati (double charge, double email). | WARNING |
| **Hardcoded secrets** | Credential in codice = security breach se repo compromesso o leak accidentale. | ERROR |
| **Transaction for multi-step** | DB operations separate = inconsistenza se una fallisce. Esempio: crea quotation ma non audit log. | ERROR |
| **SQL injection** | Template literal in query = vulnerable. `WHERE id = ${userInput}` è exploitable. | ERROR |
| **Logging sensitive data** | Log password/token = leak in Loki/Grafana accessibile da più persone. | ERROR |

**Esempi Pratici**:

```typescript
// ❌ BLOCCA COMMIT
const response = await axios.get('http://ai-service/estimate');
// Problema: nessun timeout, hang infinito possibile

// ✅ OK
const response = await axios.get('http://ai-service/estimate', { timeout: 60000 });
```

```typescript
// ❌ BLOCCA COMMIT
@Public()
@Post('generate')
async generateEstimation(@Body() dto: any) { ... }
// Problema: chiunque può chiamare, no authentication

// ✅ OK
@UseGuards(ServiceAuthGuard)
@Post('generate')
async generateEstimation(@Body() dto: any) { ... }
```

---

### 2. Code Quality Check (Pre-Commit)

**Obiettivo**: Prevenire debt tecnico evidente

**Check implementati**:

| Check | Rationale | Severity |
|-------|-----------|----------|
| **Function length > 50** | Function lunghe = difficili da capire, testare, debuggare. Cognitive load alto. | WARNING |
| **Magic numbers** | `if (status === 3)` - cosa significa 3? Manutenzione nightmare. | WARNING |
| **console.log** | Production logs dovrebbero usare Logger structured. console.log non ha log levels, non va in Loki. | WARNING |
| **TODO without issue** | TODO senza link = lavoro perso, nessuno sa cosa significa. | INFO |
| **Commented code** | Git è history. Commented code confonde ("è ancora valido? perché commentato?"). | WARNING |
| **Class naming** | `class quotationService` viola TypeScript conventions, causa confusion. | ERROR |
| **Nested callbacks** | Callback hell = unreadable, error handling nightmare. | WARNING |
| **Unused imports** | Dead code, aumenta bundle size, confonde lettori. | INFO |

**Esempi Pratici**:

```typescript
// ⚠️ WARNING
async function processQuotation(data: any) {
  // ... 78 righe di codice
}
// Problema: troppo lunga, refactor

// ✅ OK
async function processQuotation(data: QuotationData) {
  await validateQuotation(data);
  await enrichWithDefaults(data);
  await saveToDatabase(data);
  await triggerNotifications(data);
}
```

```typescript
// ⚠️ WARNING
if (retryCount > 5) { ... }
// Problema: magic number, cosa significa 5?

// ✅ OK
const MAX_RETRY_ATTEMPTS = 5;
if (retryCount > MAX_RETRY_ATTEMPTS) { ... }
```

---

### 3. Service Coupling Check (Pre-Push)

**Obiettivo**: Visibility su architectural debt

**Check implementati**:

| Check | Rationale | Impact |
|-------|-----------|--------|
| **Circular dependencies** | `A → B → A` = impossible deploy independently, scaling nightmare, debugging hell. | HIGH |
| **Shared database entities** | Multiple services = race conditions, unclear ownership, cannot evolve schema independently. | HIGH |
| **High fanout** | Service chiamando >3 altri = fragile (uno down = tutto down), high latency. | MEDIUM |

**Esempio Output**:

```
❌ CIRCULAR DEPENDENCIES DETECTED:
   backend → aiService → backend

💡 Solution:
   - Opzione 1: Event-driven (backend pubblica evento, AI consuma)
   - Opzione 2: Saga orchestration (backend orchestra workflow)
   - Opzione 3: BFF layer (frontend → BFF → services)
```

**Nota**: Questo hook **NON blocca** push. Perché?
- Refactoring circular deps richiede tempo
- Vogliamo visibility senza bloccare development velocity
- Team può decidere quando affrontare debt (sprint planning)

---

## Design Decisions

### Perché JavaScript, Non TypeScript?

**Rationale**: 
- Hook devono eseguire rapidamente, no compile step
- Node.js disponibile ovunque (dev machines, CI/CD)
- Regex parsing sufficiente per check statici
- TypeScript AST parsing sarebbe overkill (troppo lento)

### Perché Regex, Non AST Parser?

**Rationale**:
- 10x più veloce (<1s vs 10s per file)
- Sufficiente per 90% dei check
- False positive accettabili (meglio safe che sorry)
- AST parser = dipendenza extra (@typescript-eslint/parser)

**Trade-off accettato**: 
- Regex può avere false positive (esempio: pattern in stringa)
- Preferiamo false positive che false negative (missare problema reale)

### Perché Pre-Commit vs Pre-Push?

**Pre-Commit**:
- ✅ Fast feedback (developer sa subito se c'è problema)
- ✅ Fix è facile (codice ancora fresco in mente)
- ❌ Ma deve essere veloce (<3s), senno developer si frustrano

**Pre-Push**:
- ✅ Analizza tutto il branch, non solo diff
- ✅ Può essere più lento (10-30s ok)
- ❌ Ma feedback più tardivo (già committato)

**Decision**: 
- Pre-commit per check veloci e critici
- Pre-push per analisi pesanti e informative

### Perché Non ESLint?

**ESLint è ottimo per**:
- Syntax checking
- Style consistency
- TypeScript type checking

**I nostri hook aggiungono**:
- **Architecture enforcement** (timeout, retry, idempotency)
- **Microservices patterns** (circular deps, coupling)
- **Business-specific rules** (no hardcoded secrets, transaction required)

**Decision**: Hook complementano ESLint, non lo sostituiscono.

```
ESLint        → Sintassi, style, type safety
Custom Hooks  → Architecture, patterns, business rules
```

---

## Implementation Patterns

### Pattern 1: Staged Files Only

```javascript
function getStagedFiles() {
  const output = execSync('git diff --cached --name-only');
  return output.split('\n').filter(f => f.endsWith('.ts'));
}
```

**Rationale**: Analizziamo solo file che stanno per essere committati, non tutto il repo (velocità).

### Pattern 2: Context-Aware Validation

```javascript
check: (match, context) => {
  const nextChars = context.substring(match.index, match.index + 300);
  return nextChars.includes('timeout');
}
```

**Rationale**: Non basta trovare pattern, serve verificare contesto (esempio: HTTP call con timeout nelle opzioni successive).

### Pattern 3: Severity-Based Exit Codes

```javascript
if (totalErrors > 0) {
  return 1; // Block commit
}
if (totalWarnings > 0) {
  return 0; // Allow but warn
}
```

**Rationale**: Exit code 1 = git abort, exit code 0 = git procede. Usiamo severity per decidere.

### Pattern 4: Helpful Suggestions

```javascript
{
  message: 'HTTP call senza timeout',
  suggestion: 'Aggiungi { timeout: 60000 } nelle options'
}
```

**Rationale**: Non solo dire "è sbagliato", ma anche "come fixare". Developer experience migliore.

---

## Testing Strategy

### Unit Test Hook Logic

```javascript
// test/hooks/validate-architecture.test.js
describe('HTTP Timeout Check', () => {
  it('blocks commit if timeout missing', () => {
    const code = `axios.get('http://api.com')`;
    const issues = validateFile(code);
    expect(issues.errors).toHaveLength(1);
    expect(issues.errors[0].rule).toBe('HTTP Timeout Required');
  });

  it('allows commit if timeout present', () => {
    const code = `axios.get('http://api.com', { timeout: 60000 })`;
    const issues = validateFile(code);
    expect(issues.errors).toHaveLength(0);
  });
});
```

### Integration Test Full Flow

```bash
# test/hooks/integration.sh
echo "Testing pre-commit hook..."

# Create test file with violation
echo "axios.get('http://test')" > test-file.ts
git add test-file.ts

# Should block
git commit -m "test" && echo "FAIL: Should have blocked" || echo "PASS: Blocked as expected"

# Fix violation
echo "axios.get('http://test', { timeout: 5000 })" > test-file.ts
git add test-file.ts

# Should pass
git commit -m "test" && echo "PASS: Allowed as expected" || echo "FAIL: Should have allowed"
```

---

## Evolution Path

### Phase 1: Foundation (Ora) ✅

- ✅ Core checks implementati
- ✅ Pre-commit + Pre-push hooks
- ✅ Documentation completa

### Phase 2: Refinement (Sprint 2)

- [ ] Unit tests per hook logic
- [ ] CI/CD integration (GitHub Actions)
- [ ] Metrics tracking (quanti commit bloccati? perché?)

### Phase 3: Advanced (Sprint 3)

- [ ] Custom rules per team/module
- [ ] Auto-fix per alcuni warning
- [ ] Dashboard web per coupling visualization

### Phase 4: Intelligence (Sprint 4)

- [ ] ML-based suggestions (cosa fixano altri quando vedono questo error?)
- [ ] Trend analysis (debt tecnico crescente o decrescente?)
- [ ] Proactive warnings ("questo file sta diventando troppo complesso")

---

## Metrics & Success Criteria

### Tracciare Effectiveness

**Metrics da collezionare**:
```javascript
{
  "timestamp": "2026-05-05T10:30:00Z",
  "hook": "pre-commit",
  "file": "backend/src/services/quotation.service.ts",
  "check": "HTTP Timeout Required",
  "severity": "error",
  "blocked": true,
  "bypass_used": false
}
```

**Success indicators**:
- 📉 **Violations rate decreasing** over time
- 📈 **Bypass rate < 5%** (se più alto, hook troppo strict)
- 🎯 **Zero production incidents** traceable a hook violations
- 💡 **Developer satisfaction** (survey: "hook aiutano o rallentano?")

### Review Periodica

**Ogni mese**:
1. Analizza top 10 blocked commits (quali check triggerano più?)
2. Valuta se severity è corretta (troppi false positive? troppo permissivi?)
3. Aggiorna check basandoti su production incidents
4. Rimuovi check obsoleti (se architettura è cambiata)

---

## Conclusione

Questi hook sono **guardrail, non jail**.

**Obiettivo**:
- ✅ Prevenire errori gravi (hang infinito, security breach)
- ✅ Guidare verso best practices
- ✅ Dare visibility su debt tecnico
- ❌ Non bloccare ogni cosa (developer frustration)

**Philosophy**: 
> "Make doing the right thing easy, make doing the wrong thing hard (but not impossible)"

Se developer bypassa costantemente con `--no-verify`, hook ha fallito. Significa che:
- Troppo strict (rilassa check)
- False positive frequenti (migliora detection)
- Check non chiari (migliora documentazione)

**Success = High compliance rate WITHOUT enforcement friction**.
