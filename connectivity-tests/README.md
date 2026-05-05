# Connectivity Tests - Portale Quotazioni 3.0

Suite di script per verificare connectivity requirements prima di scegliere architettura production.

---

## Quick Start

### Test 1: AWS Bedrock dalla Macchina Separata

**Obiettivo**: Verificare se macchina separata può raggiungere AWS Bedrock

**Procedura**:

1. **Copia questi file sulla macchina separata**:
   ```bash
   scp connectivity-tests/test-aws-bedrock.js user@machine:/path/
   ```

2. **Sulla macchina separata, installa dipendenze**:
   ```bash
   npm install @aws-sdk/client-bedrock-runtime
   ```

3. **Configura AWS credentials** (usa le tue reali):
   ```bash
   export AWS_REGION=eu-central-1
   export AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Esegui test**:
   ```bash
   node test-aws-bedrock.js
   ```

5. **Interpreta risultati**:
   - ✅ **Tutti test OK**: Macchina può hostare AI Service
   - ❌ **Network failed**: Firewall blocca AWS, considera AWS Lambda (Opzione 3)
   - ❌ **Credentials failed**: Configura IAM credentials corrette
   - ❌ **API failed**: Verifica IAM permissions (policy `bedrock:InvokeModel`)
   - ⚠️ **Stability failed**: Connection instabile, serve retry logic robusto

---

### Test 2: VDI → Macchina Separata

**Obiettivo**: Verificare se VDI può comunicare con macchina separata

**Procedura**:

1. **Sulla macchina separata, avvia test server**:
   ```bash
   node simple-http-server.js
   ```
   
   Output mostrerà IP address della macchina:
   ```
   Network interfaces:
     eth0: 192.168.1.100
     → Test from VDI: export MACHINE_HOST=192.168.1.100
   ```

2. **Da VDI, esegui test**:
   ```bash
   export MACHINE_HOST=192.168.1.100  # IP dalla macchina separata
   export MACHINE_PORT=3001
   node test-vdi-to-machine.js
   ```

3. **Interpreta risultati**:
   - ✅ **Connection OK**: Architettura con macchina separata fattibile
   - ❌ **Connection refused**: Server non raggiungibile, firewall interno blocca
   - ❌ **DNS failed**: Hostname non risolve, usa IP invece
   - ❌ **Timeout**: Firewall di rete blocca porta

---

### Test 3: VDI → AWS Bedrock (Opzionale)

**Obiettivo**: Verificare se VDI può raggiungere AWS direttamente

**Procedura**:

1. **Da VDI, configura credentials**:
   ```bash
   export AWS_REGION=eu-central-1
   export AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. **Esegui test**:
   ```bash
   npm install @aws-sdk/client-bedrock-runtime
   node test-aws-bedrock.js
   ```

3. **Interpreta risultati**:
   - ✅ **Tutti test OK**: Opzione 1 (Backend Monolitico) fattibile
   - ❌ **Network failed**: VDI non può raggiungere AWS, serve macchina separata

---

## Decision Matrix

Basandoti sui risultati dei test, scegli l'architettura:

| Test Results | Architettura Consigliata | File Riferimento |
|--------------|--------------------------|------------------|
| VDI → AWS ✅ | **Opzione 1: Backend Monolitico** | PRODUCTION-ARCHITECTURE-OPTIONS.md |
| VDI → AWS ❌<br>Macchina → AWS ✅<br>VDI → Macchina ✅ | **Opzione 2: Outbox Polling** | PRODUCTION-ARCHITECTURE-OPTIONS.md |
| VDI → AWS ❌<br>Macchina → AWS ❌ | **Opzione 3: AWS Lambda** | PRODUCTION-ARCHITECTURE-OPTIONS.md |
| VDI → AWS ✅<br>Connection instabile | **Opzione 4: Hybrid Resiliente** | PRODUCTION-ARCHITECTURE-OPTIONS.md |

---

## Troubleshooting

### Proxy Corporate

Se test fallisce con "Connection timeout" ma hai proxy aziendale:

```bash
# Configura proxy
export HTTPS_PROXY=http://proxy.company.com:8080
export HTTP_PROXY=http://proxy.company.com:8080

# Escludi localhost per test interni
export NO_PROXY=localhost,127.0.0.1

# Ri-esegui test
node test-aws-bedrock.js
```

### Firewall Windows

Se test VDI → Macchina fallisce con "Connection refused":

**Sulla macchina separata**:
```bash
# Verifica che server ascolta
netstat -an | grep 3001

# Apri firewall Windows (come admin)
netsh advfirewall firewall add rule name="Test Server" dir=in action=allow protocol=TCP localport=3001
```

### IAM Permissions

Se Bedrock API test fallisce con "AccessDeniedException", aggiungi policy IAM:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:eu-central-1::foundation-model/*"
    }
  ]
}
```

### SSL Certificate Errors

Se vedi errori SSL ("unable to verify certificate"):

```bash
# Disabilita SSL verification (SOLO PER TEST, mai in produzione)
export NODE_TLS_REJECT_UNAUTHORIZED=0
node test-aws-bedrock.js
```

Se funziona, problema è proxy corporate con SSL inspection. Soluzione: importa certificato proxy nel trust store.

---

## Output Files

Ogni test genera file JSON con risultati:

- `connectivity-test-results-<timestamp>.json` - Test AWS Bedrock
- `vdi-machine-test-results-<timestamp>.json` - Test VDI → Macchina

Conserva questi file per troubleshooting con IT.

---

## Next Steps

Dopo aver eseguito i test:

1. ✅ Compila decision matrix sopra
2. ✅ Leggi `PRODUCTION-ARCHITECTURE-OPTIONS.md` per opzione scelta
3. ✅ Condividi risultati test con team
4. ✅ Pianifica refactor architetturale

---

## Support

Per problemi con gli script o interpretazione risultati, apri issue su repository con:
- Output completo dello script
- File JSON risultati
- Dettagli ambiente (OS, network config, proxy settings)
