import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateQuotationDto } from './quotations.dto';

// ── helper ────────────────────────────────────────────────────────────────────

const validPayload = (): Record<string, unknown> => ({
  projectCode: 'PRJ1234567',
  projectName: 'Test Project',
  projectStartDate: '2026-01-01',
  projectEndDate: '2026-12-31',
  projectDuration: '> 1 anno',
  projectBudget: '1.000 – 5.000',
  architecturalImpact: 'SI',
  cloudSaas: false,
  cloudIaasPaasLandingZoneCa: true,
  hostMainframe: false,
  onPremiseDipartimentale: false,
  needNewInfrastructure: false,
  infraOnVm: true,
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
  expectedReleases: 2,
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

const dto = (override: Record<string, unknown> = {}) =>
  plainToInstance(CreateQuotationDto, { ...validPayload(), ...override });

const errorsOf = async (payload: CreateQuotationDto) =>
  (await validate(payload)).flatMap((e) => Object.values(e.constraints ?? {}));

// ── suite ─────────────────────────────────────────────────────────────────────

describe('CreateQuotationDto — validazione', () => {

  it('payload valido non produce errori', async () => {
    expect(await errorsOf(dto())).toHaveLength(0);
  });

  // ── projectCode ────────────────────────────────────────────────────────────

  describe('projectCode', () => {
    it('accetta PRJ + 7 char (10 totali)', async () => {
      expect(await errorsOf(dto({ projectCode: 'PRJ1234567' }))).toHaveLength(0);
    });

    it('accetta PRJ + 8 char (11 totali)', async () => {
      expect(await errorsOf(dto({ projectCode: 'PRJ12345678' }))).toHaveLength(0);
    });

    it('accetta RPRJ + 6 char (10 totali)', async () => {
      expect(await errorsOf(dto({ projectCode: 'RPRJ123456' }))).toHaveLength(0);
    });

    it('accetta RPRJ + 7 char (11 totali)', async () => {
      expect(await errorsOf(dto({ projectCode: 'RPRJ1234567' }))).toHaveLength(0);
    });

    it('rifiuta codice con meno di 10 caratteri', async () => {
      expect(await errorsOf(dto({ projectCode: 'PRJ123456' }))).not.toHaveLength(0);
    });

    it('rifiuta codice con più di 11 caratteri', async () => {
      expect(await errorsOf(dto({ projectCode: 'PRJ123456789' }))).not.toHaveLength(0);
    });

    it('rifiuta codice senza prefisso PRJ/RPRJ', async () => {
      expect(await errorsOf(dto({ projectCode: 'ABC1234567' }))).not.toHaveLength(0);
    });

    it('rifiuta stringa vuota', async () => {
      expect(await errorsOf(dto({ projectCode: '' }))).not.toHaveLength(0);
    });
  });

  // ── projectDuration ───────────────────────────────────────────────────────

  describe('projectDuration', () => {
    const valori = ['1 – 6 mesi', '7 – 12 mesi', '> 1 anno', 'pluriennale'];

    valori.forEach((v) => {
      it(`accetta il valore valido: "${v}"`, async () => {
        expect(await errorsOf(dto({ projectDuration: v }))).toHaveLength(0);
      });
    });

    it('rifiuta un valore non ammesso', async () => {
      const errors = await errorsOf(dto({ projectDuration: 'due anni' }));
      expect(errors.some((e) => e.includes('Durata progettuale'))).toBe(true);
    });

    it('rifiuta stringa vuota', async () => {
      expect(await errorsOf(dto({ projectDuration: '' }))).not.toHaveLength(0);
    });
  });

  // ── projectBudget ─────────────────────────────────────────────────────────

  describe('projectBudget', () => {
    const valori = ['Fino a 500', '500 – 1.000', '1.000 – 5.000', '> 5.000'];

    valori.forEach((v) => {
      it(`accetta: "${v}"`, async () => {
        expect(await errorsOf(dto({ projectBudget: v }))).toHaveLength(0);
      });
    });

    it('rifiuta valore non in lista', async () => {
      expect(await errorsOf(dto({ projectBudget: '9999' }))).not.toHaveLength(0);
    });
  });

  // ── date ──────────────────────────────────────────────────────────────────

  describe('date', () => {
    it('accetta date ISO valide', async () => {
      expect(await errorsOf(dto({ projectStartDate: '2026-03-15', projectEndDate: '2026-09-30' }))).toHaveLength(0);
    });

    it('rifiuta formato data non ISO', async () => {
      expect(await errorsOf(dto({ projectStartDate: '15/03/2026' }))).not.toHaveLength(0);
    });

    it('rifiuta data non valida', async () => {
      expect(await errorsOf(dto({ projectStartDate: 'not-a-date' }))).not.toHaveLength(0);
    });
  });

  // ── campi numerici ────────────────────────────────────────────────────────

  describe('campi numerici', () => {
    const campiNumerici = [
      'serviceVolumesPerDay',
      'expectedReleases',
      'microservicesCount',
      'storageGb',
      'computeCores',
      'scheduledBatches',
    ];

    campiNumerici.forEach((campo) => {
      it(`${campo}: accetta 0`, async () => {
        expect(await errorsOf(dto({ [campo]: 0 }))).toHaveLength(0);
      });

      it(`${campo}: accetta valore positivo`, async () => {
        expect(await errorsOf(dto({ [campo]: 10 }))).toHaveLength(0);
      });

      it(`${campo}: rifiuta valore negativo`, async () => {
        const errors = await errorsOf(dto({ [campo]: -1 }));
        expect(errors.length).toBeGreaterThan(0);
      });

      it(`${campo}: rifiuta float`, async () => {
        const errors = await errorsOf(dto({ [campo]: 1.5 }));
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  // ── campi boolean ─────────────────────────────────────────────────────────

  describe('campi boolean', () => {
    const campiBoolean = [
      'cloudSaas', 'cloudIaasPaasLandingZoneCa', 'hostMainframe',
      'onPremiseDipartimentale', 'needNewInfrastructure', 'infraOnVm',
      'infraMicroservices', 'developedInternally', 'developedByExternalVendors',
    ];

    campiBoolean.forEach((campo) => {
      it(`${campo}: accetta true`, async () => {
        expect(await errorsOf(dto({ [campo]: true }))).toHaveLength(0);
      });

      it(`${campo}: accetta false`, async () => {
        expect(await errorsOf(dto({ [campo]: false }))).toHaveLength(0);
      });

      it(`${campo}: rifiuta stringa`, async () => {
        const errors = await errorsOf(dto({ [campo]: 'yes' }));
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  // ── impactEntity ──────────────────────────────────────────────────────────

  describe('impactEntity', () => {
    ['Limitato', 'Moderato', 'Considerevole', 'Sostanziale'].forEach((v) => {
      it(`accetta: "${v}"`, async () => {
        expect(await errorsOf(dto({ impactEntity: v }))).toHaveLength(0);
      });
    });

    it('rifiuta valore non in lista', async () => {
      expect(await errorsOf(dto({ impactEntity: 'Alto' }))).not.toHaveLength(0);
    });
  });

  // ── campi select multipli ─────────────────────────────────────────────────

  describe('altri campi @IsIn', () => {
    const cases: [string, string[], string][] = [
      ['architecturalImpact', ['NO', 'SI'], 'FORSE'],
      ['technologicalImpact', ['NA', 'In continuità con AS IS', 'Evoluzione tecnologica', 'Cambio tecnologico'], 'Altro'],
      ['projectType', ['Nuovo', 'Evolutiva', 'CIF'], 'Legacy'],
      ['serviceRisk', ['Minimo', 'Moderato', 'Rilevante', 'Radicale'], 'Basso'],
      ['pipeline', ['Max 10', '10-30', '30-60', '> 60'], '100+'],
      ['monitoringSystems', ['NA', 'Esistente (no action)', 'SI'], 'NO'],
      ['observability', ['NA', 'Esistente (no action)', 'SI'], 'NO'],
      ['testMagnitude', ['Fino a 100', '100–1.000', '1.000–10.000', '>10.000'], '500'],
      ['qa', ['NA', 'SI', 'NO'], 'FORSE'],
    ];

    cases.forEach(([campo, validi, invalido]) => {
      it(`${campo}: accetta i valori ammessi`, async () => {
        for (const v of validi) {
          expect(await errorsOf(dto({ [campo]: v }))).toHaveLength(0);
        }
      });

      it(`${campo}: rifiuta "${invalido}"`, async () => {
        expect(await errorsOf(dto({ [campo]: invalido }))).not.toHaveLength(0);
      });
    });
  });
});
