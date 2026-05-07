# Git Hook System - Summary for User

## 🎯 Cosa Abbiamo Fatto

Sostituito il vecchio sistema di hook **permission-based** (che approvava solo comandi bash) con un sistema **validation-based** completo che:

1. ✅ **Enforza automaticamente** i principi architetturali dichiarati nelle skill
2. ✅ **Previene** codice problematico dal entrare nel repository
3. ✅ **Guida** verso best practices con suggerimenti concreti
4. ✅ **Visualizza** architectural debt prima del merge

---

## 📦 File Creati

```
.claude/
├── hooks/
│   ├── validate-architecture.js      ← Pre-commit: Architecture validation
│   ├── code-quality-check.js         ← Pre-commit: Code quality
│   ├── check-service-coupling.js     ← Pre-push: Service coupling
│   ├── install-hooks.sh              ← Installation script
│   ├── README.md                     ← User guide completo
│   └── HOOK-DESIGN.md                ← Rationale & philosophy
└── settings.local.json                ← Hook configuration
```

---

## 🚀 Come Installare

### Passo 1: Installa Hook in Git

```bash
cd .claude/hooks
bash install-hooks.sh
```

Questo crea file in `.git/hooks/` che Git eseguirà automaticamente.

### Passo 2: Verifica Installazione

```bash
ls -la .git/hooks/
# Dovresti vedere pre-commit e pre-push
```

### Passo 3: Test (Opzionale)

Crea file con violazione intenzionale:
```bash
echo "axios.get('http://test')" > test.ts
git add test.ts
git commit -m "test"
```

Output atteso:
```
❌ [Line 1] HTTP Timeout Required
   HTTP call senza timeout esplicito
   💡 Aggiungi { timeout: 60000 }
```

---

## 🛡️ Cosa Verificano gli Hook

### Hook 1: **Architecture Validation** (Pre-Commit) - BLOCCA COMMIT

| Verifica | Perché è Importante | Blocca? |
|----------|---------------------|---------|
| HTTP timeout mancante | Hang infinito su network instabile | ✅ Sì |
| @Public() senza auth | Security breach (endpoint aperto a tutti) | ✅ Sì |
| External call senza retry | Failure rate aumenta inutilmente | ⚠️ No |
| Side-effect senza idempotency | Retry = duplicati (double charge) | ⚠️ No |
| Secrets hardcoded | Credential leak se repo compromesso | ✅ Sì |
| Multiple DB ops senza transaction | Inconsistenza dati (partial update) | ✅ Sì |
| SQL injection | Vulnerable a attacchi | ✅ Sì |
| Logging sensitive data | Leak in Loki/Grafana | ✅ Sì |

### Hook 2: **Code Quality** (Pre-Commit) - BLOCCA SELETTIVAMENTE

| Verifica | Perché | Blocca? |
|----------|--------|---------|
| Function >50 righe | Difficile capire/testare | ⚠️ No |
| Magic numbers | Maintenance nightmare | ⚠️ No |
| console.log() | Usa Logger structured | ⚠️ No |
| TODO senza issue | Lavoro perso | ℹ️ No |
| Commented code | Usa git history | ⚠️ No |
| Class naming wrong | `class test` → `class Test` | ✅ Sì |
| Callback hell | Unreadable | ⚠️ No |
| Unused imports | Dead code | ℹ️ No |

### Hook 3: **Service Coupling** (Pre-Push) - SOLO WARNING

- ❌ Circular dependencies (`backend ↔ aiService`)
- ❌ Shared database entities
- ⚠️ High fanout (>3 servizi chiamati)
- 📊 Interaction map completa

**Questo hook NON blocca push**, solo avvisa per architectural review.

---

## 💡 Esempi Pratici

### Esempio 1: HTTP Call Senza Timeout

**Codice problematico**:
```typescript
// ❌ Hook BLOCCA commit
const response = await axios.get('http://ai-service/estimate');
```

**Output hook**:
```
❌ [Line 3] HTTP Timeout Required
   HTTP call senza timeout esplicito - rischio hang infinito
   💡 Aggiungi { timeout: 60000 } nelle options della chiamata HTTP
```

**Fix**:
```typescript
// ✅ Hook permette commit
const response = await axios.get('http://ai-service/estimate', {
  timeout: 60000
});
```

### Esempio 2: @Public() Senza Authentication

**Codice problematico**:
```typescript
// ❌ Hook BLOCCA commit
@Public()
@Post('generate')
async generateEstimation(@Body() dto: any) { ... }
```

**Output hook**:
```
❌ [Line 5] Public Endpoint Security
   @Public() decorator senza service authentication - security risk
   💡 Implementa ServiceAuthGuard o verifica x-service-token header
```

**Fix**:
```typescript
// ✅ Hook permette commit
@UseGuards(ServiceAuthGuard)
@Post('generate')
async generateEstimation(@Body() dto: any) { ... }
```

### Esempio 3: Magic Number

**Codice problematico**:
```typescript
// ⚠️ Hook WARN ma non blocca
if (retryCount > 5) {
  throw new Error('Too many retries');
}
```

**Output hook**:
```
⚠️  [Line 3] Magic Numbers
   Magic number '5' found
   💡 Extract to named constant: const MAX_RETRY_COUNT = 5
```

**Fix**:
```typescript
// ✅ No warning
const MAX_RETRY_ATTEMPTS = 5;
if (retryCount > MAX_RETRY_ATTEMPTS) {
  throw new Error('Too many retries');
}
```

---

## ⚙️ Configurazione

### Disabilitare Hook Temporaneamente

```bash
# Bypassa solo questo commit (NON RACCOMANDATO)
git commit --no-verify

# Bypassa solo questo push
git push --no-verify
```

### Disabilitare Check Specifici

Modifica `.claude/settings.local.json`:

```json
{
  "validation": {
    "architecture": {
      "enforce_timeout": true,       // ← Cambia a false per disabilitare
      "enforce_retry": false,
      "enforce_idempotency": false,
      "enforce_service_auth": true
    }
  }
}
```

### Modificare Severity

Modifica direttamente lo script hook. Esempio in `validate-architecture.js`:

```javascript
{
  name: 'HTTP Timeout Required',
  severity: 'warning', // ← Cambiato da 'error' a 'warning'
  // Ora non blocca più commit, solo avvisa
}
```

---

## 📊 Output Hook Spiegato

### Icone

- ❌ **ERROR** - Blocca commit/push
- ⚠️ **WARNING** - Avvisa ma non blocca
- ℹ️ **INFO** - Suggerimento migliorativo

### Colori

- 🔴 Rosso = Error (blocca)
- 🟡 Giallo = Warning (non blocca)
- 🔵 Blu = Info (suggerimento)
- 🟢 Verde = Success (tutto OK)

### Esempio Output Completo

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ARCHITECTURE VALIDATION HOOK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Validating 3 file(s)...

📄 backend/src/services/quotation.service.ts:
  ❌ [Line 45] HTTP Timeout Required
     HTTP call senza timeout esplicito - rischio hang infinito
     💡 Aggiungi { timeout: 60000 } nelle options della chiamata HTTP

  ⚠️  [Line 89] Retry Logic for External Calls
     External HTTP call senza retry logic
     💡 Implementa retry con exponential backoff

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   VALIDATION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 1 error(s) found - COMMIT BLOCKED

Fix errors above before committing.
To bypass (NOT RECOMMENDED): git commit --no-verify
```

---

## 🔧 Troubleshooting

### Hook Non Esegue

**Problema**: `git commit` non lancia hook

**Soluzione**:
```bash
# Verifica che hook esista
ls -la .git/hooks/pre-commit

# Se non esiste, reinstalla
cd .claude/hooks && bash install-hooks.sh

# Verifica permessi
chmod +x .git/hooks/pre-commit
```

### False Positive

**Problema**: Hook blocca codice legittimo

**Opzioni**:
1. **Best**: Modifica codice per rispettare check
2. **Acceptable**: Usa `--no-verify` e documenta nel commit message perché
3. **Permanent**: Disabilita check specifico in settings

### Hook Troppo Lento

**Problema**: Pre-commit impiega >5 secondi

**Verifica**:
```bash
# Quanti file in staging?
git diff --cached --name-only | wc -l

# Se >20 file, considera commit più piccoli
# Hook analizza solo file staged, non tutto il repo
```

---

## 📈 Metriche Success

Dopo 1 settimana di uso:
- ✅ **Bypass rate < 5%** (se più alto, hook troppo strict)
- ✅ **Zero production incidents** da violazioni catturabili da hook
- ✅ **Developer satisfaction** (hook aiutano, non rallentano)

---

## 🎓 Best Practices

### ✅ DO

- **Installa hook localmente** subito dopo clone repo
- **Fix warnings** anche se non bloccanti (sono debt tecnico)
- **Review coupling report** prima di merge a main
- **Documenta bypass** quando usi `--no-verify`

### ❌ DON'T

- **Non usare `--no-verify` di default** - solo emergenze
- **Non ignorare warnings** - accumulano debt
- **Non disabilitare hook in CI/CD** - doppia protezione
- **Non committare hook changes** senza team review

---

## 📚 Documentazione Completa

- **`.claude/hooks/README.md`** - Guida dettagliata con FAQ
- **`.claude/hooks/HOOK-DESIGN.md`** - Philosophy e rationale
- **`ARCHITECTURAL-ANALYSIS.md`** - Perché questi check sono necessari

---

## 🚀 Prossimi Passi

1. ✅ **Installa hook**: `cd .claude/hooks && bash install-hooks.sh`
2. ✅ **Fai test commit** con file di esempio
3. ✅ **Condividi con team** (tutti devono installare hook)
4. 📊 **Review metriche** dopo 1 settimana
5. 🔧 **Affina severity** basandoti su feedback

---

## ❓ Domande Frequenti

**Q: Hook funzionano su Windows?**  
A: Sì, se hai Node.js installato. Git Bash esegue hook correttamente.

**Q: Posso usare hook anche in CI/CD?**  
A: Sì! Stessi script utilizzabili in GitHub Actions, GitLab CI, etc.

**Q: Cosa succede se ho già committato codice problematico?**  
A: Hook verificano solo nuovo codice. Refactor graduale del vecchio.

**Q: Hook rallentano troppo?**  
A: No, analizzano solo file staged. Dovrebbe essere <2s per commit normale.

**Q: Come aggiungo check custom?**  
A: Modifica script hook, aggiungi nuovo validation object. Vedi HOOK-DESIGN.md.

---

**Sistema pushato su GitHub nel branch `dev`** ✅
