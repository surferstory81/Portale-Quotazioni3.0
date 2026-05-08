# Crédit Agricole - Real Pricing Data Extraction

**Source:** `_archive/BudgetCTO_v2.1.xlsx`  
**Extracted:** 2026-05-08  
**Purpose:** Replace generic pricing with CA-specific costs for AI estimation

---

## 🎯 Key Findings for Field-to-Cost Mapping

### 1. INFRASTRUCTURE TYPE (On-Premise è Primario)

**Architettura CA:**
- ✅ **On-Premise primario** (VMware, OCP, Mirantis)
- ⚠️ Cloud secondario (solo per casi specifici)
- 🔴 **Database: architettura finita, non incrementabile**

**Policy Database:**
- Oracle Exadata: 2 cluster (prod + parallel) - **FROZEN CAPACITY**
- MS SQL Server: 2 cluster VMware pre-licenziati
- MongoDB: su VM
- PostgreSQL EDB: su VM
- ❌ **NO database a livello microservizio on-premise**

---

## 💰 PREZZI REALI CA (con IVA 22%)

### Virtual Servers (On-Premise ACN)

| Tipo | Specs | Anno 1 | Anno 2 | Anno 3 | Anno 4 | Anno 5 | Totale 5y |
|------|-------|--------|--------|--------|--------|--------|-----------|
| **4 vCore** | 4 vCPU, 16GB RAM | €684 | €624 | €586 | €563 | €552 | €4,344 |
| **8 vCore** | 8 vCPU, 32GB RAM | €862 | €797 | €760 | €736 | €725 | €5,619 |
| **16 vCore Worker (Non-Prod)** | 16 vCPU | €1,052 | €973 | €927 | €898 | €885 | €5,619 |
| **16 vCore Worker (Prod)** | 16 vCPU × 2 units | €2,103 | €1,945 | €1,854 | €1,797 | €1,770 | €11,239 |

**Formula:** `Costo_Anno_N = ACN!Year_N * Quantità * 1.22 (IVA)`

**Regola Prod vs Non-Prod:**
- Non-Prod: 1 unità
- Prod: 2 unità (ridondanza)

---

### Storage (On-Premise ACN)

| Tipo | Unità | Anno 1 | Anno 2 | Anno 3 | Anno 4 | Anno 5 | Totale 5y |
|------|-------|--------|--------|--------|--------|--------|-----------|
| **SSD Replicated** | per TB | €868 | €834 | €819 | €810 | €805 | €6,028 |
| **SSD Non-Replicated** | per TB | €553 | €525 | €510 | €500 | €496 | €3,756 |
| **Backup Front-end** | per TB | €2,184 | €466 | €462 | €457 | €453 | €7,545 |
| **Backup Back-end** | per TB | €202 | €118 | €116 | €114 | €112 | €1,042 |

**Regole Backup:**
- **Front-end:** Backup = Storage Prod × 1
- **Back-end:** Backup = Storage Prod × 5

---

### Database Management (On-Premise ACN, per istanza/anno)

| DB Type | Anno 1 | Anno 2 | Anno 3 | Anno 4 | Anno 5 | Totale 5y |
|---------|--------|--------|--------|--------|--------|-----------|
| **Oracle (non RAC)** | €1,062 | €943 | €864 | €814 | €790 | €6,422 |
| **MS SQL Server** | €525 | €466 | €427 | €402 | €390 | €3,172 |
| **DB2 Blu** | €700 | €622 | €569 | €536 | €521 | €4,230 |
| **NoSQL DB** | €700 | €622 | €569 | €536 | €521 | €4,230 |

**IMPORTANTE:** Questi sono costi di **gestione**, non di infrastruttura (Exadata/SQL cluster sono già esistenti).

---

### Middleware Management (On-Premise ACN, per istanza/anno)

| Middleware | Anno 1 | Anno 2 | Anno 3 | Anno 4 | Anno 5 | Totale 5y |
|------------|--------|--------|--------|--------|--------|-----------|
| **IIS / Apache** | €331 | €294 | €269 | €254 | €246 | €2,000 |
| **Tomcat / JBoss** | €441 | €392 | €359 | €338 | €328 | €2,667 |
| **WebSphere** | €551 | €490 | €448 | €423 | €410 | €3,334 |
| **WebLogic** | €662 | €588 | €538 | €507 | €492 | €4,000 |

---

### Container/Kubernetes (On-Premise ACN)

| Servizio | Tipo | Costo |
|----------|------|-------|
| **Pod Deployment** | per POD | €251/anno |

**Nota:** OCP/Mirantis esistenti, costo per deployment POD aggiuntivo.

---

### Licenze Software (ACN Listino)

#### Operating Systems (per 16 core)

| Licenza | Prezzo Primo Anno | Costo Anno 2+ |
|---------|------------------|---------------|
| **Windows Standard + SCCM** | €2,814 | €604 |
| **Windows Datacenter + SCCM** | €13,279 | €2,701 |
| **Linux Red Hat Premium** | €1,122 | €919 |
| **Linux Red Hat Standard** | €848 | €848 |
| **Linux Suse** | €1,586 | €1,586 |

**Formula per core:** 
- Windows Standard: €144.18/core
- Windows Datacenter: €680.28/core

#### Virtualization

| Licenza | Prezzo Primo Anno | Costo Anno 2+ |
|---------|------------------|---------------|
| **VMware OEM** | €2,800 | €458 |

#### Monitoring (Dynatrace)

| Servizio | Unità | Prezzo/anno (IVA incl.) |
|----------|-------|------------------------|
| **Full Stack Monitoring** | per GB | €39.79 |
| **Infrastructure Monitoring** | per VM | €159.12 |
| **K8s Platform Monitoring** | per POD | €14.86 |
| **Log Management** | per GB ingested | €741.16 |

**Formula Dynatrace:**
```
Full Stack = (372.31/100000) * 24 * 365 * 1.22
Infrastructure = (1488.85/100000) * 24 * 365 * 1.22
K8s = (139/100000) * 24 * 365 * 1.22
Logs = (1387/10000) * 12 * 365 * 1.22
```

---

### Cloud (ACN Cloud - Secondario)

**Kubernetes Managed:**
- Cluster (EKS/GKE/AKS): €3,233/anno
- Namespace: €206/anno
- POD: €94/anno

**Virtual Machines:**
- VM (EC2/Compute Engine/Azure VM): €569/anno

**Database Cloud:**
- PostgreSQL PaaS (RDS/CloudSQL/Azure DB): €538/anno
- SQL Server PaaS: €538/anno
- SQL Server IaaS: €625/anno

**Security:**
- Cisco Multi Cloud Defense (WAF+Firewall): €13,217/anno
- F5 WAF: €8,438/anno
- F5 API Gateway (Nginx): €2,855/anno

**Network:**
- VNet/VPC: €200/anno

---

## 📊 BUDGET BANDS (Fasce Budget CTO)

### Classificazione Progetti

| Criterio | LIGHT | MEDIUM | COMPLESSO | SPECIALE |
|----------|-------|--------|-----------|----------|
| **Budget Progetto (k€)** | <500 | 500-1,000 | 1,000-5,000 | >5,000 |
| **Durata** | 1-6 mesi | 7-9 mesi | >1 anno | Multi-anno |
| **Microservizi Nuovi** | 0-15 | 16-30 | 31-100 | >100 |
| **Database DIP** | <1 TB | 1-10 TB | 10-50 TB | >50 TB |
| **Database Host** | <10 GB | 10-50 GB | 50-100 GB | >100 GB |
| **Computing Power** | 0-30 cores | 30-60 cores | 60-200 cores | >200 cores |
| **Batch Scheduling** | 0-30 | 30-60 | 60-200 | >200 |
| **Pipeline** | <10 | 10-30 | 30-60 | >60 |
| **Test Cases** | <100 | 100-1,000 | 1,000-10,000 | >10,000 |

### Stime CTO per Band

| Band | CAPEX | OPEX | Totale |
|------|-------|------|--------|
| **LIGHT** | €40-60k | €20-40k | €50-100k |
| **MEDIUM** | €60-110k | €40-90k | €100-200k |
| **COMPLESSO** | €110-225k | €90-275k | €200-500k |
| **SPECIALE** | TBD | TBD | TBD |

**Regola:** **Almeno un parametro** in una fascia determina l'appartenenza.

---

## 💼 CAPEX vs OPEX (Riepilogo Quadro Spese)

### CAPEX (One-Time Costs)

| Voce | Descrizione | Costo Medio |
|------|-------------|-------------|
| **Provisioning-Configuration** | Pipeline implementation, DEV/OPS support | €15,348 |
| **QA** | Quality assurance, DR, observability, security, compliance, testing | €27,450 |
| **Load Test** | Definition, execution, evaluation | €32,208 |
| **Observability** | Dashboard extension | €8,662 |
| **RFC** | Change Enablers | €7,808 |
| **TOTALE CAPEX ESEMPIO** | | **€91,476** |

### OPEX (Recurring Costs)

| Voce | Descrizione | Costo Annuale |
|------|-------------|---------------|
| **Subscription** | Infrastructure licenses (RedHat, Dynatrace, etc.) | €19,595 |
| **DC** | Infrastructure running fee (ACN) | €9,242 |
| **TOTALE OPEX ESEMPIO** | | **€28,836** |

**Nota:** Questi sono costi per progetto di 6 mesi. Per 12 mesi: OPEX = €57,672.

---

## 💡 TARIFFARIO PROFESSIONAL SERVICES

### Daily Rates (CA Suppliers, IVA esclusa)

| Ruolo | Fornitore | Tariffa/giorno |
|-------|-----------|----------------|
| **PM Senior** | Accenture | €930 |
| **Architect (Observability)** | Reply | €600 |
| **Observability Engineer** | Reply | €450 |
| **Test Manager / PM** | Sidesoft | €340 |
| **Senior Developer / Technical Analyst** | Sidesoft | €320 |
| **Developer / Tester** | Sidesoft | €260 |

### Calcolo Effort

**Formula:**
```
Costo = FTE * Giorni_Lavorativi * Tariffa_Giornaliera * 1.22 (IVA)

Esempio QA (6 mesi):
  1 FTE * 25% allocazione * 6 mesi * 20 gg/mese * €750/giorno * 1.22
  = 0.25 * 120 giorni * €750 * 1.22
  = €27,450
```

---

## 🔧 FORMULE CHIAVE

### 1. Costo Infrastruttura Anno 1

```
Costo_Componente = Base_Price_ACN * Quantità * 1.22

Esempio: 2 VM da 8 vCore
  = €862 * 2 * 1.22
  = €2,103 (anno 1)
```

### 2. Backup Storage

```
Backup_Front_End = Storage_Prod_TB * Costo_Backup_FE_per_TB
Backup_Back_End = Storage_Prod_TB * 5 * Costo_Backup_BE_per_TB

Esempio: 2.2 TB storage prod
  FE = 2.2 * €2,184 = €4,805
  BE = 2.2 * 5 * €202 = €2,222
```

### 3. Aggiustamento Durata Progetto

```
Costo_Progetto = (Costo_Annuale / 12) * Mesi_Progetto

Esempio: €57,672 annuale per 6 mesi
  = (€57,672 / 12) * 6
  = €28,836
```

### 4. Costi Ricorrenti Multi-Anno

```
Costo_Anno_1 = Prezzo_Lista * 1.22
Costo_Anno_N = Prezzo_Ricorrente * 1.22 (N > 1)

Esempio Windows Standard:
  Anno 1: €2,306.88 * 1.22 = €2,814
  Anno 2+: €604.16 * 1.22 = €737
```

---

## 🎯 MAPPATURA CAMPI FORM → COSTI CA

### microservicesCount → Infra

**On-Premise (default):**
```
IF microservicesCount > 0:
  - Pod deployment: microservicesCount * €251/anno
  - Storage per pod (stima 10GB): microservicesCount * 10GB * €553/TB/anno (SSD non-repl)
  - Dynatrace K8s monitoring: microservicesCount * €14.86/POD/anno
```

**Cloud (eccezione):**
```
IF cloudSaas = true OR cloudIaasPaas = true:
  - Cluster K8s: €3,233/anno (shared per progetto)
  - Namespace: €206/anno
  - POD: microservicesCount * €94/anno
```

### computeCores → VM

**On-Premise:**
```
Server_4vCore_qty = CEILING(computeCores / 4)
Server_8vCore_qty = CEILING(computeCores / 8)  // se più efficiente

Costo_Anno_1 = qty * Base_Price (€684 o €862) * 1.22

IF prod_environment:
  Costo *= 2  // ridondanza
```

### storageGb → Storage + Backup

**On-Premise:**
```
Storage_SSD_Replicated = storageGb * €868/TB (anno 1)

IF prod_environment:
  Backup_FE = storageGb * €2,184/TB
  Backup_BE = storageGb * 5 * €202/TB
ELSE:
  Backup_FE = storageGb * €2,184/TB (solo FE)
```

### hasDatabaseImpactDip / hasSqlDbType / hasDatabaseImpactHostDb2

**Gestione Database (non infra, Exadata/SQL sono frozen):**
```
IF hasDatabaseImpactDip = true:
  // Oracle Exadata gestione
  Gestione_Oracle = €1,062/istanza (anno 1)
  
IF hasSqlDbType = true:
  // MS SQL Server gestione
  Gestione_SQL = €525/istanza (anno 1)
  
IF hasDatabaseImpactHostDb2 = true:
  // DB2 Mainframe gestione
  Gestione_DB2 = €700/istanza (anno 1)
```

**NOTA:** Questi sono costi di **gestione ACN**, non di licenze o hardware (già esistenti).

### scheduledBatches → Batch Processing

**Non ci sono costi specifici batch nel listino ACN.**

**Stima indiretta:**
```
Batch probabilmente girano su worker esistenti.
Se scheduledBatches > 30 (threshold MEDIUM):
  Considerare 1 Worker 16vCore dedicato per batch
  Costo = €1,052/anno (non-prod) o €2,103/anno (prod)
```

### testMagnitude / qa → QA CAPEX

**Dal Quadro Spese:**
```
testMagnitude = "Bassa":
  QA Effort = 0.15 FTE * 6 mesi * 20 gg * €750/gg * 1.22 = €16,470
  
testMagnitude = "Media":
  QA Effort = 0.25 FTE * 6 mesi * 20 gg * €750/gg * 1.22 = €27,450
  
testMagnitude = "Alta":
  QA Effort = 0.5 FTE * 6 mesi * 20 gg * €750/gg * 1.22 = €54,900
  
Load Test (se testMagnitude = "Alta"):
  + €32,208 (2 FTE * 2 mesi * 20 gg * €330/gg * 1.22)
```

### pipeline / expectedReleases → DevOps CAPEX

**Dal Quadro Spese:**
```
Pipeline implementation = €15,348 (CAPEX base)

IF expectedReleases > 10:
  // Pipeline complessa, più DevOps support
  DevOps_Support = €15,348 * 1.5 = €23,022
```

### monitoringSystems / observability → Observability CAPEX + OPEX

**CAPEX (Dashboard extension):**
```
observability = "Basic":
  Dashboard_Setup = €4,000 (0.5 FTE * 1 mese * 20 gg * €450/gg * 1.22)
  
observability = "Advanced":
  Dashboard_Setup = €8,662 (1 FTE * 75% * 1 mese * 20 gg * €470/gg * 1.22)
```

**OPEX (Dynatrace licenses):**
```
Per microservice:
  K8s_Monitoring = microservicesCount * €14.86/POD/anno
  
Per VM:
  Infrastructure_Monitoring = vm_count * €159.12/VM/anno
  
Logs (stima 5GB/giorno):
  Log_Management = 5 * €741.16/GB/anno = €3,706/anno
```

---

## ⚠️ VINCOLI E POLICY CA

### 1. Database - Capacità Frozen

❌ **Oracle Exadata:** Non incrementabile. Se full → progetto bloccato o cloud fallback.  
❌ **SQL Server:** Cluster esistenti, VM nuove rilasciate su capacità esistente.  
❌ **NO database a microservizio on-premise.**

### 2. Prod vs Non-Prod

✅ **Prod:** Sempre 2 unità (ridondanza), backup FE+BE.  
✅ **Non-Prod:** 1 unità, solo backup FE.

### 3. On-Premise è Default

✅ Infrastruttura primaria: VMware (VM), OCP/Mirantis (containers).  
⚠️ Cloud solo per:
  - Sviluppo/test temporanei
  - Workload specifici non supportati on-premise
  - Overflow se on-premise saturo

### 4. IVA Universale

✅ **Tutti i costi:** Prezzo_Base * 1.22 (22% IVA)

### 5. Multi-Year Depreciation

✅ Infrastruttura on-premise: Costi decrescenti su 5 anni.  
✅ Cloud: Costi flat annuali (no depreciation).

---

## 📝 ESEMPIO PRATICO: Progetto MEDIUM

**Input Form:**
- microservicesCount: 20
- computeCores: 40
- storageGb: 300
- projectDuration: "6 mesi"
- hasDatabaseImpactDip: true
- testMagnitude: "Media"
- qa: "Intermedio"
- observability: "Advanced"
- serviceRisk: "Medio"

**Calcolo:**

**CAPEX:**
```
Pipeline implementation: €15,348
QA (0.25 FTE, 6 mesi): €27,450
Observability dashboards: €8,662
TOTALE CAPEX: €51,460
```

**OPEX Anno 1:**
```
Infrastructure:
  - 20 POD on-premise: 20 * €251 = €5,020
  - 5 VM 8vCore (40 cores): 5 * €862 * 2 (prod) = €8,620
  - Storage 300GB SSD repl: 0.3TB * €868 = €260
  - Backup FE: 0.3TB * €2,184 = €655
  - Backup BE: 0.3TB * 5 * €202 = €303
  - Oracle gestione: €1,062
  
Licenses:
  - Dynatrace K8s: 20 * €14.86 = €297
  - Dynatrace VM: 5 * €159.12 = €796
  - Dynatrace Logs (5GB): €3,706
  - RedHat (5 VM): 5 * €1,122 = €5,610
  
TOTALE OPEX (Anno 1): €26,329
```

**OPEX Progetto (6 mesi):**
```
(€26,329 / 12) * 6 = €13,165
```

**TOTALE PROGETTO (6 mesi):**
```
CAPEX: €51,460
OPEX (6m): €13,165
TOTALE: €64,625
```

**Confronto con Band MEDIUM:**
- Target: €100-200k (CAPEX €60-110k, OPEX €40-90k)
- Progetto: €64.6k
- ✅ Sotto range, realistico per MEDIUM light

---

## 🚀 NEXT STEPS

1. **Riscrivere `field-to-cost-mapping.md`** con questi dati reali CA
2. **Creare `composition-rules.md`** per logiche boolean (on-prem vs cloud)
3. **Aggiornare prompt AI agent** con istruzioni specifiche CA
4. **Testare** su quotazioni storiche per validare accuracy

---

**Fine Documento**
