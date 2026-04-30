/**
 * E2E Admin — richiede backend attivo + utente ADMIN verificato.
 * Avviare con: npm run start:dev
 * Eseguire con: npm run test:e2e
 *
 * Variabili d'ambiente:
 *   E2E_BASE_URL          default: http://localhost:3000
 *   E2E_ADMIN_EMAIL       default: admin@quotazioni.local
 *   E2E_ADMIN_PASSWORD    default: Admin@2024!
 *   E2E_USER_EMAIL        utente standard per test di autorizzazione
 *   E2E_USER_PASSWORD
 */
import * as request from 'supertest';

const BASE         = process.env.E2E_BASE_URL       || 'http://localhost:3000';
const ADMIN_EMAIL  = process.env.E2E_ADMIN_EMAIL    || 'admin@quotazioni.local';
const ADMIN_PASS   = process.env.E2E_ADMIN_PASSWORD || 'Admin@2024!';
const USER_EMAIL   = process.env.E2E_USER_EMAIL     || 'testuser@example.com';
const USER_PASS    = process.env.E2E_USER_PASSWORD  || 'Password1!';

async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(BASE).post('/auth/login').send({ email, password });
  return res.body.accessToken ?? '';
}

const quotationPayload = () => ({
  projectCode: 'PRJ1234567',
  projectName: 'Admin E2E Test',
  projectStartDate: '2026-01-01',
  projectEndDate: '2026-12-31',
  projectDuration: '> 1 anno',
  projectBudget: '1.000 – 5.000',
  architecturalImpact: 'SI',
  cloudSaas: false, cloudIaasPaasLandingZoneCa: true, hostMainframe: false,
  onPremiseDipartimentale: false, needNewInfrastructure: false,
  infraOnVm: true, infraMicroservices: false,
  impactEntity: 'Moderato',
  serviceConsumer: 'Utenti Direzione Centrale',
  serviceVolumesPerDay: 100,
  technologicalImpact: 'NA',
  developedInternally: true, developedByExternalVendors: false,
  hasCaIntellectualProperty: true, serviceExposure: false,
  marketProduct: false, dependenciesWithExternalServices: false,
  integrationsWithInternalSystems: false, saasProduct: false,
  monitoringOrSecurityTool: false,
  expectedReleases: 2,
  projectType: 'Nuovo',
  serviceRisk: 'Minimo',
  pipeline: 'Max 10',
  microservicesCount: 1,
  hasDatabaseImpactDip: false, hasSqlDbType: false, hasDatabaseImpactHostDb2: false,
  storageGb: 10, computeCores: 2, scheduledBatches: 0,
  monitoringSystems: 'NA', observability: 'NA',
  testMagnitude: 'Fino a 100', qa: 'NA',
});

describe('Admin E2E', () => {
  let adminToken: string;
  let userToken:  string;
  let quotationId: string;

  beforeAll(async () => {
    adminToken = await loginAs(ADMIN_EMAIL, ADMIN_PASS);
    userToken  = await loginAs(USER_EMAIL, USER_PASS);

    // crea una quotazione come utente per i test admin
    if (userToken) {
      const res = await request(BASE)
        .post('/quotations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(quotationPayload());
      quotationId = res.body.id;
    }
  });

  // ── Autorizzazione ────────────────────────────────────────────────────────

  describe('Controllo autorizzazione', () => {
    it('GET /admin/quotations → 401 senza token', async () => {
      await request(BASE).get('/admin/quotations').expect(401);
    });

    it('GET /admin/quotations → 403 con token utente standard', async () => {
      if (!userToken) return;
      await request(BASE)
        .get('/admin/quotations')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('GET /admin/users → 403 con token utente standard', async () => {
      if (!userToken) return;
      await request(BASE)
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ── GET /admin/quotations ─────────────────────────────────────────────────

  describe('GET /admin/quotations', () => {
    it('restituisce tutte le quotazioni (200)', async () => {
      if (!adminToken) return;
      const res = await request(BASE)
        .get('/admin/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('ogni quotazione ha i campi richiesti', async () => {
      if (!adminToken) return;
      const res = await request(BASE)
        .get('/admin/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (res.body.length > 0) {
        const q = res.body[0];
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('projectCode');
        expect(q).toHaveProperty('status');
        expect(q).toHaveProperty('createdBy');
      }
    });
  });

  // ── POST /admin/quotations/:id/take-in-charge ─────────────────────────────

  describe('POST /admin/quotations/:id/take-in-charge', () => {
    it('porta la quotazione in IN VALUTAZIONE (201)', async () => {
      if (!adminToken || !quotationId) return;
      const res = await request(BASE)
        .post(`/admin/quotations/${quotationId}/take-in-charge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body.status).toBe('IN VALUTAZIONE');
      expect(res.body.assignedAdmin).toBeDefined();
    });

    it('rifiuta presa in carico doppia (400)', async () => {
      if (!adminToken || !quotationId) return;
      await request(BASE)
        .post(`/admin/quotations/${quotationId}/take-in-charge`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('rifiuta ID non esistente (404)', async () => {
      if (!adminToken) return;
      await request(BASE)
        .post('/admin/quotations/00000000-0000-0000-0000-000000000000/take-in-charge')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ── PATCH /admin/quotations/:id/economic-quotation ────────────────────────

  describe('PATCH /admin/quotations/:id/economic-quotation', () => {
    it('imposta il valore economico (200)', async () => {
      if (!adminToken || !quotationId) return;
      const res = await request(BASE)
        .patch(`/admin/quotations/${quotationId}/economic-quotation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalAmount: 15000 });

      expect([200, 201]).toContain(res.status);
      expect(Number(res.body.totalAmount)).toBe(15000);
    });

    it('rifiuta totalAmount negativo (400)', async () => {
      if (!adminToken || !quotationId) return;
      await request(BASE)
        .patch(`/admin/quotations/${quotationId}/economic-quotation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ totalAmount: -100 })
        .expect(400);
    });
  });

  // ── PATCH /admin/quotations/:id/status ────────────────────────────────────

  describe('PATCH /admin/quotations/:id/status', () => {
    it('porta a COMPLETATA dopo aver inserito il valore economico', async () => {
      if (!adminToken || !quotationId) return;
      const res = await request(BASE)
        .patch(`/admin/quotations/${quotationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETATA' });

      expect([200, 201]).toContain(res.status);
      expect(res.body.status).toBe('COMPLETATA');
    });

    it('rifiuta transizione non valida INVIATA → COMPLETATA (400)', async () => {
      if (!adminToken || !userToken) return;
      // crea nuova quotazione in stato INVIATA
      const qRes = await request(BASE)
        .post('/quotations')
        .set('Authorization', `Bearer ${userToken}`)
        .send(quotationPayload());
      const newId = qRes.body.id;
      if (!newId) return;

      await request(BASE)
        .patch(`/admin/quotations/${newId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COMPLETATA' })
        .expect(400);
    });
  });

  // ── GET /admin/users ──────────────────────────────────────────────────────

  describe('GET /admin/users', () => {
    it('restituisce lista utenti (200)', async () => {
      if (!adminToken) return;
      const res = await request(BASE)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('ogni utente ha i campi richiesti', async () => {
      if (!adminToken) return;
      const res = await request(BASE)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const user = res.body[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('matricola');
      expect(user).toHaveProperty('isVerified');
      expect(user).toHaveProperty('isBlocked');
      expect(user).toHaveProperty('role');
      expect(user).not.toHaveProperty('passwordHash');
    });
  });

  // ── PATCH /admin/users/:id/block ──────────────────────────────────────────

  describe('PATCH /admin/users/:id/block', () => {
    it('rifiuta ID non esistente (404)', async () => {
      if (!adminToken) return;
      await request(BASE)
        .patch('/admin/users/00000000-0000-0000-0000-000000000000/block')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isBlocked: true })
        .expect(404);
    });
  });

  // ── GET /admin/settings ───────────────────────────────────────────────────

  describe('GET /admin/settings', () => {
    it('restituisce le impostazioni di sistema (200)', async () => {
      if (!adminToken) return;
      const res = await request(BASE)
        .get('/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('email_enabled');
      expect(res.body).toHaveProperty('sso_enabled');
      expect(typeof res.body.email_enabled).toBe('boolean');
    });
  });

  // ── PATCH /admin/settings/:key ────────────────────────────────────────────

  describe('PATCH /admin/settings/:key', () => {
    it('rifiuta chiave non valida (400)', async () => {
      if (!adminToken) return;
      await request(BASE)
        .patch('/admin/settings/chiave_inventata')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: true })
        .expect(400);
    });
  });
});
