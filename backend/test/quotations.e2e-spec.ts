/**
 * E2E Quotations — richiede backend attivo + utente già verificato.
 * Avviare con: npm run start:dev
 * Eseguire con: npm run test:e2e
 */
import * as request from 'supertest';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

const validPayload = () => ({
  projectCode: 'PRJ1234567',
  projectName: 'E2E Test Project',
  projectStartDate: '2026-01-01',
  projectEndDate: '2026-12-31',
  projectDuration: '> 1 anno',
  projectBudget: '1.000 – 5.000',
  architecturalImpact: 'SI',
  cloudSaas: false,
  cloudIaasPaasLandingZoneCa: true,
  hostMainframe: false,
  onPremiseDipartimentale: false,
  needNewInfrastructure: true,
  infraOnVm: false,
  infraMicroservices: true,
  impactEntity: 'Moderato',
  serviceConsumer: 'Utenti Direzione Centrale',
  serviceVolumesPerDay: 500,
  technologicalImpact: 'Evoluzione tecnologica',
  developedInternally: true,
  developedByExternalVendors: false,
  hasCaIntellectualProperty: true,
  serviceExposure: false,
  marketProduct: false,
  dependenciesWithExternalServices: false,
  integrationsWithInternalSystems: true,
  saasProduct: false,
  monitoringOrSecurityTool: false,
  expectedReleases: 4,
  projectType: 'Nuovo',
  serviceRisk: 'Moderato',
  pipeline: '10-30',
  microservicesCount: 3,
  hasDatabaseImpactDip: false,
  hasSqlDbType: true,
  hasDatabaseImpactHostDb2: false,
  storageGb: 100,
  computeCores: 4,
  scheduledBatches: 0,
  monitoringSystems: 'SI',
  observability: 'SI',
  testMagnitude: '100–1.000',
  qa: 'SI',
});

async function getToken(): Promise<string> {
  const email = process.env.E2E_USER_EMAIL || 'testuser@example.com';
  const password = process.env.E2E_USER_PASSWORD || 'Password1!';
  const res = await request(BASE).post('/auth/login').send({ email, password });
  return res.body.accessToken ?? '';
}

describe('Quotations E2E', () => {
  let token: string;
  let createdId: string;

  beforeAll(async () => {
    token = await getToken();
  });

  // ── POST /quotations ──────────────────────────────────────────────────────

  describe('POST /quotations', () => {
    it('crea una quotazione valida (201)', async () => {
      const res = await request(BASE)
        .post('/quotations')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload())
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('INVIATA');
      expect(res.body.projectCode).toBe('PRJ1234567');
      createdId = res.body.id;
    });

    it('rifiuta projectCode non valido (400)', async () => {
      const res = await request(BASE)
        .post('/quotations')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validPayload(), projectCode: 'ABC123' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('rifiuta endDate antecedente a startDate (400)', async () => {
      await request(BASE)
        .post('/quotations')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validPayload(), projectStartDate: '2026-12-31', projectEndDate: '2026-01-01' })
        .expect(400);
    });

    it('rifiuta durata non in lista (400)', async () => {
      await request(BASE)
        .post('/quotations')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validPayload(), projectDuration: 'due anni' })
        .expect(400);
    });

    it('rifiuta campo numerico negativo (400)', async () => {
      await request(BASE)
        .post('/quotations')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validPayload(), storageGb: -10 })
        .expect(400);
    });

    it('rifiuta richiesta senza autenticazione (401)', async () => {
      await request(BASE).post('/quotations').send(validPayload()).expect(401);
    });

    it('rifiuta payload con campo sconosciuto (400 — forbidNonWhitelisted)', async () => {
      await request(BASE)
        .post('/quotations')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...validPayload(), campoNonEsistente: 'valore' })
        .expect(400);
    });
  });

  // ── GET /quotations ───────────────────────────────────────────────────────

  describe('GET /quotations', () => {
    it('restituisce un array (200)', async () => {
      const res = await request(BASE)
        .get('/quotations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filtra per projectCode', async () => {
      const res = await request(BASE)
        .get('/quotations?projectCode=PRJ')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('filtra per projectName', async () => {
      const res = await request(BASE)
        .get('/quotations?projectName=E2E')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('rifiuta senza token (401)', async () => {
      await request(BASE).get('/quotations').expect(401);
    });
  });

  // ── GET /quotations/completed ─────────────────────────────────────────────

  describe('GET /quotations/completed', () => {
    it('restituisce un array di quotazioni completate (200)', async () => {
      const res = await request(BASE)
        .get('/quotations/completed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((q: { status: string }) => {
        expect(q.status).toBe('COMPLETATA');
      });
    });
  });

  // ── PATCH /quotations/:id ─────────────────────────────────────────────────

  describe('PATCH /quotations/:id', () => {
    it('rifiuta aggiornamento su quotazione INVIATA (400)', async () => {
      if (!createdId) return;
      await request(BASE)
        .patch(`/quotations/${createdId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload())
        .expect(400);
    });

    it('rifiuta ID non esistente (404)', async () => {
      await request(BASE)
        .patch('/quotations/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload())
        .expect(404);
    });

    it('rifiuta senza token (401)', async () => {
      if (!createdId) return;
      await request(BASE)
        .patch(`/quotations/${createdId}`)
        .send(validPayload())
        .expect(401);
    });
  });
});
