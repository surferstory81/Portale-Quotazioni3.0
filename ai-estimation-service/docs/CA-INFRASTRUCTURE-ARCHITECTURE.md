# Crédit Agricole - Infrastructure Architecture & Policies

**Document Version:** 1.0  
**Date:** 2026-05-08  
**Status:** ✅ Validated by User  
**Purpose:** Architecture reference for AI cost estimation

---

## 🏗️ Infrastructure Overview

### Primary Architecture: **ON-PREMISE**

Crédit Agricole's infrastructure is **primarily on-premise**, with cloud used only for specific edge cases.

---

## 🖥️ Virtualization & Compute

### Virtual Machines
- **Technology:** VMware
- **Use Case:** Traditional VM-based applications
- **Management:** Vendor ACN (listino tab "ACN")

### Containers / Microservices
- **Technologies:** 
  - **OpenShift Container Platform (OCP)**
  - **Mirantis Kubernetes**
- **Use Case:** Microservices architecture
- **Management:** Vendor ACN (listino tab "ACN")

---

## 🗄️ Database Architecture

### Oracle Exadata
- **Configuration:** 2 clusters
  - Cluster 1: Production
  - Cluster 2: Parallel (non-production)
- **Status:** ⚠️ **FROZEN CAPACITY - Non incrementabile**
- **Policy:** New projects use existing capacity only
- **Reason:** Cost containment decision

### MS SQL Server
- **Configuration:** 2 clusters on VMware
- **Status:** Pre-licensed
- **Policy:** New VM instances deployed on existing clusters
- **Licensing:** Already covered, no incremental license cost for new DBs

### MongoDB
- **Deployment:** On Virtual Machines
- **Scaling:** New instances on existing VM infrastructure

### PostgreSQL (EDB - EnterpriseDB)
- **Deployment:** On Virtual Machines
- **Scaling:** New instances on existing VM infrastructure

### ⚠️ **CRITICAL POLICY: NO Microservice-Level Databases On-Premise**

**Rule:** Database instances are **NOT created at microservice level** on-premise infrastructure.

**Rationale:**
- Centralized database management
- Resource optimization
- Simplified operations and backup

**Implication for Cost Estimation:**
- `microservicesCount` does NOT directly create new database instances on-premise
- Database costs depend on:
  - Which centralized cluster is used (Oracle Exadata / SQL Server / MongoDB / PostgreSQL)
  - Data volume (`storageGb`, `hasDatabaseImpactDip`, `hasDatabaseImpactHostDb2`)
  - Management overhead (not hardware, since clusters are fixed)

---

## ☁️ Cloud Infrastructure (Secondary)

### Usage Scenarios
Cloud infrastructure is used for:
1. **Development/Test environments** (temporary)
2. **Specific workloads** not supported on-premise
3. **Overflow capacity** (if on-premise saturated)
4. **External-facing services** (specific use cases)

### Providers
- AWS
- GCP (Google Cloud Platform)
- Azure

### Cost Model
- **Pricing:** Vendor ACN (listino tab "ACN Cloud")
- **Billing:** Annual operation costs (no multi-year depreciation like on-premise)

---

## 💰 Cost Structure: CAPEX vs OPEX

### CAPEX (Capital Expenditure) - One-Time Costs

| Category | Description | Source |
|----------|-------------|--------|
| **Monitoring** | Dashboard creation + Dynatrace licenses | Quadro Spese |
| **Load Testing** | Application load test infrastructure and execution | Quadro Spese |
| **Quality Assurance** | QA activities, testing, compliance | Quadro Spese |
| **DevOps Pipelines** | Pipeline implementation and configuration | External vendor, Quadro Spese |

**Purpose:** Initial project setup and enablement.

---

### OPEX (Operational Expenditure) - Recurring Costs

| Category | Description | Source |
|----------|-------------|--------|
| **Software Licenses** | OS, middleware, monitoring tools (annual subscriptions) | ACN Listino licenze |
| **Infrastructure Management** | ACN vendor fees for managing infrastructure | ACN tab |

**Purpose:** Ongoing costs for running and maintaining the solution.

---

## 📊 Cost Calculation Sources

### Excel File Structure (Reference Only - Data to be Validated)

**File:** `_archive/BudgetCTO_v2.1.xlsx`

**Important Tabs:**

1. **"ACN Listino licenze"**
   - Software licenses pricing
   - OS, virtualization, monitoring tools
   - Per-core, per-VM, per-POD pricing models

2. **"ACN"**
   - On-premise infrastructure provider costs
   - Virtual servers, storage, database management, middleware
   - Multi-year depreciation model

3. **"ACN Cloud"**
   - Cloud provider costs (AWS/GCP/Azure)
   - Managed services, VMs, containers, databases

4. **"ACN Costo Infra"**
   - **Formulas for cost calculations**
   - Input: component quantities
   - Output: CAPEX/OPEX breakdown

5. **"Riepilogo Quadro Spese"**
   - High-level cost summary
   - CAPEX/OPEX aggregation

6. **"Fasce budget CTO"**
   - **Project classification bands** (LIGHT, MEDIUM, COMPLESSO, SPECIALE)
   - Thresholds for microservices, cores, storage, duration, etc.
   - **CAPEX and OPEX ranges** by project complexity

**Note:** File contains example data - actual pricing must be validated with current CA contracts and vendor agreements.

---

## 🎯 Field-to-Architecture Mapping

### Form Fields → Infrastructure Decisions

#### `microservicesCount`
- **On-Premise:** Deploy on OCP/Mirantis
- **NO new database instances** (use centralized DB)
- **Cost drivers:**
  - POD deployment on OCP/Mirantis
  - Container orchestration overhead
  - Monitoring (Dynatrace per POD)

#### `computeCores`
- **On-Premise:** VMware virtual machines
- **Sizing:** Allocate VMs based on total core count
- **Redundancy:** Production = 2x resources, Non-Prod = 1x

#### `storageGb`
- **On-Premise:** SAN/NAS storage
- **Backup:** 
  - Front-end = 1:1 ratio with production storage
  - Back-end = 5:1 ratio with production storage (more retention)

#### `hasDatabaseImpactDip`
- **Indicates:** Integration with Oracle Exadata (DIP = Data Integration Platform)
- **Constraint:** Exadata capacity is frozen
- **Cost:** Management overhead, not hardware (Exadata already exists)

#### `hasSqlDbType`
- **Indicates:** MS SQL Server usage
- **Constraint:** SQL clusters are pre-licensed
- **Cost:** Management overhead, VM resources, no incremental SQL licenses

#### `hasDatabaseImpactHostDb2`
- **Indicates:** Mainframe DB2 integration
- **Cost:** Mainframe connectivity licenses, MIPS allocation, specialized skills

#### `cloudSaas`, `cloudIaasPaasLandingZoneCa`
- **Triggers:** Cloud infrastructure instead of on-premise
- **Use sparingly:** On-premise is default
- **Cost Model:** Annual fees (ACN Cloud tab)

#### `hostMainframe`
- **Indicates:** Mainframe integration required
- **Cost drivers:**
  - Mainframe connectivity software
  - MIPS allocation (mainframe processing units)
  - Specialized developers (premium rates)

#### `testMagnitude`, `qa`
- **Maps to:** CAPEX for QA activities
- **Cost drivers:**
  - QA resource allocation (FTE)
  - Test automation tools
  - Test environment infrastructure (mirrors production)

#### `pipeline`, `expectedReleases`
- **Maps to:** CAPEX for DevOps pipeline setup
- **Cost drivers:**
  - Pipeline implementation (external vendor)
  - CI/CD tooling
  - Release management

#### `monitoringSystems`, `observability`
- **Maps to:** 
  - CAPEX: Dashboard creation, observability tooling setup
  - OPEX: Dynatrace licenses (per GB, per VM, per POD)

---

## 🚨 Critical Constraints for Cost Estimation

### 1. Database Capacity Frozen

**Oracle Exadata:**
- ❌ Cannot add capacity
- ✅ Can allocate from existing pool
- ⚠️ **If full:** Project may be blocked or require cloud fallback

**Implication:** AI estimation must flag high database volume (`hasDatabaseImpactDip` + large `storageGb`) as potential blocker.

---

### 2. No Per-Microservice Databases (On-Premise)

**Policy:** Database instances are centralized, not per-microservice.

**Implication:** `microservicesCount` does NOT multiply database costs on-premise.

**Exception:** Cloud deployments may have per-service databases (managed services like RDS/CloudSQL).

---

### 3. Production Redundancy

**Rule:** Production environments require 2x resources for high availability.

**Implication:**
- `serviceRisk = "Alto"` → Production environment → 2x compute/storage
- Non-production → 1x resources

---

### 4. On-Premise is Default

**Rule:** Unless explicitly specified, assume on-premise infrastructure.

**Cloud triggers:**
- `cloudSaas = true`
- `cloudIaasPaasLandingZoneCa = true`
- `serviceExposure = true` (may suggest cloud for public-facing services)

---

### 5. Multi-Year Depreciation (On-Premise Only)

**On-Premise:**
- Hardware/infrastructure costs depreciated over 3-5 years
- Year 1 cost ≠ Year 2+ cost (decreasing)

**Cloud:**
- Annual flat fees (no depreciation)

---

## 📋 Project Classification Bands

### Purpose
Classify projects into complexity bands based on technical criteria. Used for budget estimation and approval workflows.

### Bands

| Band | Characteristics | Typical Budget Range |
|------|-----------------|---------------------|
| **NO IMPATTI CTO** | No CTO infrastructure impact | No CTO budget |
| **LIGHT** | Small, low-complexity projects | €50-100k |
| **MEDIUM** | Moderate complexity and scale | €100-200k |
| **COMPLESSO** | Large, high-complexity projects | €200-500k |
| **SPECIALE** | Strategic, multi-year initiatives | >€500k (custom) |

### Key Criteria (Examples)

| Criterion | LIGHT | MEDIUM | COMPLESSO | SPECIALE |
|-----------|-------|--------|-----------|----------|
| Microservices | 0-15 | 16-30 | 31-100 | >100 |
| Compute Cores | 0-30 | 30-60 | 60-200 | >200 |
| Storage (DIP) | <1 TB | 1-10 TB | 10-50 TB | >50 TB |
| Duration | 1-6 months | 7-9 months | >1 year | Multi-year |
| Pipeline Count | <10 | 10-30 | 30-60 | >60 |

**Decision Rule:** **At least one parameter** from a band classifies the project into that band.

---

## 🔧 Cost Calculation Principles

### 1. IVA (VAT) Application
- **Rate:** 22% (Italy)
- **Formula:** `Costo_Finale = Costo_Base * 1.22`
- **Applied to:** All infrastructure and service costs

### 2. Project Duration Adjustment
- **Formula:** `Costo_Progetto = (Costo_Annuale / 12) * Mesi_Progetto`
- **Rationale:** OPEX costs are prorated based on project duration
- **Example:** 6-month project pays 50% of annual OPEX

### 3. Backup Storage Ratios
- **Front-End Backup:** 1:1 with production storage
- **Back-End Backup:** 5:1 with production storage (more retention, snapshots)
- **Formula:**
  ```
  Backup_FE = Storage_Prod * 1.0 * Costo_Backup_FE
  Backup_BE = Storage_Prod * 5.0 * Costo_Backup_BE
  ```

### 4. Professional Services Calculation
- **Formula:** `Costo = FTE * % Allocazione * Giorni * Tariffa_Giornaliera * 1.22`
- **Example:**
  ```
  QA: 1 FTE * 25% * 120 giorni * €750/giorno * 1.22 = €27,450
  ```

---

## 📝 Usage Instructions for AI Agent

When generating cost estimates, the AI agent must:

1. **Determine Infrastructure Type:**
   - Default: On-premise (VMware, OCP/Mirantis)
   - Exception: Cloud (if `cloudSaas` or `cloudIaasPaas` flags set)

2. **Respect Database Constraints:**
   - Do NOT create per-microservice databases on-premise
   - Flag high database volume as potential Exadata capacity issue
   - Consider management costs, not hardware costs (clusters exist)

3. **Apply Production Redundancy:**
   - If `serviceRisk = "Alto"` or production environment: 2x resources
   - Otherwise: 1x resources

4. **Calculate CAPEX (One-Time):**
   - Monitoring setup + Dynatrace licenses
   - Load testing
   - QA activities (based on `testMagnitude`, `qa`)
   - DevOps pipeline implementation

5. **Calculate OPEX (Recurring):**
   - Software licenses (OS, middleware, monitoring subscriptions)
   - Infrastructure management fees (ACN vendor)
   - Prorate by project duration

6. **Apply Budget Band Classification:**
   - Check form fields against band thresholds
   - Use "at least one parameter" rule
   - Validate estimate against band range

7. **Document Assumptions:**
   - State infrastructure type (on-prem vs cloud)
   - Note database allocation strategy
   - Flag any capacity constraints
   - Explain CAPEX/OPEX breakdown

---

## 🚀 Next Steps

1. **Validate Pricing Data:**
   - Obtain current ACN vendor contracts
   - Update license pricing (RedHat, Dynatrace, VMware, etc.)
   - Confirm cloud pricing agreements (AWS/Azure/GCP)

2. **Update Knowledge Base Files:**
   - `field-to-cost-mapping.md`: Use validated CA pricing
   - `composition-rules.md`: Implement on-prem vs cloud logic
   - `pricing-rules.md`: Add CA-specific multipliers and bands

3. **Test with Historical Data:**
   - Run estimates on completed projects
   - Compare AI estimates vs. actual costs
   - Calibrate formulas and assumptions

---

**Document Status:** ✅ Validated - Architecture and policies confirmed by user. Pricing data pending validation.
