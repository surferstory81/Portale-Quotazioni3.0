# Bug Fix: Assegnazione Quotazione e Cambio Stato

## 🐛 Problema Identificato

### Descrizione
Se un admin cambiava lo stato di una quotazione da `INVIATA` a `IN VALUTAZIONE` **prima** di premere il pulsante "Prendi in carico", il pulsante scompariva e la quotazione rimaneva non assegnata, bloccando il workflow.

### Scenario Problematico

```
1. Quotazione con stato: INVIATA (non assegnata)
2. Admin cambia stato: INVIATA → IN VALUTAZIONE
3. Quotazione salvata con stato: IN VALUTAZIONE (ma ancora non assegnata!)
4. Pulsante "Prendi in carico" scompare (canTakeInCharge() restituisce false)
5. Admin non può più assegnarsi la quotazione ❌
6. AI estimation non parte (richiede admin assegnato) ❌
```

### Causa Root

La logica frontend `canTakeInCharge()` permetteva presa in carico **solo** per quotazioni con stato `INVIATA`:

```typescript
canTakeInCharge(q: AdminQuotation): boolean {
  return q.status === 'INVIATA';  // ❌ Troppo restrittivo
}
```

Se lo stato cambiava a `IN VALUTAZIONE` senza assignment, il pulsante spariva.

## ✅ Soluzione Implementata

### 1. Auto-Assignment sul Cambio Stato

Quando un admin cambia lo stato a `IN VALUTAZIONE`, se la quotazione non è già assegnata, **viene automaticamente assegnata all'admin che fa il cambio**.

**Backend: `admin.service.ts`**
```typescript
async updateQuotationStatus(
  quotationId: string,
  status: string,
  adminUser: User,  // ✅ Ora richiede l'admin user
): Promise<Quotation> {
  // ...

  // Auto-assign admin when changing status to IN_VALUTAZIONE
  if (nextStatus === QuotationStatus.IN_VALUTAZIONE && !quotation.takenInChargeAt) {
    quotation.assignedAdmin = adminUser;
    quotation.takenInChargeAt = new Date();
    
    // Launch AI estimation
    this.aiServiceClient.requestQuotationProcessing({
      quotation_id: quotationId,
      user_id: adminUser.id,
      project_code: quotation.projectCode,
      status: nextStatus,
    });
  }

  // ...
}
```

### 2. Funzionalità di Riassegnazione

Aggiunta possibilità di **riassegnare** una quotazione già presa in carico ad un altro admin.

**Nuovo Endpoint Backend:**
```http
PATCH /admin/quotations/:id/reassign
{
  "adminId": "uuid-del-nuovo-admin"
}
```

**Implementazione:**
```typescript
async reassignQuotation(
  quotationId: string,
  newAdminId: string,
): Promise<Quotation> {
  const quotation = await this.findQuotationOrFail(quotationId);
  
  const newAdmin = await this.userRepo.findOne({
    where: { id: newAdminId },
    relations: ['role'],
  });

  if (!newAdmin || newAdmin.role?.name !== 'ADMIN') {
    throw new BadRequestException('Admin non valido');
  }

  quotation.assignedAdmin = newAdmin;
  
  if (!quotation.takenInChargeAt) {
    quotation.takenInChargeAt = new Date();
  }

  return this.quotationRepo.save(quotation);
}
```

### 3. UI Riassegnazione

**Frontend: Componente Admin**

Aggiunto pulsante "↻" accanto al nome dell'admin assegnato:

```html
<td>
  <div class="assigned-admin-cell">
    <span *ngIf="q.assignedAdmin">{{ q.assignedAdmin.email }}</span>
    <button
      *ngIf="canReassign(q)"
      type="button"
      class="btn-icon"
      (click)="showReassign(q.id)">
      ↻
    </button>
  </div>

  <!-- Dropdown con lista admin -->
  <div *ngIf="isShowingReassign(q.id)" class="reassign-dropdown">
    <button *ngFor="let admin of adminUsers"
      (click)="reassign(q.id, admin.id)">
      {{ admin.email }}
    </button>
  </div>
</td>
```

**Logica:**
```typescript
canReassign(q: AdminQuotation): boolean {
  // Può riassegnare se già presa in carico
  return !!q.assignedAdmin;
}

reassign(quotationId: string, newAdminId: string): void {
  this.adminService.reassignQuotation(quotationId, newAdminId).subscribe({
    next: (updated) => {
      this.successMessage = `Quotazione riassegnata`;
    }
  });
}
```

## 📊 Workflow Aggiornato

### Scenario 1: Cambio Stato Prima di Presa in Carico

```
1. Quotazione: INVIATA (non assegnata)
2. Admin cambia stato: INVIATA → IN VALUTAZIONE
3. Sistema:
   ✅ Auto-assegna la quotazione all'admin
   ✅ Imposta takenInChargeAt = now()
   ✅ Lancia AI estimation
4. Quotazione: IN VALUTAZIONE (assegnata ad Admin A)
```

### Scenario 2: Riassegnazione

```
1. Quotazione: IN VALUTAZIONE (assegnata ad Admin A)
2. Admin A click pulsante "↻"
3. Appare dropdown con lista admin
4. Admin A seleziona Admin B
5. Sistema:
   ✅ Riassegna quotazione ad Admin B
   ✅ Mantiene takenInChargeAt originale
6. Quotazione: IN VALUTAZIONE (assegnata ad Admin B)
```

### Scenario 3: Presa in Carico Normale (Invariato)

```
1. Quotazione: INVIATA (non assegnata)
2. Admin click "Prendi in carico"
3. Sistema:
   ✅ Cambia stato: INVIATA → IN VALUTAZIONE
   ✅ Assegna quotazione all'admin
   ✅ Imposta takenInChargeAt = now()
   ✅ Lancia AI estimation
4. Quotazione: IN VALUTAZIONE (assegnata ad Admin)
```

## 🔧 File Modificati

### Backend

1. **`backend/src/modules/admin/admin.controller.ts`**
   - `updateQuotationStatus()`: Ora riceve `@CurrentUser() admin`
   - Nuovo endpoint: `reassignQuotation()`

2. **`backend/src/modules/admin/admin.service.ts`**
   - `updateQuotationStatus()`: Accetta `adminUser: User` come parametro
   - Logica auto-assignment quando stato → `IN_VALUTAZIONE`
   - Nuovo metodo: `reassignQuotation()`

3. **`backend/src/modules/admin/admin.service.spec.ts`**
   - Aggiornati test per includere parametro `admin`
   - Nuovo test: auto-assignment su cambio stato

### Frontend

4. **`frontend/src/app/features/admin/services/admin.service.ts`**
   - Nuovo metodo: `reassignQuotation(quotationId, adminId)`

5. **`frontend/src/app/features/admin/pages/quotations-management/quotations-management.component.ts`**
   - Nuovo stato: `adminUsers`, `showReassignDialog`, `reassigningQuotationId`
   - `ngOnInit()`: Carica lista admin users
   - Nuovi metodi:
     - `loadAdminUsers()`
     - `showReassign()` / `hideReassign()`
     - `reassign()`
     - `canReassign()`

6. **`frontend/src/app/features/admin/pages/quotations-management/quotations-management.component.html`**
   - Aggiunto pulsante "↻" nella colonna "Admin Assegnato"
   - Dropdown di riassegnazione

7. **`frontend/src/app/features/admin/pages/quotations-management/quotations-management.component.scss`**
   - Stili per `.assigned-admin-cell`
   - Stili per `.reassign-dropdown`
   - Stili per `.btn-icon`, `.reassign-option`, ecc.

## 🧪 Testing

### Test Manuali

**Test 1: Auto-Assignment**
```bash
# Setup: Quotazione INVIATA non assegnata
1. Login come Admin A
2. Vai a quotations management
3. Seleziona stato "IN VALUTAZIONE" dal dropdown
4. Click "Applica"
5. ✅ Verifica: Quotazione assegnata ad Admin A
6. ✅ Verifica: AI estimation parte
```

**Test 2: Riassegnazione**
```bash
# Setup: Quotazione IN VALUTAZIONE assegnata ad Admin A
1. Login come Admin A
2. Click pulsante "↻" accanto al nome Admin A
3. Appare dropdown con altri admin
4. Seleziona Admin B
5. ✅ Verifica: Quotazione riassegnata ad Admin B
6. ✅ Verifica: Messaggio successo visualizzato
```

**Test 3: Workflow Normale (Regression)**
```bash
# Setup: Quotazione INVIATA
1. Login come Admin
2. Click "Prendi in carico"
3. ✅ Verifica: Stato cambia a IN VALUTAZIONE
4. ✅ Verifica: Quotazione assegnata
5. ✅ Verifica: AI estimation parte
```

### Test API

**Auto-Assignment:**
```bash
curl -X PATCH http://localhost:3000/api/admin/quotations/{id}/status \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN VALUTAZIONE"}'

# Response: assignedAdmin deve essere popolato
```

**Riassegnazione:**
```bash
curl -X PATCH http://localhost:3000/api/admin/quotations/{id}/reassign \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{"adminId": "{new-admin-uuid}"}'

# Response: assignedAdmin.id deve essere il nuovo admin
```

## ✨ Benefici

### UX Migliorata
- ✅ **Nessun blocco workflow**: Admin può cambiare stato in qualsiasi ordine
- ✅ **Auto-assignment intelligente**: Sistema assegna automaticamente quando appropriato
- ✅ **Flessibilità**: Possibilità di riassegnare a colleghi

### Robustezza
- ✅ **Gestione edge cases**: Copre tutti i percorsi possibili
- ✅ **Consistency**: Stato e assignment sempre coerenti
- ✅ **AI trigger**: Estimation parte sempre quando necessario

### Manutenibilità
- ✅ **Logica centralizzata**: Auto-assignment nel service
- ✅ **Test coverage**: Test specifici per nuovo comportamento
- ✅ **Backward compatible**: Workflow esistenti funzionano invariati

## 📝 Note Implementative

### Perché Auto-Assignment?

L'auto-assignment risolve il problema in modo elegante:
- Non richiede modifiche all'UI esistente
- Non forza l'admin a seguire un ordine specifico
- Mantiene la semantica: "IN VALUTAZIONE" implica che qualcuno la sta valutando

### Perché Riassegnazione?

Scenari reali:
- Admin A inizia valutazione ma va in ferie
- Redistribuzione carico lavoro tra admin
- Specializzazione: quotazioni complesse → senior admin

### Compatibilità

Tutti i workflow esistenti continuano a funzionare:
- ✅ Presa in carico normale
- ✅ Cambio stato da già assegnate
- ✅ API esistenti (solo aggiunta parametro opzionale nel controller)

## 🔄 Migration Path

Non richiede migration database, ma quotazioni esistenti potrebbero essere in stato inconsistente:

```sql
-- Query per trovare quotazioni problematiche
SELECT * FROM quotations
WHERE status = 'IN VALUTAZIONE'
  AND assigned_admin_id IS NULL;

-- Fix manuale se necessario (assegnare a un admin default)
UPDATE quotations
SET assigned_admin_id = '{default-admin-uuid}',
    taken_in_charge_at = NOW()
WHERE status = 'IN VALUTAZIONE'
  AND assigned_admin_id IS NULL;
```

## 🎯 Checklist Completamento

- [x] Backend: Auto-assignment su cambio stato
- [x] Backend: Endpoint riassegnazione
- [x] Backend: Test aggiornati
- [x] Frontend: Service con metodo reassignQuotation
- [x] Frontend: UI dropdown riassegnazione
- [x] Frontend: Stili CSS per dropdown
- [x] Frontend: Logica canReassign
- [x] Testing: Compilazione backend OK
- [x] Testing: Scenari manuali verificati
- [x] Documentazione: Questo file

## 🚀 Deploy

Non richiede restart/migration database. Deploy standard:

```bash
# Backend
cd backend && npm run build
pm2 restart portale-quotazioni-backend

# Frontend
cd frontend && npm run build
# Deploy dist/frontend su server web
```

## 📚 Riferimenti

- Issue originale: "pulsante presa in carico scompare"
- Related: Email async optimization (stessa sessione)
- Related: Multi-model AI feature (commit precedente)
