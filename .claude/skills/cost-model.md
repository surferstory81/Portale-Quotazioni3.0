continuo a non vedere # Cost Model Skill

This document defines the logical and structural cost model used for
economic quotations in the **Quotazioni Infrastrutturali** application.

The cost model provides a standardized framework for representing,
estimating, and validating infrastructure and IT project costs.

It is designed to support both manual evaluations and AI-assisted estimations
under strict governance rules.

---

## Purpose

The cost model aims to:

- Standardize cost representation across projects
- Separate logical cost structure from numeric values
- Ensure consistency between manual and AI-assisted estimations
- Enable traceability and auditability of economic evaluations

This model defines **what types of costs exist**, not their monetary values.

---

## Cost Structure Overview

All quotation costs are categorized into two macro-areas:

- **Capex (Capital Expenditure)**
- **Opex (Operational Expenditure)**

Each quotation may contain multiple cost items in each category.

---

## Capex

Capex includes all **one-time or investment-related costs** required
to enable the project.

Typical Capex categories may include:

- Infrastructure provisioning
- Platform setup
- Initial licenses or subscriptions (if capitalized)
- Architecture and environment setup
- Initial development or setup effort (where applicable)

Capex items are:

- Project-specific
- Non-recurring
- Explicitly justified

---

## Opex

Opex includes all **recurring or operational costs** required to
run and maintain the solution over time.

Typical Opex categories may include:

- Hosting and compute usage
- Storage and data management
- Monitoring and observability
- Maintenance and support
- Licensing fees (if operational)
- Operational effort

Opex items must specify:

- Recurrence model (e.g. monthly, yearly)
- Duration assumptions

---

## Cost Item Definition

Each cost item must include at minimum:

- Cost category (Capex / Opex)
- Cost type (e.g. infrastructure, license, service)
- Description
- Quantity or scale driver
- Unit of measure
- Estimated amount
- Assumptions or notes (optional but recommended)

All cost items must be explicitly reviewable by administrators.

---

## Drivers & Parameters

Cost estimations may depend on drivers extracted from the quotation questionnaire, such as:

- Project duration
- Number of microservices
- Compute capacity
- Storage volume
- User volumes
- Risk level
- Architectural impact

Drivers must be:

- Explicit
- Deterministic
- Derived from validated input data

No implicit assumptions are allowed.

---

## Thresholds & Reference Values

Thresholds and reference values may be used to:

- Guide estimations
- Suggest reasonable cost ranges
- Highlight potential outliers

Important principles:

- Thresholds are provided and owned by the CTO area
- Thresholds are versioned
- Thresholds are advisory, not binding
- Exceeding a threshold must be explainable

Threshold values themselves are intentionally **not defined in this document**.

---

## Role of AI in the Cost Model

AI agents may:
- Map questionnaire inputs to cost drivers
- Suggest cost items and ranges
- Highlight missing or inconsistent data
- Apply CTO-defined thresholds

AI agents must not:
- Invent new cost categories
- Apply thresholds not explicitly defined
- Persist final values without validation

AI output must always reference the cost model structure defined here.

---

## Validation Rules

- Every quotation must include at least one cost item
- Capex and Opex must be explicitly separated
- Zero-cost items must be justified
- All assumptions must be visible to administrators

Backend services must enforce:

- Structural correctness
- Mandatory fields
- Consistency between drivers and cost items

---

## Versioning & Evolution

The cost model is expected to evolve.

Rules:

- Structural changes must be versioned
- Existing quotations must remain interpretable
- Changes must be backward compatible where possible
- Model evolution must be documented

---

## Governance Principles

- The cost model is owned by the CTO area
- Changes must follow controlled approval
- The model must remain readable and explainable to non-technical stakeholders
- Numeric values and thresholds are externalized from the model

---

## Out of Scope

- Actual monetary values
- Financial approval rules
- Budget authorization logic
- Accounting or amortization treatment

These aspects are handled by external processes.

---