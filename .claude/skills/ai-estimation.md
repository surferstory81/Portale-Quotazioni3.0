# AI Estimation Skill

This document defines how AI agents are used within the
**Quotazioni Infrastrutturali** application to support economic cost estimations.

AI is intended strictly as a **decision-support tool**.
Final accountability always remains with authorized CTO administrators.

---

## Purpose

AI agents are used to:
- Generate first-pass cost estimations
- Support administrators during quotation evaluation
- Increase consistency and speed of cost assessments

AI must never act autonomously or authoritatively.

---

## Scope of AI Usage

AI support is limited to the following phases:

- Quotation evaluation (**In valutazione** state only)
- Advisory estimation of:
  - Capex components
  - Opex components
- Suggestion of cost ranges, thresholds, or reference values

AI must not be involved in:
- User-facing quotation submission
- State transitions
- Quotation completion
- Approval or rejection decisions

---

## AI Activation Model

- AI agents are invoked explicitly by backend services
- No automatic or event-driven AI execution is allowed
- Each invocation must specify:
  - Input data scope
  - Estimation context
  - Constraints and assumptions

AI execution must be deterministic and repeatable.

---

## Input Data for AI

AI agents may receive:
- Full questionnaire data submitted by the user
- Metadata related to the quotation (duration, scope, complexity)
- Predefined CTO-provided parameters and thresholds

AI must never receive:
- Personal credentials
- Authentication data
- Confidential information unrelated to estimation

---

## Output Expectations

AI output must:
- Be structured and machine-readable
- Clearly separate:
  - Capex estimations
  - Opex estimations
- Include explanation or rationale for suggested values
- Reference applied thresholds and assumptions

Each AI-generated output must be explicitly labeled as:
**“AI-Generated – Requires Human Validation”**

---

## Human Validation Requirement

- AI output is never final
- Administrators must:
  - Review AI suggestions
  - Manually confirm or override values
  - Take full responsibility for final quotation

The system must allow:
- Partial acceptance of AI suggestions
- Full override of AI-generated values

---

## Constraints & Guardrails

AI agents must operate under strict constraints:

- No modification of quotation state
- No automatic persistence of final values
- No self-triggered execution
- No learning or adaptation in production without approval
- No external AI services or models

AI behavior must remain predictable and governed.

---

## Explainability & Auditability

For every AI-assisted estimation:
- Inputs must be logged
- Outputs must be persisted
- Administrator decisions must be traceable

Audit logs must allow reconstruction of:
- What the AI suggested
- What was accepted or rejected
- Who made the final decision

---

## Error Handling

- AI failures must not block quotation workflows
- In case of AI error:
  - The administrator can continue manually
  - The error must be logged
  - Clear feedback must be provided

AI is a support feature, not a dependency.

---

## Governance Rules

- AI usage parameters are defined by the CTO area
- Thresholds and reference models are versioned
- Changes to AI behavior require controlled update
- AI outputs must never be hidden from administrators

---

## Future Evolution

The AI integration is expected to evolve gradually.

Potential future enhancements:
- Improved estimation accuracy
- Broader cost model coverage
- Advanced scenario analysis

Any evolution must preserve:
- Human validation
- Determinism
- Governance and auditability

---

## Out of Scope

- AI model training
- Autonomous decision-making
- User-facing AI explanations
- Self-learning logic in production

These aspects are explicitly excluded.

---