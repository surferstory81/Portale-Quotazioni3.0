# Architecture Overview – Quotazioni Infrastrutturali

This document describes the high-level architecture of the
**Quotazioni Infrastrutturali** application.

The architecture is designed to support a corporate, internal-use system
with strong governance requirements, scalability, auditability, and
controlled AI integration.

---

## Architectural Goals

- Provide a scalable and maintainable system for IT cost quotations
- Enforce strict governance on financial and AI-generated data
- Support gradual evolution from manual to AI-assisted estimations
- Align with company standards for security, deployment, and operations
- Ensure auditability and traceability of all actions

---

## High-Level Architecture

The system follows a **layered, microservices-based architecture**
deployed on a Kubernetes / OpenShift cluster.

