// Família de exemplo do modo demonstração (spec 0.2.2 e Q10/L1): "Carregar família de exemplo" nos Ajustes.
// Dados fictícios. As datas são relativas a hoje, para a história continuar valendo em qualquer dia:
// Carlos com 4 HbA1c subindo em 2 anos, Lia com 10 meses e a febre amarela atrasada, Dirce com a influenza do ano pendente.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toLocalIsoDate } from '@/shared/lib';
import type { Member, NewMember } from '@/entities/member';
import type { NewMeasurement } from '@/entities/measurement';
import { doseLabelOf, type DoseKey, type NewVaccineDose } from '@/entities/vaccine';
import { medicationEndOn, type NewMedication } from '@/entities/medication';
import type { RecordType } from '@/entities/health-record';
import type { AppPorts } from './container';
import { useContainer } from './providers';

export type DemoSeedPorts = Pick<AppPorts, 'families' | 'members' | 'records' | 'measurements' | 'vaccineDoses' | 'medications'>;

export interface DemoSeedResult {
  familyId: string;
  /** false quando a família de exemplo já estava carregada (nada foi gravado). */
  created: boolean;
}

const FAMILY_NAME = 'Família Souza';
const MARKER_NAME = 'Carlos Souza';

const pad = (n: number) => String(n).padStart(2, '0');

/** `iso` deslocado em meses de calendário e dias; dia inexistente no mês vira o último dia. */
function shift(iso: string, months: number, days = 0): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const lastDay = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDay) + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

type Lab = Pick<NewMeasurement, 'code' | 'label' | 'value' | 'unit' | 'referenceLow' | 'referenceHigh' | 'referenceText'>;
type Vital = Pick<NewMeasurement, 'code' | 'label' | 'value' | 'value2' | 'unit' | 'takenAt' | 'context'> & { takenOn: string };
type Dose = [vaccineCode: string, doseKey: DoseKey, appliedOn: string | null, doseLabel?: string];
type Med = Pick<NewMedication, 'name' | 'dosage' | 'instructions' | 'startOn' | 'endOn'>;
type Doc = { type: RecordType; title: string; date: string; location?: string; professional?: string; labs?: Lab[]; doses?: Dose[]; meds?: Med[] };

interface PersonSeed {
  member: Omit<NewMember, 'familyId'>;
  documents: Doc[];
  vitals?: Vital[];
  /** Doses informadas à mão (sem documento de origem). */
  doses?: Dose[];
  meds?: Med[];
}

const hba1c = (value: number): Lab => ({ code: 'hba1c', label: 'Hemoglobina glicada (HbA1c)', value, unit: '%', referenceLow: null, referenceHigh: 5.7, referenceText: 'Inferior a 5,7 %' });
const glucose = (value: number): Lab => ({ code: 'glucose_fasting', label: 'Glicose em jejum', value, unit: 'mg/dL', referenceLow: 70, referenceHigh: 99, referenceText: '70 a 99 mg/dL' });
const bp = (takenOn: string, value: number, value2: number): Vital => ({ code: 'bp', label: 'Pressão arterial', value, value2, unit: 'mmHg', takenOn, takenAt: '08:00', context: null });
const capillary = (takenOn: string, value: number, context: 'fasting' | 'post_meal'): Vital => ({
  code: 'glucose_capillary', label: 'Glicemia capilar', value, value2: null, unit: 'mg/dL', takenOn, takenAt: context === 'fasting' ? '07:00' : '14:00', context,
});
const vital = (code: 'weight' | 'height', takenOn: string, value: number): Vital => ({
  code, label: code === 'weight' ? 'Peso' : 'Altura', value, value2: null, unit: code === 'weight' ? 'kg' : 'cm', takenOn, takenAt: null, context: null,
});
/** Esquema adulto "conforme o histórico": 3 doses de dT e de hepatite B sem data, como na carteira de papel perdida. */
const historyDoses = (dtBoosterOn: string): Dose[] => [
  ['dt', 'D1', null], ['dt', 'D2', null], ['dt', 'D3', null], ['dt', 'R', dtBoosterOn],
  ['hepatitis_b', 'D1', null], ['hepatitis_b', 'D2', null], ['hepatitis_b', 'D3', null],
];

function buildFamily(today: string, withSelf: boolean): PersonSeed[] {
  const ago = (months: number, days = 0) => shift(today, -months, -days);
  const lastYear = `${Number(today.slice(0, 4)) - 1}-04-20`;
  const liaBirth = ago(10, 1);
  const lia = (months: number) => shift(liaBirth, months);
  const ironStart = ago(0, 18);

  const people: PersonSeed[] = [
    {
      member: { fullName: 'Carlos Souza', birthDate: ago(67 * 12 + 3), relationship: 'spouse', sex: 'male' },
      documents: [
        { type: 'result', title: 'Hemoglobina glicada e glicemia', date: ago(24, 3), location: 'Laboratório Horizonte', labs: [hba1c(6.6), glucose(118)] },
        { type: 'result', title: 'Hemoglobina glicada e glicemia', date: ago(16, 9), location: 'Laboratório Horizonte', labs: [hba1c(6.9), glucose(126)] },
        { type: 'result', title: 'Hemoglobina glicada e glicemia', date: ago(8, 5), location: 'Laboratório Horizonte', labs: [hba1c(7.1), glucose(131)] },
        {
          type: 'result', title: 'Hemoglobina glicada, glicemia e creatinina', date: ago(0, 30), location: 'Laboratório Horizonte',
          labs: [hba1c(7.4), glucose(138), { code: 'creatinine', label: 'Creatinina', value: 1.1, unit: 'mg/dL', referenceLow: 0.7, referenceHigh: 1.3, referenceText: '0,70 a 1,30 mg/dL' }],
        },
        {
          type: 'prescription', title: 'Receita de uso contínuo', date: ago(2, 10), professional: 'Dra. Marta Lima',
          meds: [
            { name: 'Metformina', dosage: '850 mg', instructions: '1 comprimido após o café e após o jantar', startOn: ago(2, 10), endOn: null },
            { name: 'Losartana', dosage: '50 mg', instructions: '1 comprimido pela manhã', startOn: ago(2, 10), endOn: null },
          ],
        },
        { type: 'consultation', title: 'Consulta de cardiologia', date: ago(1, 4), location: 'Clínica Coração Sereno', professional: 'Dr. Rui Andrade' },
      ],
      vitals: [
        bp(ago(0, 27), 142, 90), bp(ago(0, 22), 138, 88), bp(ago(0, 17), 140, 86), bp(ago(0, 12), 135, 85), bp(ago(0, 7), 136, 82), bp(ago(0, 2), 132, 84),
        capillary(ago(0, 20), 132, 'fasting'), capillary(ago(0, 15), 168, 'post_meal'), capillary(ago(0, 10), 124, 'fasting'), capillary(ago(0, 5), 155, 'post_meal'), capillary(ago(0, 1), 128, 'fasting'),
        vital('weight', ago(3), 85.2), vital('weight', ago(1, 4), 84.5),
      ],
      doses: [...historyDoses(ago(5 * 12)), ['influenza', 'ANUAL', ago(6)], ['covid19', 'PERIODICA', ago(4)]],
      meds: [{ name: 'Amoxicilina', dosage: '500 mg', instructions: '1 cápsula a cada 8 horas', startOn: ago(5, 7), endOn: ago(5, 1) }],
    },
    {
      member: { fullName: 'Lia Souza', birthDate: liaBirth, relationship: 'child', sex: 'female' },
      documents: [
        {
          type: 'vaccine', title: 'Carteira de vacinação', date: ago(1), location: 'UBS Centro',
          doses: [
            ['bcg', 'DU', liaBirth], ['hepatitis_b', 'DU', liaBirth, 'Dose ao nascer'],
            ['penta', 'D1', lia(2)], ['ipv', 'D1', lia(2)], ['rotavirus', 'D1', lia(2)], ['pcv10', 'D1', lia(2)], ['menc', 'D1', lia(3)],
            ['penta', 'D2', lia(4)], ['ipv', 'D2', lia(4)], ['rotavirus', 'D2', lia(4)], ['pcv10', 'D2', lia(4)], ['menc', 'D2', lia(5)],
            ['penta', 'D3', lia(6)], ['ipv', 'D3', lia(6)], ['influenza', 'ANUAL', lia(6)], ['covid19', 'D1', lia(6)],
            ['influenza', 'ANUAL', lia(7)], ['covid19', 'D2', lia(7)], ['covid19', 'D3', lia(9)],
          ],
        },
        {
          type: 'result', title: 'Hemograma e ferritina', date: ago(0, 20), location: 'Laboratório Santa Clara',
          labs: [
            { code: 'hemoglobin', label: 'Hemoglobina', value: 11.2, unit: 'g/dL', referenceLow: 11, referenceHigh: 14, referenceText: '11,0 a 14,0 g/dL' },
            { code: 'ferritin', label: 'Ferritina', value: 8, unit: 'ng/mL', referenceLow: 12, referenceHigh: 150, referenceText: '12 a 150 ng/mL' },
          ],
        },
        {
          type: 'prescription', title: 'Receita de sulfato ferroso', date: ironStart, professional: 'Dr. Paulo Reis',
          meds: [{ name: 'Sulfato ferroso', dosage: '25 mg/mL', instructions: 'Dar 1,5 mL uma vez ao dia', startOn: ironStart, endOn: medicationEndOn(ironStart, { kind: 'days', days: 60 }) ?? null }],
        },
        { type: 'consultation', title: 'Consulta de puericultura', date: ago(1), location: 'UBS Centro', professional: 'Dr. Paulo Reis' },
      ],
      vitals: [vital('weight', ago(1), 8.6), vital('height', ago(1), 72)],
    },
    {
      member: { fullName: 'Dirce Souza', birthDate: ago(78 * 12 + 7), relationship: 'parent', sex: 'female' },
      documents: [
        {
          type: 'result', title: 'TSH e vitamina D', date: ago(2), location: 'Laboratório Horizonte',
          labs: [
            { code: 'tsh', label: 'TSH', value: 3.1, unit: 'µUI/mL', referenceLow: 0.4, referenceHigh: 4.5, referenceText: '0,4 a 4,5 µUI/mL' },
            { code: 'vitamin_d', label: 'Vitamina D (25-OH)', value: 32, unit: 'ng/mL', referenceLow: 30, referenceHigh: 100, referenceText: '30 a 100 ng/mL' },
          ],
        },
        { type: 'consultation', title: 'Consulta de geriatria', date: ago(0, 25), location: 'Clínica Bem Viver', professional: 'Dra. Helena Prado' },
      ],
      vitals: [bp(ago(0, 25), 128, 78), vital('weight', ago(0, 25), 61.3)],
      doses: [...historyDoses(ago(4 * 12)), ['influenza', 'ANUAL', lastYear], ['covid19', 'PERIODICA', ago(3)]],
      meds: [{ name: 'Levotiroxina', dosage: '50 mcg', instructions: '1 comprimido em jejum', startOn: ago(24), endOn: null }],
    },
  ];
  if (!withSelf) return people;
  return [
    {
      member: { fullName: 'Ana Souza', birthDate: ago(38 * 12 + 5), relationship: 'self', sex: 'female' },
      documents: [{ type: 'consultation', title: 'Consulta de rotina', date: ago(3), location: 'Clínica Bem Viver', professional: 'Dra. Helena Prado' }],
      vitals: [vital('weight', ago(3), 62)],
      doses: [...historyDoses(ago(36)), ['mmr', 'DU', null], ['yellow_fever', 'DU', ago(18 * 12)]],
    },
    ...people,
  ];
}

/**
 * Carrega a família de exemplo no modo demonstração. Usa a família do usuário (ou cria "Família Souza") e
 * acrescenta as pessoas, sem apagar nada. Ana ("Eu") só entra se a família ainda não tem quem seja "Eu".
 * Idempotente: se Carlos Souza já está na família, não grava nada.
 */
export async function loadDemoFamily(ports: DemoSeedPorts, now: Date = new Date()): Promise<DemoSeedResult> {
  const family = (await ports.families.getMyFamily()) ?? (await ports.families.createFamily(FAMILY_NAME));
  const existing = await ports.members.listByFamily(family.id);
  if (existing.some((m) => m.fullName === MARKER_NAME)) return { familyId: family.id, created: false };

  const familyId = family.id;
  for (const person of buildFamily(toLocalIsoDate(now), !existing.some((m) => m.relationship === 'self'))) {
    const member: Member = await ports.members.create({ ...person.member, familyId });
    const owner = { familyId, memberId: member.id };
    const toDose = (sourceRecordId: string | null) => ([vaccineCode, doseKey, appliedOn, doseLabel]: Dose): NewVaccineDose => ({
      ...owner, vaccineCode, vaccineName: null, doseKey, doseLabel: doseLabel ?? doseLabelOf(doseKey), appliedOn, lot: null, location: null,
      sourceRecordId, origin: sourceRecordId ? 'ocr' : 'manual',
    });

    for (const doc of person.documents) {
      const record = await ports.records.create({
        ...owner, type: doc.type, title: doc.title, date: doc.date, location: doc.location ?? null, professional: doc.professional ?? null, notes: null,
      });
      const source = { sourceRecordId: record.id, origin: 'ocr' as const };
      if (doc.labs) {
        await ports.measurements.createMany(
          doc.labs.map((lab) => ({ ...owner, ...lab, ...source, kind: 'lab', value2: null, takenOn: doc.date, takenAt: null, context: null, note: null })),
        );
      }
      if (doc.doses) await ports.vaccineDoses.createMany(doc.doses.map(toDose(record.id)));
      if (doc.meds) await ports.medications.createMany(doc.meds.map((med) => ({ ...owner, ...med, ...source })));
    }
    if (person.vitals) {
      await ports.measurements.createMany(
        person.vitals.map((v) => ({ ...owner, ...v, kind: 'vital', referenceLow: null, referenceHigh: null, referenceText: null, note: null, sourceRecordId: null, origin: 'manual' })),
      );
    }
    if (person.doses) await ports.vaccineDoses.createMany(person.doses.map(toDose(null)));
    if (person.meds) await ports.medications.createMany(person.meds.map((med) => ({ ...owner, ...med, sourceRecordId: null, origin: 'manual' })));
  }
  return { familyId, created: true };
}

/**
 * Ação "Carregar família de exemplo" dos Ajustes (F5.6). A rota chama este hook e passa a mutação à tela,
 * como em `useRevokeConsentFlow`; a tela só mostra a ação quando `mode === 'demo'`. Fora do demo, rejeita.
 */
export function useLoadDemoFamily() {
  const container = useContainer();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<DemoSeedResult> => {
      if (container.mode !== 'demo') return Promise.reject(new Error('A família de exemplo só existe no modo demonstração.'));
      return loadDemoFamily(container);
    },
    // Família, pessoas, registros e dados de saúde mudam juntos.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
