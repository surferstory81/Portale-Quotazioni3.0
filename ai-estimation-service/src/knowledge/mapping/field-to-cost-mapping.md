# Field-to-Cost Mapping - Crédit Agricole Architecture

This file provides **direct mappings** from quotation form fields to Crédit Agricole infrastructure costs. All formulas use real CA pricing from vendor contracts (ACN).

**Last Updated:** 2026-05-15  
**Version:** 2.0  
**Source:** BudgetCTO_v2.3.csv, CA Architecture Documentation

---

## 🎯 Cost Calculation Strategy

**CA Infrastructure is ON-PREMISE first:**
- Primary: VMware VMs, OpenShift Container Platform (OCP)
- Secondary: Cloud (only if `cloudIaasPaasLandingZoneCa = true`)
- All costs include **IVA 22%** (già applicata nei prezzi)

---

## 📊 Environment Multipliers

**CA has 4 environments:**
- **Produzione**: Full resources, HA configuration
- **DR (Disaster Recovery)**: Mirror of Prod
- **Parallelo**: Reduced capacity (50-100% of Prod)
- **Collaudo**: Minimal capacity (30-50% of Prod)

---

## 1️⃣ Microservices Architecture (`microservicesCount`)

### Formula Overview

```javascript
if (microservicesCount > 0) {
  // OpenShift Container Platform
  total_cost = pod_management + worker_nodes + ocp_licenses + namespaces
}
```

---

### A) Pod Management Costs

**Cost per pod per environment (anno 1):**
- Produzione: €210.72/pod/anno (licenza OCP Prod)
- DR: €141.73/pod/anno (licenza OCP DR)
- Parallelo: €141.73/pod/anno (licenza OCP Standard)
- Collaudo: €141.73/pod/anno (licenza OCP Standard)

**Scaling pattern:**
```javascript
// Prod: minimum 2 pod per microservice (HA)
prod_pods = microservicesCount × 2

// DR: same as Prod
dr_pods = microservicesCount × 2

// Parallelo: max 2 pod per microservice
parallelo_pods = microservicesCount × 2

// Collaudo: 1 pod per microservice
collaudo_pods = microservicesCount × 1

// Total pods
total_pods = prod_pods + dr_pods + parallelo_pods + collaudo_pods
           = microservicesCount × (2 + 2 + 2 + 1)
           = microservicesCount × 7
```

**Pod management cost:**
```javascript
pod_mgmt_cost = (prod_pods × €210.72) + 
                (dr_pods × €141.73) + 
                (parallelo_pods × €141.73) + 
                (collaudo_pods × €141.73)

// Esempio: 20 microservizi
// (40 × €210.72) + (40 × €141.73) + (40 × €141.73) + (20 × €141.73)
// = €8,428.80 + €5,669.20 + €5,669.20 + €2,834.60
// = €22,601.80/anno
```

---

### B) Worker Nodes (VM 16 vCore)

**Cost:** €1,051.74/worker anno 1

**Calculate workers needed:**
```javascript
// Step 1: Estimate CPU per pod (conservative)
cpu_limit_per_pod = 0.5  // Default conservative estimate

// Adjust based on service volume
if (serviceVolumesPerDay < 1000) {
  cpu_limit_per_pod = 0.5  // Light
} else if (serviceVolumesPerDay < 100000) {
  cpu_limit_per_pod = 1.0  // Medium
} else {
  cpu_limit_per_pod = 2.0  // High
}

// Step 2: Total vCPU needed
total_vcpu = total_pods × cpu_limit_per_pod

// Step 3: Workers needed (16 vCPU per worker)
workers_needed = CEILING(total_vcpu / 16)

// Worker cost
worker_cost = workers_needed × €1,051.74

// Esempio: 20 microservizi, medium volume
// total_pods = 140
// total_vcpu = 140 × 0.5 = 70 vCPU
// workers = CEILING(70/16) = 5 workers
// cost = 5 × €1,051.74 = €5,258.70/anno
```

---

### C) OpenShift Licenses (per vCPU)

**Base prices per core (subscription covers 4 vCPU):**
- OCP Prod: €842.86/core × 0.25 = €210.72/vCPU
- OCP DR: €566.92/core × 0.25 = €141.73/vCPU
- OCP Standard: €566.92/core × 0.25 = €141.73/vCPU

**⚠️ ALREADY INCLUDED in Pod Management costs above**

Pod costs (€210.72, €141.73) ARE the OpenShift license costs per vCPU.

---

### D) Namespaces

**Cost:** €649.04/namespace/anno (flat, all years)

**Namespaces per environment:**
```javascript
// Minimum 3 per environment (frontend, backend, middleware-gateway)
namespaces_per_env = 3

// Adjust for large projects
if (microservicesCount > 30) {
  namespaces_per_env = 6  // Multi-domain separation
} else if (microservicesCount > 10) {
  namespaces_per_env = 4  // Additional separation
}

// Total namespaces (4 environments)
total_namespaces = namespaces_per_env × 4

// Namespace cost
namespace_cost = total_namespaces × €649.04

// Esempio: 20 microservizi → 3 namespace/env
// 3 × 4 = 12 namespaces
// 12 × €649.04 = €7,788.48/anno
```

---

### E) Complete Microservices Cost Example

**Input:**
- microservicesCount: 20
- serviceVolumesPerDay: 5,000 (medium)

**Calculation:**
```
Pods:
  Prod: 40 × €210.72 = €8,428.80
  DR: 40 × €141.73 = €5,669.20
  Parallelo: 40 × €141.73 = €5,669.20
  Collaudo: 20 × €141.73 = €2,834.60
  Subtotal: €22,601.80

Workers:
  Total vCPU: 140 × 0.5 = 70 vCPU
  Workers: CEILING(70/16) = 5
  Cost: 5 × €1,051.74 = €5,258.70

Namespaces:
  12 × €649.04 = €7,788.48

TOTAL MICROSERVICES OPEX (anno 1): €35,648.98
```

---

## 2️⃣ Compute Cores (`computeCores`)

### When computeCores is Used

**Scenario A:** `microservicesCount > 0` AND `computeCores > 0`
```javascript
// Mixed: containers + VMs
// Assume 50/50 split (project planning phase uncertainty)
container_cores = computeCores × 0.5
vm_cores = computeCores × 0.5
```

**Scenario B:** `microservicesCount > 0` AND `computeCores == 0`
```javascript
// Pure container deployment
// CPU already calculated from microservicesCount
container_cores = microservicesCount × cpu_limit × scaling_factor
vm_cores = 0
```

**Scenario C:** `microservicesCount == 0` AND `computeCores > 0`
```javascript
// Legacy VM-based applications
container_cores = 0
vm_cores = computeCores
```

---

### VM Sizing Strategy

**Prefer VM 8 vCore for efficiency:**

```javascript
if (vm_cores > 0) {
  // Calculate VM 8 vCore quantity
  vm_8vcore_qty = CEILING(vm_cores / 8)
  
  // Production requires 2x for HA
  if (serviceRisk == "Alto" || isProdEnvironment) {
    prod_vms = vm_8vcore_qty × 2
  } else {
    prod_vms = vm_8vcore_qty
  }
  
  // Other environments (lighter workload)
  parallelo_vms = CEILING(vm_8vcore_qty × 0.5)
  collaudo_vms = CEILING(vm_8vcore_qty × 0.3)
  
  total_vms = prod_vms + parallelo_vms + collaudo_vms
  
  vm_cost_year1 = total_vms × €1,051.74
}
```

**Example:** 32 cores legacy app, Alto risk
```
vm_8vcore_qty = CEILING(32/8) = 4
prod_vms = 4 × 2 = 8 (HA)
parallelo_vms = CEILING(4 × 0.5) = 2
collaudo_vms = CEILING(4 × 0.3) = 2

total_vms = 8 + 2 + 2 = 12
vm_cost = 12 × €1,051.74 = €12,620.88/anno
```

---

### VMware Licensing

**Formula:** `(total_vCPU / 3) × €89/core/anno × 1.22 IVA`

```javascript
// Physical cores estimation (3 virtual = 1 physical)
physical_cores = vm_cores / 3

// VMware cost per physical core
vmware_cost_per_core = €89 × 1.22 = €108.58

// Total VMware cost
vmware_cost = physical_cores × €108.58

// Example: 32 vCPU
// physical_cores = 32/3 = 10.67
// vmware_cost = 10.67 × €108.58 = €1,158.55/anno
```

**⚠️ Note:** Total vCPU includes all environments (Prod + Parallelo + Collaudo)

---

## 3️⃣ Storage (`storageGb`)

### Storage Interpretation

**User input = Production storage** (includes database + application)

### A) Live Storage (SSD Replicato)

**Cost:** €1,059.39/TB anno 1

**Environment ponderations:**
```javascript
storage_prod = storageGb  // TB
storage_dr = storage_prod × 1.0
storage_parallelo = storage_prod × 0.5
storage_collaudo = storage_prod × 0.3

total_storage_tb = storage_prod + storage_dr + storage_parallelo + storage_collaudo
                 = storage_prod × (1 + 1 + 0.5 + 0.3)
                 = storage_prod × 2.8

storage_cost = total_storage_tb × €1,059.39
```

**Example:** 2 TB prod
```
total_storage = 2 × 2.8 = 5.6 TB
storage_cost = 5.6 × €1,059.39 = €5,932.58/anno
```

---

### B) Backup Storage

**Front-end backup:** €2,664.99/TB anno 1 (ratio 1:1 with prod)
**Back-end backup:** €1,229.46/TB anno 1 (ratio 5:1 with prod)

```javascript
// Front-end backup (1:1)
backup_fe_tb = storage_prod × 1
backup_fe_cost = backup_fe_tb × €2,664.99

// Back-end backup (5:1 - extended retention)
backup_be_tb = storage_prod × 5
backup_be_cost = backup_be_tb × €1,229.46

total_backup_cost = backup_fe_cost + backup_be_cost
```

**Example:** 2 TB prod
```
Backup FE: 2 × €2,664.99 = €5,329.98
Backup BE: 10 × €1,229.46 = €12,294.60
Total: €17,624.58/anno
```

---

### Complete Storage Cost Example

**Input:** storageGb = 2 TB

```
Live Storage: 5.6 TB × €1,059.39 = €5,932.58
Backup FE: 2 TB × €2,664.99 = €5,329.98
Backup BE: 10 TB × €1,229.46 = €12,294.60

TOTAL STORAGE OPEX (anno 1): €23,557.16
```

---

## 4️⃣ Database Management

### Oracle Exadata (`hasDatabaseImpactDip`)

**Architecture:** Cluster esistente, capacità FROZEN

```javascript
if (hasDatabaseImpactDip == true) {
  // 3 instances: Prod, Parallelo, Collaudo
  oracle_instances = 3
  oracle_mgmt_cost = 3 × €1,295.99 = €3,887.97/anno
  
  // NO VM cost (Exadata hardware already exists)
  oracle_vm_cost = €0
  
  // ⚠️ Strategic warning
  warnings.push({
    severity: "MEDIUM",
    category: "Database Strategy",
    message: "Progetto richiede Oracle Database. CA sta dismettendo Oracle come tecnologia strategica.",
    recommendation: "Valutare alternative: PostgreSQL per nuove applicazioni, SQL Server per integrazione esistente."
  })
}
```

---

### SQL Server (`hasSqlDbType`, `dedicatedSqlCluster`)

**Default:** Cluster condiviso (0 VM)

```javascript
if (hasSqlDbType == true) {
  // Management cost (always 3 instances)
  sql_mgmt_cost = 3 × €640.06 = €1,920.18/anno
  
  if (dedicatedSqlCluster == true) {
    // Dedicated cluster: 2 Prod + 1 Parallelo + 1 Collaudo = 4 VM
    
    // DB Sizing based on project complexity
    db_score = calculateDbScore(microservicesCount, storageGb, serviceVolumesPerDay)
    
    if (db_score <= 4) {
      db_vm_cost_per_vm = €834.54  // VM 4 vCore
    } else {
      db_vm_cost_per_vm = €1,051.74  // VM 8 vCore
    }
    
    sql_vm_qty = 4
    sql_vm_cost = 4 × db_vm_cost_per_vm
    
  } else {
    // Shared cluster (default)
    sql_vm_cost = €0
  }
  
  total_sql_cost = sql_mgmt_cost + sql_vm_cost
}

// DB Scoring function
function calculateDbScore(microservices, storage, volumes) {
  score = 0
  
  // Factor 1: Microservices accessing DB
  if (microservices < 10) score += 1
  else if (microservices < 30) score += 2
  else score += 3
  
  // Factor 2: Storage size
  if (storage < 100) score += 1
  else if (storage < 500) score += 2
  else score += 3
  
  // Factor 3: Transaction volume
  if (volumes < 1000) score += 1
  else if (volumes < 10000) score += 2
  else score += 3
  
  return score  // Range: 3-9
}
```

**Example:** SQL dedicato, db_score = 6
```
Management: 3 × €640.06 = €1,920.18
VM: 4 × €1,051.74 = €4,206.96
Total: €6,127.14/anno
```

---

### PostgreSQL (`hasPostgresDatabase` - NEW FIELD)

**Architecture depends on criticality:**

```javascript
if (hasPostgresDatabase == true) {
  // Management cost (3 instances)
  postgres_mgmt_cost = 3 × €853.41 = €2,560.23/anno
  
  // DB Sizing
  db_score = calculateDbScore(microservicesCount, storageGb, serviceVolumesPerDay)
  
  if (db_score <= 4) {
    db_vm_cost_per_vm = €834.54  // VM 4 vCore
  } else {
    db_vm_cost_per_vm = €1,051.74  // VM 8 vCore
  }
  
  if (serviceRisk == "Alto") {
    // CRITICAL: Stretched cluster 2 datacenter
    // Prod: 6 nodi (3+3 DC), Parallelo: 3, Collaudo: 1
    postgres_vm_qty = 6 + 3 + 1 = 10
    
  } else {
    // NON-CRITICAL: Standard HA
    // Prod: 2 nodi, Parallelo: 2, Collaudo: 1
    postgres_vm_qty = 2 + 2 + 1 = 5
  }
  
  postgres_vm_cost = postgres_vm_qty × db_vm_cost_per_vm
  total_postgres_cost = postgres_mgmt_cost + postgres_vm_cost
}
```

**Example:** Critico, db_score = 6
```
Management: 3 × €853.41 = €2,560.23
VM: 10 × €1,051.74 = €10,517.40
Total: €13,077.63/anno
```

---

### MongoDB (`hasMongoDatabase` - NEW FIELD)

**Architecture:** Replica Set

```javascript
if (hasMongoDatabase == true) {
  // Management cost (3 instances)
  mongo_mgmt_cost = 3 × €853.41 = €2,560.23/anno
  
  // DB Sizing
  db_score = calculateDbScore(microservicesCount, storageGb, serviceVolumesPerDay)
  
  if (db_score <= 4) {
    db_vm_cost_per_vm = €834.54  // VM 4 vCore
  } else {
    db_vm_cost_per_vm = €1,051.74  // VM 8 vCore
  }
  
  // Replica Set: Prod 6 nodi, Parallelo 3, Collaudo 1
  mongo_vm_qty = 6 + 3 + 1 = 10
  
  mongo_vm_cost = 10 × db_vm_cost_per_vm
  total_mongo_cost = mongo_mgmt_cost + mongo_vm_cost
}
```

**Example:** db_score = 6
```
Management: 3 × €853.41 = €2,560.23
VM: 10 × €1,051.74 = €10,517.40
Total: €13,077.63/anno
```

---

## 5️⃣ Monitoring & Observability

### A) Dynatrace Monitoring

**Decision logic:**
```javascript
use_full_stack = false
use_infrastructure = false

// Full Stack: internal apps, MEDIUM+ complexity
if (projectType == "Nuova" && classification >= "MEDIUM") {
  use_full_stack = true
} else if (microservicesCount > 0 && serviceRisk == "Alto") {
  use_full_stack = true
} else {
  // Infrastructure: legacy, simple apps
  use_infrastructure = true
}
```

---

### B) Full Stack Monitoring

**Cost:** €39.79/GB/anno

**Calculate GB (RAM-based):**
```javascript
// RAM per pod estimation
if (serviceVolumesPerDay < 1000) {
  ram_per_pod = 0.5  // GB
} else if (serviceVolumesPerDay < 10000) {
  ram_per_pod = 1.0  // GB
} else {
  ram_per_pod = 1.5  // GB
}

// Total pods (all environments)
total_pods = microservicesCount × 7  // (2+2+2+1)

// Total RAM
total_ram_gb = total_pods × ram_per_pod

// Full Stack cost
fullstack_cost = total_ram_gb × €39.79
```

**Example:** 20 microservizi, medium volume
```
Pods: 140
RAM: 140 × 1.0 = 140 GB
Cost: 140 × €39.79 = €5,570.60/anno
```

---

### C) Infrastructure Monitoring

**Cost:** €159.12/VM/anno

```javascript
// Count VMs (legacy apps + database VMs)
total_vms = legacy_app_vms + database_vms

infrastructure_cost = total_vms × €159.12
```

---

### D) K8s Platform Monitoring

**Cost:** €14.86/POD/anno

```javascript
// All pods (microservices across environments)
total_pods = microservicesCount × 7

k8s_monitoring_cost = total_pods × €14.86
```

**Example:** 20 microservizi
```
Pods: 140
Cost: 140 × €14.86 = €2,080.40/anno
```

---

### E) Log Management

**Ingest cost:** €741.16/GB/anno  
**Retain cost:** €0.53/GB/giorno (30 days)

**Calculate logs (10 MB/pod/day average):**
```javascript
// Only Prod + Parallelo generate significant logs
prod_pods = microservicesCount × 2
parallelo_pods = microservicesCount × 2

logs_gb_per_day = (prod_pods + parallelo_pods) × 0.01  // 10 MB = 0.01 GB

// Annual cost
log_ingest_cost = logs_gb_per_day × €741.16
log_retain_cost = logs_gb_per_day × 30 × €0.53

total_log_cost = log_ingest_cost + log_retain_cost
```

**Example:** 20 microservizi
```
Prod pods: 40
Parallelo pods: 40
Logs/day: 80 × 0.01 = 0.8 GB

Ingest: 0.8 × €741.16 = €592.93
Retain: 0.8 × 30 × €0.53 = €12.72
Total: €605.65/anno
```

---

### Complete Dynatrace Cost Example

**Input:** 20 microservizi, medium volume, Full Stack

```
Full Stack Monitoring: 140 GB × €39.79 = €5,570.60
K8s Platform Monitoring: 140 pods × €14.86 = €2,080.40
Log Management: €605.65

TOTAL DYNATRACE OPEX (anno 1): €8,256.65
```

---

## 6️⃣ Professional Services (CAPEX)

### A) QA Infrastructure (`qa`)

**Provider:** NTT Data  
**Rate:** €450/gg (average blended rate for QA services)

```javascript
if (qa == "YES") {
  if (classification == "MEDIUM" && estimated_capex >= 500000) {
    // LEVEL 1: Standard QA
    qa_days = 20  // 2 months × 0.5 FTE
    qa_cost = 20 × €450 × 1.22 = €10,980
    
  } else if (classification == "COMPLESSO" || classification == "SPECIALE") {
    // LEVEL 2: Extended QA
    qa_days = 50  // 5 months × 0.5 FTE
    qa_cost = 50 × €450 × 1.22 = €27,450
    
  } else {
    qa_cost = 0  // Skip for LIGHT projects or MEDIUM <€500k
  }
}
```

**Example:** COMPLESSO
```
QA: 50 days × €450 × 1.22 = €27,450
```

---

### B) Load Testing (Percentage-Based)

**Provider:** Sidesoft  
**Rates:** PM €340/gg, Senior €320/gg, Tester €260/gg  
**Average:** €300/gg

**Formula:** Load test = X% of estimated CAPEX

```javascript
load_test_percentage = 0

if (projectType == "Evolutiva" || saasProduct_only || hostMainframe) {
  load_test_percentage = 0  // Skip
  
} else if (classification == "LIGHT" || (classification == "MEDIUM" && serviceRisk != "Alto")) {
  load_test_percentage = 0.04  // 4%
  
} else if (classification == "MEDIUM" && serviceRisk == "Alto") {
  load_test_percentage = 0.07  // 7%
  
} else if (classification == "COMPLESSO" || classification == "SPECIALE") {
  load_test_percentage = 0.11  // 11%
}

load_test_cost = estimated_capex × load_test_percentage
```

**Example:** CAPEX €100k, COMPLESSO
```
Load Test: €100,000 × 0.11 = €11,000
```

---

### C) Observability/Dynatrace Dashboard

**Provider:** External service provider  
**Cost per environment:** LVL2 €7,320, LVL3 €12,200  
**Environments:** 2 (PROD + PRE-PROD)

```javascript
if (monitoringSystems == "YES" || observability == "Advanced") {
  if (classification == "COMPLESSO" || classification == "SPECIALE") {
    // LVL3: Full monitoring
    obs_cost_per_env = 12200
  } else if (serviceRisk == "Alto" || serviceRisk == "Medio") {
    // LVL3: High risk
    obs_cost_per_env = 12200
  } else {
    // LVL2: Standard monitoring
    obs_cost_per_env = 7320
  }
  
  obs_cost = obs_cost_per_env × 2  // 2 environments
}
```

**Example:** COMPLESSO
```
Observability: €12,200 × 2 environments = €24,400
```

---

### D) DevOps Pipeline

**Provider:** Imola Informatica  
**Fixed costs based on complexity**

```javascript
if (projectType == "Nuova" && !hasExistingPipelines) {
  if (classification == "COMPLESSO" || classification == "SPECIALE") {
    // LVL3: Advanced pipeline
    pipeline_cost = 12200
  } else if (classification == "MEDIUM" || classification == "LIGHT") {
    // LVL2: Standard pipeline
    pipeline_cost = 7320
  } else {
    pipeline_cost = 0
  }
} else {
  // Evolutiva or existing pipelines
  pipeline_cost = 0
}
```

**Example:** COMPLESSO
```
Pipeline: €12,200 (LVL3 - Advanced)
```

---

### E) Studio di Fattibilità (`requiresFeasibilityStudy`)

**Provider:** Reply  
**Rates:** PM Junior €435/gg, Cloud Architect €610/gg, Engineer €450/gg

```javascript
if (requiresFeasibilityStudy == true) {
  if (classification == "COMPLESSO" || classification == "SPECIALE") {
    // Team: 1 Architect + 1 Engineer per 2 mesi
    feasibility_cost = (1 × 40 × €610 + 1 × 40 × €450) × 1.22
    // = (€24,400 + €18,000) × 1.22 = €51,728
    
  } else {
    // Team: 1 PM Junior + 1 Engineer per 1 mese
    feasibility_cost = (1 × 20 × €435 + 1 × 20 × €450) × 1.22
    // = (€8,700 + €9,000) × 1.22 = €21,594
  }
}
```

---

### F) RFC Support (`requiresRfcSupport`)

**Provider:** Reply Change Enablers  
**Rates:** Senior €500/gg, Specialist €400/gg

```javascript
if (requiresRfcSupport == true) {
  if (classification == "COMPLESSO" || classification == "SPECIALE") {
    rfc_fte = 0.5
    rfc_months = 3
    rfc_rate = 500  // Senior
  } else {
    rfc_fte = 0.5
    rfc_months = 1
    rfc_rate = 400  // Specialist
  }
  
  rfc_cost = rfc_fte × rfc_months × 20 × rfc_rate × 1.22
}
```

**Example:** COMPLESSO
```
RFC: 0.5 × 3 × 20 × €500 × 1.22 = €18,300
```

---

### G) Major Change (Complex Projects Only)

**Provider:** Reply Change Enablers  
**Rate:** €400/gg

```javascript
if (classification == "COMPLESSO" || classification == "SPECIALE") {
  major_change_cost = 5 × €400 × 1.22 = €2,440
}
```

---

### Complete Professional Services Example

**Input:** COMPLESSO project, QA=YES, feasibility=YES, rfc=YES, estimated_capex=€100k

```
QA Infrastructure: €27,450
Load Testing (11% of €100k): €11,000
Observability (2 env): €24,400
DevOps Pipeline: €12,200
Studio Fattibilità: €32,232
RFC Support: €18,300
Major Change: €2,440

TOTAL CAPEX PROFESSIONAL SERVICES: €128,022
```

---

## 7️⃣ Cloud Infrastructure (Optional)

**Trigger:** `cloudIaasPaasLandingZoneCa == true`

**⚠️ Note:** Cloud pricing agent not yet implemented. Use flat ACN Cloud costs.

### Cloud Costs (Anno 1, flat)

**Kubernetes:**
- Cluster: €3,944.31/anno
- Namespace: €251.63/anno
- Pod: €114.38/anno

**Compute:**
- VM: €693.88/anno

**Database:**
- PostgreSQL PaaS: €655.75/anno
- SQL Server PaaS: €655.75/anno

**Networking:**
- VNet: €244.00/anno
- CISCO MCD WAF: €16,124.44/anno

**Formula:**
```javascript
if (cloudIaasPaasLandingZoneCa == true) {
  // Replace on-premise costs with cloud costs
  // Use same scaling logic (environments, pods, etc.)
  
  cloud_cluster_cost = 1 × €3,944.31  // Shared cluster
  cloud_namespace_cost = total_namespaces × €251.63
  cloud_pod_cost = total_pods × €114.38
  // ... etc
}
```

---

## 📋 Complete Cost Calculation Example

**Project Profile:**
- microservicesCount: 20
- computeCores: 0 (pure container)
- storageGb: 2 TB
- hasSqlDbType: true (dedicatedSqlCluster: true)
- serviceVolumesPerDay: 5,000 (medium)
- serviceRisk: "Alto"
- classification: "COMPLESSO"
- projectDuration: 18 months
- qa: "YES"
- requiresFeasibilityStudy: true
- requiresRfcSupport: true

---

### CAPEX Calculation

```
Professional Services:
  QA Infrastructure: €27,450
  Load Testing (11% × €128k base): €14,080
  Observability (2 env): €24,400
  DevOps Pipeline: €12,200
  Studio Fattibilità: €32,232
  RFC Support: €18,300
  Major Change: €2,440

TOTAL CAPEX: €131,102
```

---

### OPEX Calculation (Annual)

```
Microservices (OpenShift):
  Pod Management: €22,601.80
  Worker Nodes: €5,258.70
  Namespaces: €7,788.48
  Subtotal: €35,648.98

Storage:
  Live Storage: €5,932.58
  Backup FE: €5,329.98
  Backup BE: €12,294.60
  Subtotal: €23,557.16

Database (SQL Server dedicato):
  Management: €1,920.18
  VM (4 × 8 vCore): €4,206.96
  Subtotal: €6,127.14

Monitoring (Dynatrace):
  Full Stack: €5,570.60
  K8s Platform: €2,080.40
  Logs: €605.65
  Subtotal: €8,256.65

TOTAL OPEX (Annual): €73,589.93
```

---

### Project Cost (18 months)

```
OPEX Prorated: €73,589.93 / 12 × 18 = €110,384.90

TOTAL FIRST YEAR: €131,102 + €110,384.90 = €241,486.90
```

---

### Multi-Year Projection (5 years)

**On-premise infrastructure:** Costs DECREASE over time (depreciation)

```
Year 1: €110,384.90
Year 2: €110,384.90 × 0.91 = €100,450.26
Year 3: €110,384.90 × 0.87 = €96,034.86
Year 4: €110,384.90 × 0.84 = €92,723.32
Year 5: €110,384.90 × 0.83 = €91,619.47

5-Year OPEX Total: €491,213.71
```

---

## 🔧 Helper Functions Reference

### calculateDbScore()
```javascript
function calculateDbScore(microservices, storage, volumes) {
  score = 0
  
  // Factor 1: Microservices
  if (microservices < 10) score += 1
  else if (microservices < 30) score += 2
  else score += 3
  
  // Factor 2: Storage (GB)
  if (storage < 100) score += 1
  else if (storage < 500) score += 2
  else score += 3
  
  // Factor 3: Daily volumes
  if (volumes < 1000) score += 1
  else if (volumes < 10000) score += 2
  else score += 3
  
  return score  // Range: 3-9
}
```

---

## 📝 NEW Form Fields Required

**Database Technology:**
1. `hasPostgresDatabase` (boolean) - PostgreSQL on-premise
2. `hasMongoDatabase` (boolean) - MongoDB on-premise
3. `dedicatedSqlCluster` (boolean) - Cluster SQL dedicato vs shared

---

## ⚠️ Critical Constraints

### 1. Oracle Exadata Warning
```javascript
if (hasDatabaseImpactDip == true) {
  warnings.push({
    severity: "MEDIUM",
    category: "Database Strategy",
    message: "Progetto richiede Oracle Database. CA sta dismettendo Oracle come tecnologia strategica.",
    recommendation: "Valutare PostgreSQL (nuove app), SQL Server (integrazione), MongoDB (NoSQL)."
  })
}
```

### 2. Database Capacity Frozen
Oracle Exadata capacity is frozen (non-incrementabile). Flag high-volume projects for capacity review.

### 3. Production Redundancy
Production environments always require 2x resources for HA (already factored in formulas).

### 4. IVA 22%
All costs already include IVA 22%. Do NOT apply additional tax.

---

**Document Version:** 2.0  
**Last Updated:** 2026-05-15  
**Source:** Crédit Agricole Real Architecture & Pricing
