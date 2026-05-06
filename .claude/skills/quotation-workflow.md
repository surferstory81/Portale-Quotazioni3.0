# Quotation Workflow Skill

This document defines the functional workflow for managing infrastructure
and IT project cost quotation requests within the
**Quotazioni Infrastrutturali** portal.

This skill represents the single source of truth for:
- Quotation lifecycle
- User interactions
- Mandatory data collection
- State transitions and permissions

---

## Purpose

The quotation workflow enables internal Business Units to submit structured
requests for economic evaluation of IT and infrastructure projects and allows
the CTO organization to manage, evaluate, and finalize those requests.

---

## Actors

### Standard User (Business Unit)
- Submits quotation requests
- Tracks request status
- Views completed quotations
- Can modify only rejected requests

### Administrator (CTO)
- Views all quotation requests
- Changes quotation states
- Performs cost evaluations
- Inserts final economic quotations

---

## Quotation Lifecycle

Each quotation request follows a defined lifecycle.

### Supported States

| State              | Description                                    |
|--------------------|------------------------------------------------|
| **Inviata**        | Request submitted by user, awaiting evaluation |
| **In valutazione** | Request taken in charge by an administrator    |
| **Respinta**       | Request rejected and returned to the user      |
| **Completata**     | Economic quotation completed and delivered     |

State transitions must be explicit, logged, and authorized.

---

## Section A – Nuova Quotazione

### Form Title
**Questionario Valutazione Economica Area CTO**

### Form Definition

All fields are **mandatory**.

```json
{
  "Questionario Valutazione Economica Area CTO": {
    "fields": [
      { "label": "Codice Project", "type": "text" },
      { "label": "Nome Progetto", "type": "text" },
      { "label": "Data Inizio Progetto", "type": "date" },
      { "label": "Data Fine Progetto", "type": "date" },
      { "label": "Durata progettuale", "type": "select",
        "options": ["1 – 6 mesi", "7 – 12 mesi", "> 1 anno", "pluriennale"] },
      { "label": "Budget Progettuale (k€, i.i.)", "type": "select",
        "options": ["Fino a 500", "500 – 1.000", "1.000 – 5.000", "> 5.000"] },
      { "label": "Impatto Architetturale/Infrastrutturale", "type": "select",
        "options": ["NO", "SI"] },
      { "label": "Cloud SaaS", "type": "checkbox" },
      { "label": "Cloud IaaS / PaaS (Landing Zone CA)", "type": "checkbox" },
      { "label": "Host (Mainframe)", "type": "checkbox" },
      { "label": "OnPremis (Dipartimentale)", "type": "checkbox" },
      { "label": "Necessità di nuove infrastrutture", "type": "checkbox" },
      { "label": "Infra su VM", "type": "checkbox" },
      { "label": "Infra a Microservizi", "type": "checkbox" },
      { "label": "Entità Impatto", "type": "select",
        "options": ["Limitato", "Moderato", "Considerevole", "Sostanziale"] },
      { "label": "Fruitore del servizio", "type": "text" },
      { "label": "Volumi servizio (n° Utenti al giorno)", "type": "number" },
      { "label": "Impatto Tecnologico", "type": "select",
        "options": ["NA", "In continuità con AS IS", "Evoluzione tecnologica", "Cambio tecnologico"] },
      { "label": "Sviluppato internamente", "type": "checkbox" },
      { "label": "Sviluppato da esterni", "type": "checkbox" },
      { "label": "Proprietà intellettuale CA del codice", "type": "checkbox" },
      { "label": "Esposizione del servizio", "type": "checkbox" },
      { "label": "Trattasi di un prodotto di mercato", "type": "checkbox" },
      { "label": "Dipendenze con servizi esternalizzati", "type": "checkbox" },
      { "label": "Integrazioni con sistemi interni", "type": "checkbox" },
      { "label": "Trattasi di un prodotto SaaS", "type": "checkbox" },
      { "label": "Trattasi di tool di monitoring / sicurezza", "type": "checkbox" },
      { "label": "Numero release previste", "type": "number" },
      { "label": "Progetto nuovo / evolutiva / CIF", "type": "select",
        "options": ["Nuovo", "Evolutiva", "CIF"] },
      { "label": "Rischio sul Servizio", "type": "select",
        "options": ["Minimo", "Moderato", "Rilevante", "Radicale"] },
      { "label": "Pipeline", "type": "select",
        "options": ["Max 10", "10-30", "30-60", "> 60"] },
      { "label": "Numero Microservizi", "type": "number" },
      { "label": "Impatto Base Dati (Dip)", "type": "checkbox" },
      { "label": "Tipo DB SQL (Oracle/PostgreSQL/MS SQL)", "type": "checkbox" },
      { "label": "Impatto Base Dati (Host/DB2)", "type": "checkbox" },
      { "label": "Spazio Storage (GB)", "type": "number" },
      { "label": "Potenza di calcolo (core)", "type": "number" },
      { "label": "N° Batch schedulazioni", "type": "number" },
      { "label": "Sistemi di monitoraggio", "type": "select",
        "options": ["NA", "Esistente (no action)", "SI"] },
      { "label": "Observability", "type": "select",
        "options": ["NA", "Esistente (no action)", "SI"] },
      { "label": "Magnitudo test (Governance test)", "type": "select",
        "options": ["Fino a 100", "100–1.000", "1.000–10.000", ">10.000"] },
      { "label": "QA", "type": "select",
        "options": ["NA", "SI", "NO"] }
    ]
  }
}
---

## Implementation Notes (aggiornato)

### Codice Project — validazione

Il campo `projectCode` ha le seguenti regole sia frontend che backend:
- **Minimo 10 caratteri, massimo 11**
- **Formato**: deve iniziare con `PRJ` (+ 7-8 alfanumerici) oppure `RPRJ` (+ 6-7 alfanumerici)
- **Regex**: `^(PRJ[A-Za-z0-9]{7,8}|RPRJ[A-Za-z0-9]{6,7})$`
- Esempi validi: `PRJ1234567` (10), `PRJ12345678` (11), `RPRJ123456` (10), `RPRJ1234567` (11)

### Fruitore del servizio — campo multiselect

Il campo `serviceConsumer` è un **multiselect** (selezione multipla) con le seguenti opzioni fisse:
- `Utenti Direzione Centrale`
- `Utenti Rete`
- `Clienti`

Lato frontend: `<select multiple>`, il valore del form è un `string[]`.
Lato backend: il valore viene inviato come stringa singola unita con `", "` prima dell'invio API (es. `"Utenti Rete, Clienti"`). Il DTO backend accetta stringa (`@IsString() @MaxLength(255)`).

### Comportamento post-submit

Dopo l'invio riuscito di una nuova quotazione, il frontend naviga automaticamente a `/dashboard/quotations/status` senza mostrare un messaggio di conferma nella pagina corrente.

### Campo numerico — invio al backend

I campi numerici (`serviceVolumesPerDay`, `expectedReleases`, `microservicesCount`, `storageGb`, `computeCores`, `scheduledBatches`) vengono convertiti esplicitamente a `Number` in `normalizePayload()` prima dell'invio. Questo è necessario perché i form Angular restituiscono stringhe anche per `type="number"`.
