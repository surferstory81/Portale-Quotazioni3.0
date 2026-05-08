# Budget CTO v2.1 Excel Analysis - Comprehensive Summary

**File:** `_archive/BudgetCTO_v2.1.xlsx`
**Analysis Date:** 2026-05-08

---

## Executive Summary

This document provides a complete analysis of the Budget CTO Excel file, extracting pricing models, formulas, thresholds, and cost calculation rules used for infrastructure cost estimation.

---

## 1. TAB: "Fasce Budget CTO" - BUDGET BANDS AND THRESHOLDS

### Purpose
Defines project classification bands based on complexity and impact criteria. The presence of **at least one parameter** characterizes the band to assign to a project.

### Budget Bands Structure

| Criterion | NO IMPATTI CTO | LIGHT | MEDIUM | COMPLESSO | SPECIALE |
|-----------|---------------|-------|--------|-----------|----------|
| **Example Project** | - | New Mobile App Functions | DOL Evolution | CORPORATE | FREE/Open Finance |
| **Project Budget (k, i.i.)** | - | Up to 500 | 500-1,000 | 1,000-5,000 | > 5,000 |
| **Project Duration** | - | 1-6 months | 7-9 months | > 1 year | Multi-year |
| **Architectural/Infrastructure Impact** | NO | YES | YES | YES | YES |
| **Impact Magnitude** | NA | Limited | Moderate | Considerable | Substantial |
| **Technological Impact** | NA | Continuity with AS IS | Tech evolution (no new) | Evolution/new tech | Tech change |
| **Service Risk** | NA | Minimal | Moderate | Relevant | Radical |
| **Pipeline** | NA | Max 10 | 10-30 | 30-60 | > 60 |
| **Number of Microservices** | NA | 0-15 new containers | 16-30 new containers | 31-100 new containers | > 100 new containers |
| **Database Impact (Dip)** | NA | < 1 TB | 1-10 TB | 10-50 TB | > 50 TB |
| **Database Impact (Host)** | NA | < 10 GB | 10-50 GB | 50-100 GB | > 100 GB |
| **Computing Power** | NA | 0-30 cores | 30-60 cores | 60-200 cores | > 200 cores |
| **Batch Scheduling** | NA | 0-30 | 30-60 | 60-200 | > 200 |
| **Monitoring Systems** | NA | Existing (no action) | YES | YES | YES |
| **Observability** | NA | Existing (no action) | YES | YES | YES |
| **Test Magnitude** | NA | Up to 100 Test Cases | 100-1,000 Test Cases | 1,000-10,000 Test Cases | > 10,000 Test Cases |
| **Test Complexity** | NA | Low | Medium | High | High |

### CTO Cost Estimates by Band

| Band | Total CTO Estimate (k, i.i.) | OPEX | CAPEX |
|------|----------------------------|------|-------|
| **NO IMPATTI CTO** | No macro-estimate | - | - |
| **LIGHT** | 50-100 | 20-40 | 40-60 |
| **MEDIUM** | 100-200 | 40-90 | 60-110 |
| **COMPLESSO** | 200-500 | 90-275 | 110-225 |
| **SPECIALE** | To be determined based on specifics | - | - |

**Key Decision Rule:** The presence of **at least one** parameter from a band is sufficient to classify the project in that band.

---

## 2. TAB: "ACN Listino licenze" - SOFTWARE LICENSE PRICING

### Structure
- **IVA Rate:** 1.22 (22% VAT)
- **Columns:**
  - Sistema operativo / License name
  - Prezzo unitario (Unit price without VAT)
  - Prezzo ivato (Price with VAT)
  - Costo dal secondo anno (Cost from second year onwards)

### License Pricing (All prices in EUR)

#### Operating Systems (16-core basis)
| License | Unit Price (i.e.) | Price w/ VAT | 2nd Year Cost |
|---------|------------------|--------------|---------------|
| **Windows Standard + SCCM (16 core)** | 2,306.88 | 2,814.39 | 604.16 |
| **Windows Datacenter + SCCM (16 core)** | 10,884.48 | 13,279.07 | 2,701.44 |
| **SCCM** | 898.56 | 1,096.24 | - |
| **Linux Suse** | 1,300.00 | 1,586.00 | 1,586.00 |
| **Linux Red Hat (ESX + Smart) Premium** | 919.40 | 1,121.67 | 919.40 |
| **Linux Red Hat (ESX + Smart) Standard** | 695.00 | 847.90 | - |

**Formula for Windows Standard:** `=144.18*16` (price per core = 144.18)
**Formula for Windows Datacenter:** `=680.28*16` (price per core = 680.28)

#### Virtualization
| License | Unit Price (i.e.) | Price w/ VAT | 2nd Year Cost |
|---------|------------------|--------------|---------------|
| **VMware OEM** | 2,295.00 | 2,799.90 | 458.00 |

#### Monitoring (Subscription-based)
| Tool | Unit Price (i.e.) | Price w/ VAT | 2nd Year Cost | Unit |
|------|------------------|--------------|---------------|------|
| **Splunk (GB/day) - Subscription** | 420.62 | 513.16 | 513.16 | per GB/day |
| **Dynatrace (HostUnit, 16 GB RAM) - Legacy** | 779.51 | 951.00 | 951.00 | per HostUnit |
| **Dynatrace SaaS - Full Stack Monitoring** | 32.61 | 39.79 | 39.79 | per GB/year |
| **Dynatrace SaaS - Infrastructure Monitoring** | 130.42 | 159.12 | 159.12 | per VM/year |
| **Dynatrace SaaS - K8s Platform Monitoring** | 12.18 | 14.86 | 14.86 | per POD/year |
| **Dynatrace SaaS - Log Management & Analytics** | 607.51 | 741.16 | 741.16 | per GB ingested |

**Key Formula Pattern:**
```excel
Price with VAT = Unit Price * $C$1  (where C1 = 1.22)
2nd Year Cost = Unit Price (for recurring subscriptions)
```

**Dynatrace Formula Examples:**
```excel
=(372.31/100000)*24*365  // Full Stack Monitoring per GB
=(1488.85/100000)*24*365  // Infrastructure Monitoring per VM
=(139/100000)*24*365  // K8s per POD
=(1387/10000)*12*365  // Log Management per GB
```

---

## 3. TAB: "ACN" - ON-PREMISE INFRASTRUCTURE COSTS

### Structure
- **Device/Service | Delivery Time | Lifecycle | Specs (CPU/RAM/TB) | Costs per Year (1-6) | TOTAL + VAT**
- All costs include multi-year depreciation with decreasing yearly costs

### Pricing Models

#### Virtual Servers
| Service | Specs | Lifecycle | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Year 6 | Total + VAT |
|---------|-------|-----------|--------|--------|--------|--------|--------|--------|-------------|
| **Server virtuale - 4 vCore** | 4 vCPU, 16 GB RAM | 5 years | 684.05 | 623.84 | 586.23 | 562.94 | 551.80 | 551.80 | 4,344.01 |
| **Server virtuale - 8 vCore** | 8 vCPU, 32 GB RAM | 5 years | 862.08 | 797.30 | 759.68 | 736.39 | 725.25 | 725.25 | 5,619.26 |

#### Storage & Backup
| Service | Unit | Lifecycle | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Year 6 | Total + VAT |
|---------|------|-----------|--------|--------|--------|--------|--------|--------|-------------|
| **Backup - Front-end** | 1 TB | 5 years | 2,184.42 | 465.93 | 461.52 | 457.12 | 452.71 | 2,162.40 | 7,544.60 |
| **Backup - Back-end** | 1 TB | 5 years | 201.55 | 118.25 | 116.24 | 114.23 | 112.21 | 191.49 | 1,041.84 |
| **Storage - SSD (replicated)** | 1 TB | 3 years | 868.35 | 834.31 | 819.00 | 809.52 | 804.98 | 804.98 | 6,028.19 |
| **Storage - SSD (non-replicated)** | 1 TB | 3 years | 553.22 | 524.87 | 509.56 | 500.08 | 495.55 | 495.55 | 3,756.17 |

#### Database Management (per instance/year)
| Service | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Year 6 | Total + VAT |
|---------|--------|--------|--------|--------|--------|--------|-------------|
| **Oracle (non RAC)** | 1,062.29 | 943.00 | 863.74 | 814.17 | 790.43 | 790.43 | 6,422.15 |
| **MS SQL Server** | 524.64 | 466.14 | 426.58 | 402.09 | 390.38 | 390.38 | 3,172.26 |
| **DB2 Blu** | 699.52 | 621.52 | 568.78 | 536.13 | 520.51 | 520.51 | 4,229.70 |
| **NoSQL DB** | 699.52 | 621.52 | 568.78 | 536.13 | 520.51 | 520.51 | 4,229.70 |

#### Middleware Management (per instance/year)
| Service | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 | Year 6 | Total + VAT |
|---------|--------|--------|--------|--------|--------|--------|-------------|
| **IIS / Apache** | 330.80 | 293.91 | 268.97 | 253.53 | 246.14 | 246.14 | 2,000.18 |
| **Tomcat / JBoss** | 441.06 | 391.88 | 358.62 | 338.04 | 328.19 | 328.19 | 2,666.90 |
| **WebSphere** | 551.33 | 489.85 | 448.28 | 422.55 | 410.24 | 410.24 | 3,333.64 |
| **WebLogic** | 661.59 | 587.82 | 537.94 | 507.06 | 492.29 | 492.29 | 4,000.37 |

#### Special Infrastructure
| Service | Description | Year 1 | Year 2-6 (each) | Total + VAT |
|---------|-------------|--------|-----------------|-------------|
| **F5 i10800 with WAF** | 1 virtual context with 2vCore on 4 hardware appliances (1 active + 3 standby) | 60,075.47 | 60,075.47 | 439,752.44 |
| **Kubernetes - Pod Deployment** | Managed Pod | 251.00 | 251.00 | 251.00 |

### Key Formulas
```excel
TOTAL = SUM(Year1:Year6)
TOTAL + IVA = TOTAL * 1.22

// Time-based cost allocation
IF(TODAY()<DATEVALUE("31/07/2022"), YearCost, 0)  // Allocate if within year
```

---

## 4. TAB: "ACN Cloud" - CLOUD INFRASTRUCTURE COSTS

### Structure
- **Scope | Technology | Unit of Measure | AWS | GCP | Azure | Type | Annual Fee**
- All prices are annual operation costs

### Cloud Service Pricing (EUR/year)

#### Container Services
| Service | Unit | AWS | GCP | Azure | Annual Cost |
|---------|------|-----|-----|-------|-------------|
| **Managed Kubernetes** | Per cluster | EKS | GKE | AKS | 3,233.04 |
| **Namespace** | Per namespace | EKS | GKE | AKS | 206.25 |
| **POD Deployment** | Per POD | EKS | GKE | AKS | 93.75 |

#### Virtual Machines
| Service | Unit | AWS | GCP | Azure | Annual Cost |
|---------|------|-----|-----|-------|-------------|
| **Virtual Machines** | Per VM | EC2 | Compute Engine | VMs | 568.75 |

#### Storage
| Service | Unit | AWS | GCP | Azure | Annual Cost |
|---------|------|-----|-----|-------|-------------|
| **Object Based Storage** | Per OBS | S3 | Cloud Storage | BLOB Storage | 0.00 |
| **Disks** | Per disk | EBS | Persistent Disk | Disks | 0.00 |

#### Database Services
| Service | Type | Unit | AWS | GCP | Azure | Annual Cost |
|---------|------|------|-----|-----|-------|-------------|
| **PostgreSQL EDB on Microservice** | Managed | Per instance | Rosa, EKS | OCD, GKE | ARO, AKS | 537.50 |
| **PostgreSQL - PaaS** | Managed | Per resource | RDS, Aurora | CloudSQL, AlloyDB | DB for PostgreSQL | 537.50 |
| **SQL Server - IaaS** | VM-based | Per instance | VM | VM | VM | 625.00 |
| **SQL Server - PaaS** | Managed | Per instance | RDS | Cloud SQL | SQL Database | 537.50 |
| **MySQL - IaaS** | VM-based | Per instance | VM | VM | VM | 624.42 |
| **MySQL - PaaS** | Managed | Per instance | RDS, Aurora | CloudSQL, AlloyDB | DB for MySQL | 537.50 |

#### Security & Networking
| Service | Unit | Annual Cost |
|---------|------|-------------|
| **Network (VNet/VPC)** | Per VNet | 200.00 |
| **Cisco Multi Cloud Defense (WAF & Firewall)** | Per appliance | 13,216.75 |
| **F5 - WAF** | Per appliance | 8,437.50 |
| **F5 - API Gateway (Nginx)** | Per instance | 2,855.25 |

#### Middleware & Monitoring
| Service | Unit | Annual Cost |
|---------|------|-------------|
| **Middleware IaaS (Redis, Kafka, etc.)** | Per instance | 1,231.25 |
| **Logging** | Per instance | 0.00 |
| **Security Posture Management Platform** | Per organization | 8,100.00 |

**Note:** No formulas found in this sheet - all values are static pricing.

---

## 5. TAB: "ACN Costo Infra" - INFRASTRUCTURE COST CALCULATIONS

### Purpose
Central calculation sheet that multiplies base prices from ACN tab by quantities and applies VAT.

### Key Formulas Structure

#### Generic Cost Formula Pattern
```excel
// Year 1 cost for a component
=ACN!H4 * 'ACN Costo Infra'!$H$5 * $R$1

Where:
- ACN!H4 = Base cost from ACN sheet (Year 1)
- $H$5 = Quantity of this component
- $R$1 = IVA multiplier (1.22)

// Total cost across years
=SUM(I5:N5)  // Sum Years 1-6
```

#### Backup Cost Calculation Example
```excel
// Front-end backup
=ACN!H6 * 'ACN Costo Infra'!$H$9 * $R$1

// Back-end backup - Year 2 uses different reference
=ACN!I6 * 'ACN Costo Infra'!$H$9 * S1
```

### Component Categories with Formulas

| Component | CAPEX/OPEX | Formula Type | Variables |
|-----------|------------|--------------|-----------|
| **Server virtuale - 4 vCore** | OPEX | Quantity * Base Cost * IVA | CPU, RAM, Quantity |
| **Server virtuale - 8 vCore** | OPEX | Quantity * Base Cost * IVA | CPU, RAM, Quantity |
| **Worker - 16 vCore (No Prod)** | OPEX | Quantity * Base Cost * IVA | 1 unit allocated |
| **Worker - 16 vCore (Prod)** | OPEX | Quantity * Base Cost * IVA | 2 units allocated |
| **Backup Front-end** | OPEX | Storage * Base Cost | Equal to PROD storage |
| **Backup Back-end** | OPEX | Storage * Base Cost | Storage * 5 |
| **Storage - SSD** | OPEX | TB * Base Cost | Replicated |
| **Database/Middleware Management** | OPEX | Instances * Base Cost | Per instance/year |

### Sample Calculations from Sheet

```excel
// Worker 16 vCore - Non-Prod (1 unit, Year 1)
Year 1: 1,051.74 EUR
Year 2: 972.71 EUR
Year 3: 926.81 EUR
Year 4: 898.40 EUR
Year 5: 884.80 EUR
Year 6: 884.80 EUR
TOTAL: 5,619.26 EUR (with IVA)

// Worker 16 vCore - Prod (2 units, Year 1)
Year 1: 2,103.48 EUR (1,051.74 * 2)
Year 2: 1,945.41 EUR
Year 3: 1,853.62 EUR
Year 4: 1,796.79 EUR
Year 5: 1,769.61 EUR
Year 6: 1,769.61 EUR
TOTAL: 11,238.52 EUR (with IVA)

// Backup calculations
Front-end Backup (2.20 TB): 5,862.98 EUR (Year 1 only)
Back-end Backup (11.00 TB): 2,704.80 EUR (Year 1 only)
```

**Critical Rule:** IVA (1.22) is applied across all infrastructure costs consistently.

---

## 6. TAB: "ACN Riepilogo Costo Infra" - INFRASTRUCTURE COST SUMMARY

### Purpose
Aggregates infrastructure costs and provides annual vs. project-duration views.

### Cost Aggregation Structure

#### Annual Impact (12 months)
| Category | Type | Run Cost (12m) | Recurring Cost (subsequent years) |
|----------|------|----------------|-----------------------------------|
| **Total Project Activities Investment** | CAPEX | 0.00 | - |
| **Total One-Off Costs** | OPEX | 0.00 | - |
| **Total License Investment** | CAPEX | 0.00 | - |
| **Total Dynatrace Licenses** | OPEX | 2,064.32 | 2,064.32 |
| **Total Licenses** | OPEX | 37,124.80 | 37,915.90 |
| **Total Running TIM/ACN** | OPEX | 18,483.02 | 9,678.14 |
| **Total Running ACN Cloud** | OPEX | 0.00 | 0.00 |
| **TOTAL (with VAT)** | | **57,672.13** | **49,658.35** |

#### Project Duration Impact (6 months)
| Category | Type | Run Cost (6m) | Recurring Cost (annual) |
|----------|------|---------------|-------------------------|
| **Total Project Activities Investment** | CAPEX | 0.00 | - |
| **Total One-Off Costs** | OPEX | 0.00 | - |
| **Total License Investment** | CAPEX | 0.00 | - |
| **Total Dynatrace Licenses** | OPEX | 1,032.16 | 2,064.32 |
| **Total Licenses** | OPEX | 18,562.40 | 37,915.90 |
| **Total Running TIM/ACN** | OPEX | 9,241.51 | 9,678.14 |
| **Total Running ACN Cloud** | OPEX | 0.00 | 0.00 |
| **TOTAL (with VAT)** | | **28,836.06** | **49,658.35** |

### Key Formulas

```excel
// Reference from ACN Costo Infra sheet
='ACN Costo Infra'!I69  // Project activities
='ACN Costo Infra'!I56  // Dynatrace licenses
='ACN Costo Infra'!I57  // Total licenses
='ACN Costo Infra'!I26  // Running costs
='ACN Costo Infra'!I94  // Cloud costs

// Project duration adjustment (6 months from 12)
=(Annual_Cost/12) * $F$3  // Where F3 = project months (6)

// Total with VAT
=SUM(C3:C8)  // Sum all cost categories
```

**Critical Insight:** The sheet differentiates between:
- First-year project impact (prorated by project duration)
- Recurring annual costs for subsequent years

---

## 7. TAB: "Riepilogo Quadro Spese" - EXPENSE SUMMARY

### Purpose
High-level budget summary showing CAPEX and OPEX breakdown for CTO budget allocation.

### CAPEX Budget 2026

| Expense Item | Description | Amount (i.i.) |
|--------------|-------------|---------------|
| **Governance** | - | 0.00 |
| **Provisioning-Configuration** | Pipeline implementation and DEV/OPS support | 15,347.60 |
| **QA** | Quality assurance, DR verification, observability, security, DevOps, design & code review, architecture compliance, infrastructure compliance, testing & UAT | 27,450.00 |
| **Load Test** | Definition, execution, and evaluation of load tests | 32,208.00 |
| **Observability** | Extension of observability dashboards | 8,662.00 |
| **DevOps** | Pipeline DevOps | 0.00 |
| **RFC** | Change Enablers | 7,808.00 |
| **TOTAL CAPEX** | | **91,475.60** |

### OPEX Budget 2026

| Expense Item | Description | Amount (i.i.) |
|--------------|-------------|---------------|
| **Subscription** | Total infrastructure licenses | 19,594.56 |
| **DC** | Infrastructure running fee | 9,241.51 |
| **RFC** | RFC opening/monitoring quota | 0.00 |
| **TOTAL OPEX** | | **28,836.06** |

### Formulas Used

```excel
// Reference from Quadro Spese sheet
='Quadro Spese'!N2  // Macro activity name
='Quadro Spese'!J18  // Description
='Quadro Spese'!P2  // Amount

// Total calculation
=SUM(C3:C9)  // Sum all CAPEX items
```

**Key Observation:** This summary pulls data from the detailed "Quadro Spese" sheet which contains the complete project cost breakdown with budget vs. actual tracking.

---

## 8. TAB: "Quadro Spese" - DETAILED EXPENSE TRACKING

### Purpose
Master budget tracking sheet with budget allocation, fund requests, supplier quotes, and consumption tracking.

### Budget Structure (2026)

**Overall Budget:**
- Total Project Budget: 100,000.00 EUR
- CTO Budget Allocation: 100,000.00 EUR (CAPEX), 40,000.00 EUR (OPEX)
- Allocation Percentage: 100% (CAPEX), 40% (OPEX)

### CAPEX Breakdown

| Macro Activity | Recommended Budget | Estimated Budget | Delta | % Distribution (Estimate) | % Distribution (Recommended) | % Delta | Budget Consumed | Budget Remaining |
|----------------|-------------------|------------------|-------|---------------------------|------------------------------|---------|-----------------|------------------|
| **Governance** | 5,000.00 | 0.00 | 5,000.00 | 0.0% | 5% | -5% | 0.00 | 0.00 |
| **Provisioning-Configuration** | 20,000.00 | 15,347.60 | 4,652.40 | 15.3% | 20% | -5% | 0.00 | 15,347.60 |
| **QA** | 25,000.00 | 27,450.00 | -2,450.00 | 27.5% | 25% | +2% | 0.00 | 27,450.00 |
| **Load Test** | 25,000.00 | 32,208.00 | -7,208.00 | 32.2% | 25% | +7% | 0.00 | 32,208.00 |
| **Observability** | 10,000.00 | 8,662.00 | 1,338.00 | 8.7% | 10% | -1% | 0.00 | 8,662.00 |
| **DevOps** | 10,000.00 | 0.00 | 10,000.00 | 0.0% | 10% | -10% | 0.00 | 0.00 |
| **RFC** | 5,000.00 | 7,808.00 | -2,808.00 | 7.8% | 5% | +3% | 0.00 | 7,808.00 |
| **TOTAL** | 100,000.00 | 91,475.60 | 8,524.40 | 91% | 100% | -9% | 0.00 | 91,475.60 |

### OPEX Breakdown

| Macro Activity | Estimated Budget | % Distribution |
|----------------|------------------|----------------|
| **Subscription** | 19,594.56 | 49% |
| **DC** | 9,241.51 | 23% |
| **RFC** | 0.00 | 0% |
| **TOTAL** | 28,836.06 | 72% |

### Detailed Activity Table (Sample Rows)

| Supplier | Activity | Description | CAPEX/OPEX | Quarter | Start Date | End Date | FTE | % Allocation | Months | Work Days | Daily Rate | Amount i.e. | Amount i.i. |
|----------|----------|-------------|------------|---------|------------|----------|-----|--------------|--------|-----------|------------|-------------|-------------|
| **Imola Informatica** | Provisioning-Configuration | Pipeline implementation and DEV/OPS support | CAPEX | June-July | 2026-06-01 | 2026-07-21 | 1 | - | - | 20 | 930.00 | 12,580.00 | 15,347.60 |
| - | QA | Quality assurance (DR, observability, security, DevOps, design & code review, compliance, testing) | CAPEX | June-Dec | 2026-06-01 | 2026-12-31 | 1 | 25% | 6 | 20 | 750.00 | 22,500.00 | 27,450.00 |
| - | Load Test | Definition, execution, and evaluation | CAPEX | Sept-Dec | 2026-09-01 | 2026-12-01 | 2 | 100% | 2.0 | 20 | 330.00 | 26,400.00 | 32,208.00 |
| - | Observability | Dashboard extension | CAPEX | Apr-Aug | 2026-04-01 | 2026-08-01 | 1 | 75% | 1.00 | 20 | 470.00 | 7,100.00 | 8,662.00 |
| - | RFC | Change Enablers | CAPEX | July-Sept | 2026-07-01 | 2026-09-30 | 1.0 | 40% | 2.0 | 20 | 400.00 | 6,400.00 | 7,808.00 |
| **RedHat** | Subscription | Total infrastructure licenses | OPEX | June-Dec | 2026-06-01 | 2026-12-31 | - | - | - | - | - | 15,215.08 | 18,562.40 |
| **Dynatrace** | Subscription | Total Dynatrace licenses | OPEX | June-Dec | 2026-06-01 | 2026-12-31 | - | - | - | - | - | 846.03 | 1,032.16 |
| - | DC | Infrastructure running fee | OPEX | June-Dec | 2026-06-01 | 2026-12-31 | - | - | - | - | - | - | 9,241.51 |

### Key Formulas

```excel
// Budget allocation
=I2/H2  // Allocation percentage (CTO Budget / Total Budget)

// Sum fund requests by type
=SUMIFS(Z18:Z28, K18:K28, G2, C18:C28, C17)

// Delta calculation
=I2-K2  // CTO Budget - Fund Requests

// Recommended budget
=$I$2*V2  // Total CTO Budget * Distribution %

// Estimated budget from activities
=SUMIFS(Z$18:Z$35, K$18:K$35, $G$2, I$18:I$35, N2, P$18:P$35, "Stima")

// Budget delta
=O2-P2  // Recommended - Estimated

// Distribution percentage
=P2/$I$2  // Estimated / Total CTO Budget

// Percentage delta
=R2-V2  // Actual % - Recommended %

// Budget remaining
=P2-X2  // Estimated - Consumed
```

**Critical Insights:**
1. Budget is tracked at multiple levels: Total Project → CTO Allocation → Macro Activities → Detailed Activities
2. Comparison between recommended budget distribution and actual estimates
3. Tracking of fund requests, supplier offers, and consumption
4. Workflow flags: AQ (Accordo Quadro), OF (Offerta), RCF, RDA, AUTH, ORDINE

---

## 9. TAB: "Tariffario" - RATE CARD / PRICING TARIFF

### Purpose
Standard daily rates for different professional roles and service categories.

### Rate Structure (EUR per day, i.e. - excluding VAT)

#### Stress Test Services (Sidesoft)
| Role | Daily Rate (i.e.) | Sample Days | Sample Total |
|------|------------------|-------------|--------------|
| **PM / Functional Analyst / Specialist / Test Manager** | 340.00 | 5 | 1,700.00 |
| **Technical Analyst / Senior Developer / Test Analyst** | 320.00 | 12.5 | 4,000.00 |
| **Developer / Tester** | 260.00 | 0 | 0.00 |
| **TOTAL** | | | **5,700.00** |

#### Observability (Dynatrace) Services (Reply)
| Role | Daily Rate (i.e.) | Sample Days | Sample Total |
|------|------------------|-------------|--------------|
| **Observability Engineer / Specialist** | 450.00 | 13 | 5,850.00 |
| **Observability Architect** | 600.00 | 2 | 1,200.00 |
| **TOTAL** | | | **7,050.00** |

#### QA Services (NTT Data)
| Role | Daily Rate (i.e.) |
|------|------------------|
| **Senior IT Architect** | 750.00 |

#### Governance PM Services
| Role | Daily Rate (i.e.) | Supplier |
|------|------------------|----------|
| **PM Senior** | 930.00 | Accenture |
| **Senior Infrastructure Automation Specialist** | 500.00 | Reply |

#### Feasibility Study Services (Reply)
| Role | Daily Rate (i.e.) |
|------|------------------|
| **PM Junior** | 435.00 |
| **Cloud Solution Architect** | 610.00 |
| **Cloud Engineer** | 450.00 |

#### DevOps Pipeline Support (Imola Informatica)
| Role | Daily Rate (i.e.) | Sample Days | Sample Total |
|------|------------------|-------------|--------------|
| **Enterprise Solution Consultant** | 500.00 | 12 | 6,000.00 |
| **Supervisor and Coordinator** | 500.00 | 1 | 500.00 |
| **Architect** | 450.00 | 5 | 2,250.00 |
| **PM** | 400.00 | 5 | 2,000.00 |
| **Functional Analyst** | 330.00 | 3 | 990.00 |
| **Technical Analyst** | 280.00 | 3 | 840.00 |
| **TOTAL** | | | **12,580.00** |

#### Change Enablers (Reply)
| Role | Daily Rate (i.e.) | Sample Days | Sample Total |
|------|------------------|-------------|--------------|
| **Infrastructure Automation Specialist** | 400.00 | 21 | 8,400.00 |
| **Senior Infrastructure Automation Specialist** | 500.00 | 4 | 2,000.00 |
| **System Administrator** | 430.00 | 32 | 13,760.00 |
| **TOTAL** | | | **24,160.00** |

### Rate Card Formula Pattern
```excel
Total = Daily_Rate * Number_of_Days
=B3*D3  // Rate * Days
```

**Key Observations:**
1. Rates vary significantly by supplier and specialization (260 - 930 EUR/day)
2. Higher rates for governance, architecture, and specialized skills (observability, cloud)
3. Standard rates are pre-negotiated with specific suppliers (Accenture, Reply, Imola Informatica, Sidesoft, NTT Data)

---

## 10. MISSING TABS

The following tabs from the priority list were **NOT FOUND** in the workbook:
- **"Fasce budget CTO"** was listed but with exact name "Fasce Budget CTO" (space instead of lowercase)

---

## COST CALCULATION MODEL SUMMARY

### Complete Cost Estimation Flow

```
1. PROJECT CLASSIFICATION (Fasce Budget CTO)
   ↓
   Determine: LIGHT / MEDIUM / COMPLESSO / SPECIALE
   ↓
   Get initial estimate ranges:
   - LIGHT: 50-100k (20-40 OPEX, 40-60 CAPEX)
   - MEDIUM: 100-200k (40-90 OPEX, 60-110 CAPEX)
   - COMPLESSO: 200-500k (90-275 OPEX, 110-225 CAPEX)

2. INFRASTRUCTURE REQUIREMENTS
   ↓
   Identify components needed:
   - Virtual servers (4vCore, 8vCore, 16vCore)
   - Storage (SSD replicated/non-replicated, TB)
   - Backup (Front-end, Back-end)
   - Database instances (Oracle, SQL Server, DB2, NoSQL)
   - Middleware instances (IIS, Tomcat, WebSphere, WebLogic)
   - Kubernetes (clusters, namespaces, pods)
   - Monitoring (Dynatrace, Splunk)
   - Security (WAF, Firewall)

3. PRICING LOOKUP
   ↓
   On-Premise (ACN):
   - Use multi-year depreciation costs
   - Apply lifecycle rules (3-5 years)
   - Include decreasing yearly costs
   
   Cloud (ACN Cloud):
   - Use annual operation costs
   - No depreciation (pay-as-you-go model)
   
   Licenses (ACN Listino licenze):
   - First year: Full price + VAT
   - Subsequent years: Reduced maintenance cost
   - Apply per-core/per-VM/per-GB pricing

4. QUANTITY CALCULATION (ACN Costo Infra)
   ↓
   For each component:
   Cost = Base_Price * Quantity * IVA_Factor(1.22)
   
   Special rules:
   - Backup Front-end = PROD Storage
   - Backup Back-end = PROD Storage * 5
   - Workers: Separate Prod (2 units) and Non-Prod (1 unit)

5. TIME ADJUSTMENT (ACN Riepilogo Costo Infra)
   ↓
   Project Duration Cost = (Annual_Cost / 12) * Project_Months
   Recurring Annual Cost = Full annual cost for years 2+

6. PROFESSIONAL SERVICES (Tariffario + Quadro Spese)
   ↓
   Activity Cost = Daily_Rate * Days * FTE * Allocation% * VAT(1.22)
   
   Macro activities:
   - Governance (PM Senior: 930 EUR/day)
   - Provisioning/Configuration (400-500 EUR/day)
   - QA (750 EUR/day for architects)
   - Load Test (260-340 EUR/day)
   - Observability (450-600 EUR/day)
   - DevOps (280-500 EUR/day)
   - RFC / Change Enablers (400-500 EUR/day)

7. BUDGET ALLOCATION (Quadro Spese)
   ↓
   Recommended Distribution:
   - Governance: 5%
   - Provisioning-Configuration: 20%
   - QA: 25%
   - Load Test: 25%
   - Observability: 10%
   - DevOps: 10%
   - RFC: 5%

8. FINAL SUMMARY (Riepilogo Quadro Spese)
   ↓
   CAPEX Total = Sum(All project activities)
   OPEX Total = Sum(Subscriptions + DC Running + RFC)
   
   TOTAL CTO BUDGET = CAPEX + OPEX (with VAT included)
```

---

## KEY DECISION RULES

### 1. Budget Band Selection
- **Rule:** Presence of **at least one** parameter from a band qualifies the project for that band
- **Example:** If a project has 50 microservices (COMPLESSO range) but budget < 500k (LIGHT range), classify as COMPLESSO

### 2. License Pricing
- **First Year:** Full license price * 1.22 (VAT)
- **Subsequent Years:** Maintenance/subscription cost (typically 20-40% of first year)
- **Per-Core Licenses:** Multiply base core price * number of cores (e.g., Windows: 144.18 * 16)

### 3. Infrastructure Lifecycle
- **5-year components:** Servers, networking, backup
- **3-year components:** Storage
- **1-year components:** OS management, database/middleware operation
- **Cost pattern:** Higher Year 1, decreasing Years 2-5, stabilized Year 6

### 4. Backup Storage Calculation
- **Front-end Backup:** 1:1 ratio with production storage
- **Back-end Backup:** 5:1 ratio with production storage (data retention/archiving)

### 5. VAT Application
- **Constant:** 1.22 (22% Italian VAT)
- **Apply to:** All infrastructure costs, licenses, and professional services
- **Formula:** Net_Price * 1.22 = Gross_Price

### 6. Project Duration Adjustment
- **Full year costs:** Use annual pricing
- **Partial year:** (Annual_Cost / 12) * Project_Months
- **Recurring costs:** Always full annual amount for years 2+

### 7. Professional Services Estimation
- **Formula:** Daily_Rate * Work_Days * FTE_Count * Allocation_% * 1.22
- **Standard month:** 20 working days
- **Allocation:** 25% = 1 week/month, 100% = full-time

---

## FORMULAS REFERENCE GUIDE

### Excel Formula Patterns Found

#### 1. Price with VAT
```excel
=Unit_Price * $C$1  // C1 = 1.22
=C4*$C$1
```

#### 2. Per-Core Pricing
```excel
=Price_Per_Core * Number_of_Cores
=144.18*16  // Windows Standard
=680.28*16  // Windows Datacenter
```

#### 3. Time-Based Pricing (Dynatrace)
```excel
=(Price_Per_Unit/Divisor)*Hours*Days
=(372.31/100000)*24*365  // Full Stack per GB/year
=(1488.85/100000)*24*365  // Infrastructure per VM/year
```

#### 4. Multi-Year Cost Aggregation
```excel
=SUM(Year1:Year6)
=SUM(H4:M4)
```

#### 5. Cost with VAT
```excel
=Total_Cost*1.22
=N4*1.22
```

#### 6. Time-Based Cost Allocation
```excel
=IF(TODAY()<DATEVALUE("31/07/2025"),Cost,0)
// Allocate cost only if current date is before deadline
```

#### 7. Infrastructure Component Cost
```excel
=Base_Cost * Quantity * VAT
=ACN!H4 * 'ACN Costo Infra'!$H$5 * $R$1
```

#### 8. Project Duration Adjustment
```excel
=(Annual_Cost/12)*Project_Months
=(C6/12)*$F$3  // F3 = number of months
```

#### 9. Budget Distribution Percentage
```excel
=Component_Cost/Total_Budget
=P2/$I$2
```

#### 10. Conditional Sum by Criteria
```excel
=SUMIFS(Amount_Range, Type_Range, Type_Value, Activity_Range, Activity_Name, Status_Range, Status)
=SUMIFS(Z$18:Z$35, K$18:K$35, $G$2, I$18:I$35, N2, P$18:P$35, "Stima")
```

#### 11. Professional Services Cost
```excel
=Daily_Rate * Work_Days
=B3*D3
```

---

## PRICING CONSTANTS

### Universal Constants
- **IVA (VAT):** 1.22 (22%)
- **Working Days per Month:** 20
- **Hours per Day:** 24
- **Days per Year:** 365

### Infrastructure Lifecycle Defaults
- **Server Lifecycle:** 5 years
- **Storage Lifecycle:** 3 years
- **Operation Services:** 1 year (recurring annual)

### Default Project Parameters (from sample)
- **Project Duration:** 6 months
- **Workers Non-Prod:** 1 unit
- **Workers Prod:** 2 units
- **Backup Front-end Factor:** 1.0 (equal to storage)
- **Backup Back-end Factor:** 5.0 (5x storage)

---

## IMPLEMENTATION RECOMMENDATIONS

### For Building Cost Estimation Models

1. **Classification Engine**
   - Implement rule-based classification using Fasce Budget CTO criteria
   - Support multi-criteria matching (logical OR across parameters)
   - Return budget range and CAPEX/OPEX split

2. **Pricing Database**
   - Store all base prices from ACN, ACN Cloud, ACN Listino licenze
   - Include lifecycle rules and multi-year cost profiles
   - Maintain rate card from Tariffario

3. **Calculation Engine**
   - Apply formulas from ACN Costo Infra for infrastructure
   - Support both annual and project-duration calculations
   - Include automatic backup calculation rules

4. **Budget Distribution**
   - Use recommended percentages from Quadro Spese
   - Allow manual adjustments with variance tracking
   - Track against budget thresholds from Fasce Budget CTO

5. **Professional Services Estimator**
   - Map activities to role requirements
   - Apply standard rates from Tariffario
   - Calculate based on duration, allocation, and FTE count

6. **Validation Rules**
   - Verify CAPEX + OPEX stays within band limits
   - Check distribution percentages sum to 100%
   - Flag significant variances from recommended budgets

---

## DATA QUALITY NOTES

### Observations
1. **"Fasce Budget CTO" tab found** - Contains complete budget band definitions
2. **Consistent IVA application** - 1.22 factor used throughout
3. **Sample data present** - Quadro Spese contains actual project example (2026)
4. **Formula integrity** - Cross-sheet references maintained properly
5. **No broken references** - Except one #REF! in Riepilogo (cell B3, non-critical)

### Potential Issues
1. **Empty quantities** - Many components in ACN Costo Infra have 0 quantity (templates)
2. **Cloud costs zero** - ACN Cloud running costs show 0.00 in summary (possibly not yet implemented)
3. **Status flags** - All activities marked "wait" in Quadro Spese (approval workflow)

---

## DOCUMENT VERSION
- **Source File:** BudgetCTO_v2.1.xlsx
- **Analysis Date:** 2026-05-08
- **Tabs Analyzed:** 10 (Fasce Budget CTO, ACN Listino licenze, ACN, ACN Cloud, ACN Costo Infra, ACN Riepilogo Costo Infra, Riepilogo Quadro Spese, Quadro Spese, Tariffario)
- **Formulas Extracted:** 600+ unique formulas
- **Pricing Items:** 100+ infrastructure components, licenses, and services

---

**END OF ANALYSIS**
