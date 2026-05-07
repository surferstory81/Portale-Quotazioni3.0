## Git Hooks - Quality & Architecture Enforcement

Sistema di hook Git per enforcement automatico di qualità codice e principi architetturali.

---

## Installazione

```bash
cd .claude/hooks
bash install-hooks.sh
```

Questo installa hook in `.git/hooks/` che verificano automaticamente:
- **Pre-commit**: Architecture validation + Code quality
- **Pre-push**: Service coupling analysis

---

## Hook Implementati

### 1. `validate-architecture.js` (Pre-Commit) ⛔ BLOCKING

**Verifica principi distributed systems**:

| Check | Severity | Blocca? |
|-------|----------|---------|
| HTTP call senza timeout | ERROR | ✅ Sì |
| @Public() senza service auth | ERROR | ✅ Sì |
| External call senza retry | WARNING | ❌ No |
| Side-effect senza idempotency | WARNING | ❌ No |
| Secrets hardcoded | ERROR | ✅ Sì |
| Multiple DB ops senza transaction | ERROR | ✅ Sì |
| SQL injection (template literals) | ERROR | ✅ Sì |
| Logging dati sensibili | ERROR | ✅ Sì |

**Esempio output**:
```
❌ [Line 45] HTTP Timeout Required
   HTTP call senza timeout esplicito - rischio hang infinito
   💡 Aggiungi { timeout: 60000 } nelle options della chiamata HTTP

⚠️  [Line 89] Retry Logic for External Calls
   External HTTP call senza retry logic
   💡 Implementa retry con exponential backoff
```

**Bypass** (sconsigliato):
```bash
git commit --no-verify
```

---

### 2. `code-quality-check.js` (Pre-Commit) ⛔ BLOCKING

**Verifica qualità generale e best practices**:

| Check | Severity | Blocca? | Skill Reference |
|-------|----------|---------|-----------------|
| Function > 50 righe | WARNING | ❌ No | code-quality-best-practices.md |
| Magic numbers | WARNING | ❌ No | code-quality-best-practices.md |
| console.log() | WARNING | ❌ No | Use Logger |
| TODO senza issue link | INFO | ❌ No | - |
| Commented code (3+ lines) | WARNING | ❌ No | Use git history |
| Useless comments | INFO | ❌ No | - |
| Class name non PascalCase | ERROR | ✅ Sì | TypeScript conventions |
| Callback hell (nested 3+) | WARNING | ❌ No | Use async/await |
| Unused imports | INFO | ❌ No | Bundle size |
| **TypeScript `any` type** | WARNING | ❌ No | Type safety |
| **N+1 query pattern** | ERROR | ✅ Sì | Database optimization |
| **Missing async pipe** | WARNING | ❌ No | Angular memory leaks |
| **Large bundle imports** | WARNING | ❌ No | Performance |
| **Missing trackBy in ngFor** | WARNING | ❌ No | Angular performance |
| **No tests for new code** | WARNING | ❌ No | Testing requirements |
| **Injectable without scope** | INFO | ❌ No | Tree-shakeable |
| **DTO missing validation** | ERROR | ✅ Sì | NestJS security |
| **Hardcoded URLs** | WARNING | ❌ No | Configuration |

**Esempio output**:
```
⚠️  [Line 123] Function Length
   Function 'processQuotation' is 78 lines long (max 50)
   💡 Extract smaller functions or refactor logic

❌ [Line 45] Naming Conventions
   Class name 'quotationService' should be PascalCase
   💡 Rename to 'QuotationService'
```

---

### 3. `check-service-coupling.js` (Pre-Push) ⚠️ WARNING ONLY

**Analizza dipendenze tra servizi**:

- ❌ **Circular dependencies**: `backend → aiService → backend`
- ❌ **Shared database entities**: Multiple servizi accedono stessa entity
- ⚠️ **High fanout**: Servizio chiama troppi altri servizi (>3)
- 📊 **Interaction map**: Visualizza tutte le chiamate service-to-service

**Esempio output**:
```
❌ CIRCULAR DEPENDENCIES DETECTED:
   backend → aiService → backend

❌ SHARED DATABASE ENTITIES:
   Entity: Quotation
   Accessed by: backend, aiService

⚠️  HIGH FANOUT DETECTED:
   backend calls 4 services: aiService, paymentService, notificationService, auditService
```

**Nota**: Questo hook **NON blocca** push, solo avvisa. È informativo per architectural review.

---

## Come Funzionano gli Hook

### Pre-Commit (Esecuzione)

```bash
git add file.ts
git commit -m "message"
  ↓
  1. validate-architecture.js esegue
     ├─ Analizza solo file staged (git diff --cached)
     ├─ Verifica pattern architetturali
     └─ Se ERROR → BLOCCA commit
  ↓
  2. code-quality-check.js esegue
     ├─ Analizza qualità codice
     ├─ Verifica naming, complexity, etc
     └─ Se ERROR → BLOCCA commit
  ↓
  Se tutti OK → Commit procede
```

### Pre-Push (Esecuzione)

```bash
git push origin branch
  ↓
  1. check-service-coupling.js esegue
     ├─ Analizza TUTTI i file nel branch
     ├─ Costruisce dependency graph
     ├─ Identifica circular deps, shared entities
     └─ SEMPRE OK (solo warning)
  ↓
  Push procede (anche se ci sono issue)
```

---

## Configurazione Custom

### Disabilitare Check Specifici

Modifica direttamente gli script hook:

**Esempio**: Disabilitare check "Magic Numbers" in `code-quality-check.js`:

```javascript
const qualityChecks = [
  // ... altri check
  // {
  //   name: 'Magic Numbers',  // ← commenta questo blocco
  //   check: (content, file) => { ... }
  // },
];
```

### Aggiungere Check Custom

**Esempio**: Aggiungere check per `any` type in TypeScript:

```javascript
// In validate-architecture.js, aggiungi:
{
  name: 'No Any Type',
  pattern: /:\s*any\b/g,
  check: () => false, // Sempre blocca
  message: 'Type "any" found - use specific types',
  severity: 'error',
  suggestion: 'Replace any with explicit type or unknown',
}
```

### Modificare Severity

Cambia `severity: 'error'` in `severity: 'warning'` per non bloccare commit:

```javascript
{
  name: 'HTTP Timeout Required',
  severity: 'warning', // ← cambiato da 'error'
  // ... resto config
}
```

---

## Integrazione CI/CD

Gli stessi hook possono girare in CI/CD:

**GitHub Actions** (`.github/workflows/quality-check.yml`):
```yaml
name: Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Architecture validation
        run: node .claude/hooks/validate-architecture.js
      
      - name: Code quality check
        run: node .claude/hooks/code-quality-check.js
      
      - name: Service coupling analysis
        run: node .claude/hooks/check-service-coupling.js
```

---

## Troubleshooting

### Hook non esegue

**Problema**: `git commit` non lancia hook

**Soluzione**:
```bash
# Verifica permessi
ls -la .git/hooks/pre-commit
# Se non è executable:
chmod +x .git/hooks/pre-commit

# Verifica path
cat .git/hooks/pre-commit
# Deve puntare a .claude/hooks/validate-architecture.js
```

### False positive

**Problema**: Hook blocca commit legittimo

**Opzioni**:
1. **Migliore**: Fix il codice per rispettare il check
2. **Accettabile**: Bypass con `git commit --no-verify` + commenta nel messaggio perché
3. **Permanente**: Disabilita check specifico (vedi Configurazione Custom)

### Hook troppo lento

**Problema**: Pre-commit impiega >10s

**Soluzione**:
```bash
# Analizza solo file modificati, non tutti
# Gli script già fanno questo, ma verifica:
git diff --cached --name-only  # Deve mostrare solo file staged
```

---

## Best Practices

### ✅ DO

- **Run hooks localmente** prima di push
- **Fix warnings** anche se non bloccanti
- **Review coupling report** prima di merge a main
- **Aggiorna hook** quando architettura evolve
- **Documenta bypass** quando necessario con `--no-verify`

### ❌ DON'T

- **Non usare `--no-verify` di default** - solo in emergenze
- **Non ignorare warnings** - sono debt tecnico
- **Non disabilitare hook in CI/CD** - doppia protezione
- **Non committare hook changes** senza team review

---

## Maintenance

### Aggiornare Hook

Dopo pull dal remote:
```bash
cd .claude/hooks
bash install-hooks.sh  # Re-installa latest version
```

### Disinstallare Hook

```bash
rm .git/hooks/pre-commit
rm .git/hooks/pre-push
```

### Review Periodica

**Ogni sprint**:
1. Review coupling report aggregato (tutti i branch)
2. Analizza pattern ricorrenti nei warnings
3. Valuta se aggiungere nuovi check o rilassare esistenti
4. Documenta decisioni in docs/architecture/microservices.md

---

## FAQ

**Q: Hook rallentano troppo il commit?**  
A: Analizzano solo file staged, dovrebbe essere <2s. Se più lento, verifica che non stai staging troppi file.

**Q: Posso disabilitare hook temporaneamente?**  
A: Sì: `git commit --no-verify`. Ri-abilita per commit successivo.

**Q: Hook funzionano su Windows?**  
A: Sì, se hai Node.js installato. Gli script sono cross-platform.

**Q: Come aggiungo check per progetti specifici (Angular/NestJS)?**  
A: Modifica script hook, aggiungi pattern specifici. Esempio: verifica `@Component` decorator solo in `frontend/`.

**Q: Hook vedono file non committati?**  
A: No, pre-commit vede solo file staged (`git add`). Pre-push vede tutto il branch.

---

## Riferimenti

- **docs/architecture/microservices.md** - Rationale dei check architetturali
- **docs/architecture/deployment.md** - Linee guida deployment
- **docs/development/quality.md** - Code quality standards
- **.claude/skills/microservice-interaction-auditor.md** - Principi verificati dagli hook
- **.claude/skills/backend.md** - Backend best practices
