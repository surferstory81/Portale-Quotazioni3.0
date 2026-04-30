/**
 * E2E Auth — richiede un'istanza backend attiva con DB di test.
 * Avviare con: DATABASE_URL=<test-db> npm run start:dev
 * Eseguire con: npm run test:e2e
 */
import * as request from 'supertest';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

const unique = () => Date.now().toString(36);

describe('Auth E2E', () => {
  let accessToken: string;
  let verificationToken: string;
  const userEmail = `test_${unique()}@example.com`;
  const userPassword = 'Password1!';
  const userMatricola = `MAT${unique()}`;

  // ── POST /auth/register ──────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('registra un nuovo utente (201)', async () => {
      const res = await request(BASE)
        .post('/auth/register')
        .send({ matricola: userMatricola, email: userEmail, password: userPassword })
        .expect(201);

      expect(res.body.message).toContain('Registrazione');
      verificationToken = res.body.verificationToken;
    });

    it('rifiuta email duplicata (409)', async () => {
      await request(BASE)
        .post('/auth/register')
        .send({ matricola: `MAT${unique()}`, email: userEmail, password: userPassword })
        .expect(409);
    });

    it('rifiuta email con formato non valido (400)', async () => {
      await request(BASE)
        .post('/auth/register')
        .send({ matricola: `MAT${unique()}`, email: 'non-una-email', password: userPassword })
        .expect(400);
    });

    it('rifiuta password troppo corta (400)', async () => {
      await request(BASE)
        .post('/auth/register')
        .send({ matricola: `MAT${unique()}`, email: `x${unique()}@test.it`, password: 'Ab1!' })
        .expect(400);
    });

    it('rifiuta password senza carattere speciale (400)', async () => {
      await request(BASE)
        .post('/auth/register')
        .send({ matricola: `MAT${unique()}`, email: `x${unique()}@test.it`, password: 'Password1' })
        .expect(400);
    });
  });

  // ── GET /auth/verify-email ───────────────────────────────────────────────

  describe('GET /auth/verify-email', () => {
    it('verifica l\'email con token valido (200)', async () => {
      if (!verificationToken) return;
      const res = await request(BASE)
        .get(`/auth/verify-email?token=${verificationToken}`)
        .expect(200);
      expect(res.body.message).toContain('verificata');
    });

    it('rifiuta token già usato (400)', async () => {
      if (!verificationToken) return;
      await request(BASE)
        .get(`/auth/verify-email?token=${verificationToken}`)
        .expect(400);
    });

    it('rifiuta token non valido (400)', async () => {
      await request(BASE)
        .get('/auth/verify-email?token=fake-token-invalid')
        .expect(400);
    });
  });

  // ── POST /auth/login ─────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('autentica con credenziali valide (200 o 201)', async () => {
      const res = await request(BASE)
        .post('/auth/login')
        .send({ email: userEmail, password: userPassword });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toMatchObject({ email: userEmail });
      accessToken = res.body.accessToken;
    });

    it('rifiuta password errata (401)', async () => {
      await request(BASE)
        .post('/auth/login')
        .send({ email: userEmail, password: 'WrongPass1!' })
        .expect(401);
    });

    it('rifiuta email inesistente (401)', async () => {
      await request(BASE)
        .post('/auth/login')
        .send({ email: 'ghost@test.it', password: userPassword })
        .expect(401);
    });

    it('rifiuta body vuoto (400)', async () => {
      await request(BASE)
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  // ── GET /health (endpoint protetto con token) ────────────────────────────

  describe('Endpoint protetti', () => {
    it('GET /quotations restituisce 401 senza token', async () => {
      await request(BASE).get('/quotations').expect(401);
    });

    it('GET /quotations restituisce 200 con token valido', async () => {
      if (!accessToken) return;
      await request(BASE)
        .get('/quotations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('GET /quotations restituisce 401 con token malformato', async () => {
      await request(BASE)
        .get('/quotations')
        .set('Authorization', 'Bearer token-non-valido')
        .expect(401);
    });
  });

  // ── POST /auth/forgot-password ───────────────────────────────────────────

  describe('POST /auth/forgot-password', () => {
    it('risponde con 200/201 per email esistente', async () => {
      const res = await request(BASE)
        .post('/auth/forgot-password')
        .send({ email: userEmail });
      expect([200, 201]).toContain(res.status);
    });

    it('risponde con 200/201 anche per email non esistente (sicurezza: no enumeration)', async () => {
      const res = await request(BASE)
        .post('/auth/forgot-password')
        .send({ email: 'ghost@inesistente.it' });
      expect([200, 201]).toContain(res.status);
    });
  });
});
