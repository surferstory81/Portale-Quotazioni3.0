# Field-to-Cost Mapping

This file provides **direct mappings** from quotation form fields to infrastructure costs. Use these formulas to build bottom-up cost estimates based on specific user inputs.

**Last Updated:** 2026-05-08  
**Version:** 1.0

---

## 🏗️ Infrastructure Sizing

### 1. Microservices Architecture (`microservicesCount`)

#### Base Cost Formula
```
Per Microservice:
  - Container runtime: €150/month (2 vCPU, 4GB RAM)
  - Storage (10GB per service): €1/month
  - Network egress (estimate 20GB/month): €2/month
  
  Subtotal per service: €153/month
```

#### Orchestration Overhead
```
IF microservicesCount > 0:
  - Kubernetes control plane (managed EKS/AKS): €300/month
  - Container registry (ECR/ACR): €30/month base + €5/GB stored
  - Ingress controller: €50/month
  
  Orchestration total: €380/month (minimum)
```

#### Service Mesh (Optional)
```
IF microservicesCount > 5:
  - Service mesh (Istio/Linkerd): €150/month
  - Distributed tracing (Jaeger/Tempo): €80/month
  - Service catalog: €40/month
  
  Service mesh total: €270/month
```

#### Complete Formula
```
MONTHLY_MICROSERVICES_COST = 
  (microservicesCount × €153) +           // Base containers
  €380 +                                  // Orchestration
  (microservicesCount > 5 ? €270 : €0)    // Service mesh

CAPEX (one-time):
  - K8s cluster setup: €15,000
  - CI/CD pipeline per service: microservicesCount × €2,500
  
OPEX Year 1:
  - Monthly cost × 12
  - Monitoring per service: microservicesCount × €50/month
```

**Example:**
- Input: `microservicesCount = 8`
- Monthly: (8 × €153) + €380 + €270 = €1,874/month
- CAPEX: €15,000 + (8 × €2,500) = €35,000
- OPEX Year 1: (€1,874 × 12) + (8 × €50 × 12) = €27,288

---

### 2. Service Volume Scaling (`serviceVolumesPerDay`)

#### Scaling Tiers
```
Tier 1: 0 - 1,000 requests/day
  - Scale factor: 1.0x (single instance sufficient)
  - Caching: Not needed
  - Load balancer: Basic (€20/month)

Tier 2: 1,001 - 10,000 requests/day  
  - Scale factor: 1.5x (2-3 instances, autoscaling)
  - Caching: Redis/Memcached (€50/month, 1GB)
  - Load balancer: Application LB (€50/month)
  
Tier 3: 10,001 - 100,000 requests/day
  - Scale factor: 2.5x (3-5 instances, aggressive autoscaling)
  - Caching: Redis cluster (€200/month, 10GB)
  - Load balancer: Application LB + health checks (€80/month)
  - CDN: CloudFront/Akamai (€150/month + €0.085/GB)
  
Tier 4: 100,001 - 1,000,000 requests/day
  - Scale factor: 4.0x (5-10 instances, multi-AZ)
  - Caching: Redis cluster (€500/month, 50GB, HA)
  - Load balancer: Dedicated ALB (€150/month)
  - CDN: €500/month + €0.085/GB
  - Rate limiting/WAF: €250/month
  
Tier 5: >1,000,000 requests/day
  - Scale factor: Custom (contact architect)
  - Caching: Redis cluster (€1,500/month, 200GB, multi-region)
  - Load balancer: Multiple ALBs (€400/month)
  - CDN: €1,200/month + €0.085/GB
  - WAF + DDoS protection: €800/month
```

#### Application to Base Infrastructure
```
Base monthly cost = (compute + storage) calculated from other fields
Scaled monthly cost = Base × ScaleFactor + Caching + LoadBalancer + CDN

Example:
  Base infrastructure: €1,000/month
  serviceVolumesPerDay: 50,000 (Tier 3)
  
  Scaled cost = (€1,000 × 2.5) + €200 + €80 + €150 = €2,930/month
```

---

### 3. Database Sizing (`storageGb`, `hasDatabaseImpactDip`, `hasSqlDbType`, `hasDatabaseImpactHostDb2`)

#### Primary Database Cost (by Storage)
```
storageGb < 50:
  - RDS/Azure SQL Small (2 vCPU, 8GB RAM): €150/month
  - Backup storage (7-day retention): €5/month
  - Multi-AZ (optional): +€150/month
  
storageGb 50-500:
  - RDS/Azure SQL Medium (4 vCPU, 16GB RAM): €300/month
  - Backup storage: €15/month
  - Multi-AZ (recommended): +€300/month
  
storageGb 500-2000:
  - RDS/Azure SQL Large (8 vCPU, 32GB RAM): €600/month
  - Backup storage: €50/month
  - Multi-AZ (required): +€600/month
  
storageGb > 2000:
  - Custom database cluster: €1,500/month (base)
  - Additional storage: (storageGb - 2000) × €0.15/GB/month
  - Backup storage: €150/month
  - HA required: +€1,500/month
```

#### SQL Server Licensing (`hasSqlDbType = true`)
```
IF hasSqlDbType = true:
  - SQL Server Standard license: €350/month per vCPU
  - Example for Medium DB (4 vCPU): €1,400/month
  - Note: Includes Software Assurance
  
  OR use Azure SQL Database (license included in service):
  - No additional license cost, use RDS pricing above
```

#### Mainframe DB2 Integration (`hasDatabaseImpactHostDb2 = true`)
```
IF hasDatabaseImpactHostDb2 = true:
  CAPEX:
    - DB2 Connect Enterprise Edition: €5,000 (one-time)
    - Mainframe connectivity software: €3,000 (one-time)
    - Setup and configuration: €8,000 (professional services)
    
  OPEX:
    - Mainframe MIPS allocation (250 MIPS): €800/month
    - DB2 Connect annual support: €1,000/year (€83/month)
    - Network connectivity (dedicated line): €200/month
    - Monitoring and maintenance: €150/month
    
  Total CAPEX: €16,000
  Total OPEX: €1,233/month
```

#### DIP Integration (`hasDatabaseImpactDip = true`)
```
IF hasDatabaseImpactDip = true:
  CAPEX:
    - DIP connector license: €2,000 (one-time per environment)
    - Integration development: €12,000 (professional services)
    
  OPEX:
    - DIP runtime license: €200/month
    - Change Data Capture (CDC) service: €150/month
    - Replication bandwidth: €0.12/GB (estimate 100GB/month = €12)
    - Monitoring: €50/month
    
  Total CAPEX: €14,000
  Total OPEX: €412/month
```

#### Complete Database Cost Example
```
Input:
  - storageGb: 300
  - hasSqlDbType: false (PostgreSQL)
  - hasDatabaseImpactDip: true
  - hasDatabaseImpactHostDb2: false

Calculation:
  Base DB: €300/month (Medium RDS)
  Multi-AZ: +€300/month
  Backup: €15/month
  DIP integration: €412/month
  
  CAPEX: €14,000 (DIP setup)
  OPEX Month: €1,027/month
  OPEX Year 1: €12,324
```

---

### 4. Compute Resources (`computeCores`)

#### Per-Core Pricing
```
Base rate: €25/month per vCPU

Reserved Instance Discount:
  IF projectDuration contains "12 mesi" OR projectDuration contains "anno":
    Apply 30% discount → €17.50/month per vCPU
  
  IF projectDuration contains "24 mesi" OR projectDuration contains "2 anni":
    Apply 40% discount → €15/month per vCPU
```

#### Compute Type Modifiers
```
IF infraOnVm = true:
  Use full VM pricing: computeCores × €25/month
  
IF infraMicroservices = true:
  Use container pricing: computeCores × €20/month (10% container efficiency)
  
IF scheduledBatches > 0:
  Use spot/preemptible for batch: computeCores × €10/month (60% discount)
```

#### Complete Formula
```
MONTHLY_COMPUTE_COST = computeCores × BasRate × ReservedDiscount × InfraTypeModifier

Example 1 (VMs, 12-month project):
  computeCores: 16
  projectDuration: "12 mesi"
  infraOnVm: true
  
  Cost = 16 × €25 × 0.7 × 1.0 = €280/month

Example 2 (Containers, 6-month project):
  computeCores: 16
  projectDuration: "6 mesi"
  infraMicroservices: true
  
  Cost = 16 × €25 × 1.0 × 0.9 = €360/month
```

---

### 5. Storage (`storageGb`)

#### Storage Type Pricing
```
Block Storage (for VMs, persistent volumes):
  - Standard SSD: €0.12/GB/month
  - High-performance SSD: €0.20/GB/month
  - Use Standard unless serviceRisk = "Alto"
  
Object Storage (for backups, static assets):
  - Standard tier: €0.023/GB/month
  - Infrequent access: €0.012/GB/month
  
Recommendation:
  - 70% of storageGb → Block Storage
  - 30% of storageGb → Object Storage (backups)
```

#### Complete Storage Cost
```
MONTHLY_STORAGE_COST = 
  (storageGb × 0.7 × €0.12) +      // Block storage
  (storageGb × 0.3 × €0.023)       // Object storage

Example:
  storageGb: 500
  Block: 500 × 0.7 × €0.12 = €42/month
  Object: 500 × 0.3 × €0.023 = €3.45/month
  Total: €45.45/month
```

---

### 6. Batch Processing (`scheduledBatches`)

#### Per-Batch Cost Model
```
Small Batch:
  - Duration: <1 hour
  - Data processed: <10GB
  - Compute: 2 vCPU × 1 hour × €0.05/vCPU/hour = €0.10 per run
  - Storage: 10GB × €0.02/GB/month = €0.20/month
  - Monthly cost (30 runs): €3 + €0.20 = €3.20

Medium Batch:
  - Duration: 1-4 hours
  - Data processed: 10-100GB
  - Compute: 4 vCPU × 3 hours × €0.05/vCPU/hour = €0.60 per run
  - Storage: 50GB × €0.02/GB/month = €1/month
  - Monthly cost (30 runs): €18 + €1 = €19

Large Batch:
  - Duration: >4 hours
  - Data processed: >100GB
  - Compute: 8 vCPU × 8 hours × €0.05/vCPU/hour = €3.20 per run
  - Storage: 200GB × €0.02/GB/month = €4/month
  - Monthly cost (30 runs): €96 + €4 = €100
```

#### Batch Infrastructure
```
IF scheduledBatches > 0:
  - Batch scheduler service (AWS Batch/Azure Batch): €20/month
  - Job queue and orchestration: €30/month
  - Error handling and retry logic: €15/month
  - Monitoring and alerting: €25/month
  
  Base batch infrastructure: €90/month
```

#### Sizing Estimation Heuristic
```
IF scheduledBatches <= 5:
  Assume "Small Batch"
  Monthly cost = €90 + (scheduledBatches × €3.20)
  
IF scheduledBatches 6-15:
  Assume "Medium Batch"
  Monthly cost = €90 + (scheduledBatches × €19)
  
IF scheduledBatches > 15:
  Assume "Large Batch"
  Monthly cost = €90 + (scheduledBatches × €100)
```

**Example:**
- Input: `scheduledBatches = 10`
- Tier: Medium Batch
- Cost: €90 + (10 × €19) = €280/month

---

## 🌐 Network & Connectivity

### 7. Load Balancing & Traffic

#### Based on `serviceVolumesPerDay` and `microservicesCount`
```
Basic Load Balancer:
  - Fixed cost: €20/month
  - Use when: serviceVolumesPerDay < 10,000 AND microservicesCount <= 3
  
Application Load Balancer:
  - Fixed cost: €50/month
  - LCU (Load Balancer Capacity Units): €0.008/hour
  - Estimate: serviceVolumesPerDay × 0.00001 LCUs
  - Use when: serviceVolumesPerDay > 10,000 OR microservicesCount > 3
  
Network Load Balancer (high-throughput):
  - Fixed cost: €70/month
  - NLCU: €0.006/hour
  - Use when: serviceVolumesPerDay > 500,000
```

### 8. Data Transfer Costs

#### Estimate Based on Volume
```
Inbound data (internet → cloud): FREE

Outbound data (cloud → internet):
  - First 100GB/month: €0.09/GB
  - Next 900GB/month (up to 1TB): €0.085/GB
  - Next 9TB/month (up to 10TB): €0.07/GB
  - Over 10TB/month: €0.05/GB

Inter-region data transfer:
  - €0.02/GB between regions (same provider)
  
CDN data transfer:
  - CloudFront/Azure CDN: €0.085/GB (first 10TB)
```

#### Estimation Heuristic
```
Assume data transfer = serviceVolumesPerDay × avgResponseSize × 30 days

avgResponseSize estimates:
  - API endpoints: 50KB
  - Web pages: 500KB
  - File downloads: 5MB
  
Example (API service):
  serviceVolumesPerDay: 50,000
  avgResponseSize: 50KB
  Monthly data: 50,000 × 50KB × 30 = 75GB
  Cost: 75 × €0.09 = €6.75/month
```

---

## 🔐 Security & Monitoring

### 9. Service Exposure (`serviceExposure = true`)

#### Public-Facing Service Costs
```
IF serviceExposure = true:
  WAF (Web Application Firewall):
    - Base: €50/month
    - Per million requests: €0.60
    - Estimate: (serviceVolumesPerDay × 30 / 1,000,000) × €0.60
    
  DDoS Protection:
    - Basic (AWS Shield Standard): FREE
    - Advanced (AWS Shield Advanced): €3,000/month
    - Recommendation: Use Advanced only if serviceRisk = "Alto"
    
  SSL/TLS Certificate:
    - AWS Certificate Manager: FREE
    - Commercial certificate: €500/year (€42/month)
    
  API Gateway (if REST API):
    - €3.50 per million requests
    - WebSocket API: €1 per million messages
```

### 10. Monitoring & Observability (`monitoringSystems`, `observability`)

#### Monitoring Stack Costs
```
Basic Monitoring (CloudWatch/Azure Monitor):
  - Metrics: €0.30 per metric/month (estimate 50 metrics)
  - Logs: €0.50/GB ingested (estimate 10GB/month)
  - Alarms: €0.10 per alarm (estimate 20 alarms)
  - Dashboards: €3/month per dashboard (estimate 5 dashboards)
  
  Total Basic: €15 + €5 + €2 + €15 = €37/month

Advanced APM (Dynatrace, Datadog, New Relic):
  - Per host/container: €50-150/month
  - Calculate: microservicesCount × €100/month (average)
  - Includes: traces, logs, metrics, profiling
  
Advanced Observability Stack (ELK, Prometheus, Grafana):
  CAPEX:
    - Setup and configuration: €20,000
    - 3 years TCO: €60,000
  OPEX:
    - Infrastructure (ES cluster): €400/month
    - Maintenance: €200/month
  
  Total OPEX: €600/month
```

#### Recommendation Logic
```
IF monitoringSystems = "Nessuno":
  Use Basic Monitoring: €37/month
  
IF monitoringSystems = "CloudWatch" OR monitoringSystems = "Azure Monitor":
  Use Basic Monitoring: €37/month
  
IF monitoringSystems contains "Dynatrace" OR "Datadog" OR "New Relic":
  Use Advanced APM: microservicesCount × €100/month
  
IF observability = "Advanced" OR observability = "Full Stack":
  Use Advanced Observability Stack: €600/month
```

---

## 🧪 Testing & Quality Assurance

### 11. Test Magnitude (`testMagnitude`)

#### Testing Effort Multipliers
```
testMagnitude = "Bassa":
  - Unit testing: 10% of development time
  - Integration testing: 5% of development time
  - No dedicated QA resource
  - Test environment: 50% of production size
  
testMagnitude = "Media":
  - Unit testing: 15% of development time
  - Integration testing: 10% of development time
  - Manual testing: 5% of development time
  - QA resource: 0.3 FTE
  - Test environment: 75% of production size
  
testMagnitude = "Alta":
  - Unit testing: 20% of development time
  - Integration testing: 15% of development time
  - Manual testing: 10% of development time
  - Performance testing: 5% of development time
  - QA resource: 0.5 FTE
  - Test environment: 100% of production size (full replica)
```

#### Infrastructure Cost for Testing
```
Test Environment Cost = Production Infrastructure × SizeMultiplier

Example:
  Production OPEX: €2,000/month
  testMagnitude: "Alta"
  
  Test environment: €2,000 × 1.0 = €2,000/month
  Plus QA tools: €200/month (JMeter, Selenium Grid)
  
  Total testing infrastructure: €2,200/month
```

### 12. QA Level (`qa`)

#### QA Resource Costs
```
qa = "Nessuno":
  - No dedicated QA: €0
  - Developers do basic testing
  - Risk: +25% for post-launch defects
  
qa = "Base":
  - Junior QA Engineer: 0.3 FTE × €350/day
  - Manual testing focus
  - Test automation: None
  - Cost: 0.3 × €350 × 20 days/month = €2,100/month
  
qa = "Intermedio":
  - QA Engineer: 0.5 FTE × €450/day
  - Manual + automated testing
  - Test automation framework: €5,000 (CAPEX)
  - Cost: 0.5 × €450 × 20 days/month = €4,500/month
  
qa = "Avanzato":
  - Senior QA Engineer: 0.5 FTE × €600/day
  - QA Lead: 0.3 FTE × €700/day
  - Full test automation
  - Performance testing
  - Test automation framework: €15,000 (CAPEX)
  - Cost: (0.5 × €600 + 0.3 × €700) × 20 days = €10,200/month
```

---

## 🏢 Infrastructure Type Specific Costs

### 13. Cloud SaaS (`cloudSaas = true`)

```
IF cloudSaas = true:
  Reduce traditional infrastructure by 60%
  Add SaaS platform costs:
    - API Gateway: €50/month + €3.50 per million requests
    - Serverless functions: €0.20 per million requests
    - Managed services premium: +15% on compute/storage
    
  Development efficiency: -20% time (faster iteration)
```

### 14. On-Premise Departmental (`onPremiseDipartimentale = true`)

```
IF onPremiseDipartimentale = true:
  Hardware CAPEX (instead of OPEX):
    - Physical servers: €5,000-15,000 per server
    - Storage (SAN): storageGb × €0.40/GB (one-time)
    - Network equipment: €8,000 (switches, firewalls)
    - UPS and cooling: €6,000
    
  Annual OPEX:
    - Maintenance: 18% of hardware cost
    - Power and cooling: €200/month per rack unit
    - Physical security: €150/month
    - On-site support: 0.2 FTE × €400/day × 20 days = €1,600/month
    
  Server Sizing:
    - Each physical server: 32 vCPU, 256GB RAM, 2TB storage
    - Servers needed: computeCores / 32 (round up)
```

### 15. Mainframe (`hostMainframe = true`)

```
IF hostMainframe = true:
  CAPEX:
    - Mainframe connectivity software: €8,000
    - Security certificates and setup: €3,000
    - Integration development: €25,000
    
  OPEX:
    - MIPS allocation (250 MIPS base): €800/month
    - Mainframe network line (dedicated): €300/month
    - Specialized mainframe developer: +€100/day premium on standard rate
    - RACF/security administration: €150/month
    
  Total CAPEX: €36,000
  Total OPEX: €1,250/month
  
  Professional Services Impact:
    - Add 30% to development time (mainframe integration complexity)
```

---

## 📊 Quick Reference: Field Priority Matrix

| Field | Impact on Cost | Complexity | Data Quality Required |
|-------|---------------|------------|----------------------|
| microservicesCount | 🔴 Critical | Medium | Exact count |
| serviceVolumesPerDay | 🔴 Critical | High | Peak load estimate |
| computeCores | 🔴 Critical | Low | Total cores needed |
| storageGb | 🟡 High | Low | Total storage |
| scheduledBatches | 🟡 High | Medium | Number of jobs |
| hasDatabaseImpactDip | 🟡 High | Low | Boolean |
| hasDatabaseImpactHostDb2 | 🔴 Critical | High | Boolean |
| hostMainframe | 🔴 Critical | High | Boolean |
| testMagnitude | 🟡 High | Medium | Enum |
| qa | 🟡 High | Medium | Enum |

---

## 💡 Usage Instructions for AI Agent

When generating an estimate:

1. **Start with base infrastructure:**
   - Calculate compute cost from `computeCores`
   - Calculate storage cost from `storageGb`
   - Calculate database cost from `storageGb` + DB flags

2. **Apply scaling factors:**
   - Use `serviceVolumesPerDay` to determine scaling tier
   - Multiply base infrastructure by scaling factor
   - Add caching, load balancing, CDN based on tier

3. **Add microservices overhead:**
   - If `microservicesCount > 0`, add orchestration costs
   - Calculate per-service costs
   - Add service mesh if count > 5

4. **Add integration costs:**
   - Check mainframe flags → add mainframe costs
   - Check DIP flag → add DIP costs
   - Check database flags → add specific DB costs

5. **Add operational costs:**
   - Monitoring based on `monitoringSystems` and `observability`
   - Testing infrastructure based on `testMagnitude`
   - QA resources based on `qa` level

6. **Document assumptions:**
   - State which tier/formula was used for each component
   - Explain any estimates (e.g., "assumed 50KB average response size")
   - Flag any missing data ("storageGb not provided, estimated 200GB")

---

**Version History:**
- v1.0 (2026-05-08): Initial version with all 42 form fields mapped
