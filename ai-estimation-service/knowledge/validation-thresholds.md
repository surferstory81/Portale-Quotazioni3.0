# Validation Thresholds and Quality Rules

This file contains thresholds and rules for validating cost estimates.

## Confidence Scoring

### High Confidence (85-100%)
- All required information provided
- Standard technology stack
- Well-defined scope
- Similar past projects
- Clear requirements
- Minimal unknowns

### Medium Confidence (70-84%)
- Most information provided
- Some custom requirements
- Scope mostly defined
- Some uncertainties
- Standard approach with minor variations

### Low Confidence (50-69%)
- Missing key information
- New/untested technologies
- Unclear scope
- Many unknowns
- Complex integration requirements
- High technical risk

### Very Low Confidence (<50%)
- Insufficient information
- Experimental approach
- Undefined requirements
- Multiple critical unknowns
- Estimate should be rejected or revised

## Cost Validation Rules

### Total Cost Thresholds
- If total <€10k: Flag as potentially underestimated
- If total >€1M: Requires senior review
- If infrastructure cost >60% of total: Review hardware specs
- If professional services <30% of total: Review effort estimates

### Component Ratios
- Infrastructure should be 20-40% of total
- Software licenses should be 10-25% of total
- Professional services should be 35-60% of total
- Support/maintenance should be 5-15% of total (first year)

### Unit Cost Checks
- Developer day rate: €300-€900
- Infrastructure per VM: €50-€500/month
- Database license per core: €1,000-€20,000
- If outside range: Flag for review

## Technical Validation

### Infrastructure Sizing
- CPU/Memory ratio should be 1:2 to 1:4
- Storage should match expected data + 50% growth
- Network bandwidth should support 2x peak load
- Backup storage should be 1.5-2x primary storage

### Redundancy Requirements
- Production systems: Minimum 2x redundancy
- Critical systems: 3x redundancy + DR site
- Development/test: 1x acceptable

### Scalability
- Horizontal scaling preferred over vertical
- Auto-scaling for variable loads
- Load balancer required for >1 instance

## Effort Validation

### Team Composition
- 1 senior per 3-5 junior developers
- 1 architect per 10-15 developers
- 1 QA per 3-4 developers
- 1 PM per 8-12 team members

### Time Allocation
- Development: 50-60% of total time
- Testing: 20-25% of total time
- Documentation: 5-8% of total time
- Meetings/coordination: 10-15% of total time

### Velocity Checks
- Story points per developer-week: 8-15
- Lines of code per day: 50-200 (depending on complexity)
- Test cases per tester-day: 5-15

## Risk Factors

### High Risk Indicators
- New technology (not used before): +20-30% time/cost
- Legacy system integration: +20-40% time/cost
- Distributed team (>2 locations): +15-25% coordination overhead
- Regulatory compliance (first time): +25-35% time/cost
- No similar past projects: +30-50% contingency

### Red Flags
- No technical lead assigned
- No testing phase planned
- No contingency buffer
- Unrealistic timeline (<50% of industry average)
- Missing critical components (backup, monitoring, security)

## Comparison Benchmarks

### Industry Averages
- E-commerce site (basic): €50k-€150k
- CRM system: €100k-€400k
- ERP implementation: €500k-€2M+
- Mobile app (simple): €30k-€80k
- Mobile app (complex): €100k-€300k

### Time to Market
- MVP: 3-6 months
- Full product: 9-18 months
- Enterprise system: 18-36 months

## Approval Thresholds

### Auto-Approve
- Total <€25k
- Confidence >85%
- All checks passed
- Standard technology

### Manual Review Required
- Total €25k-€100k
- Confidence 70-85%
- Any validation warning

### Senior Review Required
- Total >€100k
- Confidence <70%
- Multiple red flags
- New/experimental technology

### Reject
- Confidence <50%
- Critical information missing
- Unrealistic estimates
- Cost >€500k with confidence <80%

## Quality Gates

### Estimation Quality
- All mandatory fields completed
- Reasonable effort estimates (not round numbers)
- Breakdown to component level
- Justification for high-cost items
- Risk assessment included

### Technical Quality
- Architecture diagram provided
- Technology stack specified
- Integration points identified
- Security requirements defined
- Scalability addressed

### Business Quality
- Clear success criteria
- Defined acceptance criteria
- Stakeholders identified
- Timeline realistic
- Budget aligned with business case
