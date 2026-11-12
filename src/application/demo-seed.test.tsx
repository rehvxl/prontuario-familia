import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient } from '@tanstack/react-query';
import { buildSeries } from '@/entities/measurement';
import { evaluateVaccines, isUpToDate } from '@/entities/vaccine';
import { medicationStatus } from '@/entities/medication';
import { formatAge } from '@/entities/member';
import { buildFamilyAttention } from '@/features/health-overview';
import type { AppEnv } from '@/shared/config';
import { createContainer, type AppContainer } from './container';
import { loadDemoFamily, useLoadDemoFamily } from './demo-seed';
import { AppProviders } from './providers';

const demoEnv: AppEnv = { supabaseUrl: null, supabaseAnonKey: null, googleAuthEnabled: false, backendMode: 'demo' };
const TODAY = '2026-11-11';
const NOW = new Date(2026, 10, 11, 9, 0);

async function signedIn(email = 'ana@exemplo.com'): Promise<AppContainer> {
  const c = createContainer(demoEnv);
  await c.auth.verifyEmailOtp(email, '123456');
  return c;
}

beforeEach(() => AsyncStorage.clear());

async function loaded() {
  const c = await signedIn();
  const result = await loadDemoFamily(c, NOW);
  const members = await c.members.listByFamily(result.familyId);
  const byName = (first: string) => members.find((m) => m.fullName.startsWith(first))!;
  const [measurements, doses, dismissals, records] = await Promise.all([
    c.measurements.listByFamily(result.familyId),
    c.vaccineDoses.listByFamily(result.familyId),
    c.vaccineDoses.listFamilyDismissals(result.familyId),
    c.records.list(result.familyId),
  ]);
  return { c, result, members, byName, measurements, doses, dismissals, records };
}

describe('loadDemoFamily (família de exemplo do modo demo)', () => {
  it('sem família, cria a "Família Souza" com Ana (Eu), Carlos, Lia e Dirce', async () => {
    const { c, result, members, byName } = await loaded();
    expect(result.created).toBe(true);
    expect((await c.families.getMyFamily())?.name).toBe('Família Souza');
    expect(members.map((m) => [m.fullName, m.relationship])).toEqual([
      ['Ana Souza', 'self'],
      ['Carlos Souza', 'spouse'],
      ['Lia Souza', 'child'],
      ['Dirce Souza', 'parent'],
    ]);
    expect(formatAge(byName('Ana').birthDate, NOW)).toBe('38 anos');
    expect(formatAge(byName('Carlos').birthDate, NOW)).toBe('67 anos');
    expect(byName('Lia').birthDate).toBe('2026-01-10'); // o exemplo da spec F3.3
    expect(formatAge(byName('Lia').birthDate, NOW)).toBe('10 meses');
  });

  it('Carlos tem 4 HbA1c em 2 anos, subindo, a última acima da faixa do laudo', async () => {
    const { byName, measurements } = await loaded();
    const carlos = measurements.filter((m) => m.memberId === byName('Carlos').id);
    const hba1c = buildSeries(carlos).find((s) => s.key === 'hba1c')!;
    expect(hba1c.points.map((p) => p.value)).toEqual([6.6, 6.9, 7.1, 7.4]);
    expect(hba1c.chart).toHaveLength(4);
    expect(hba1c.points[0]!.takenOn).toBe('2024-11-08');
    expect(hba1c.latest).toMatchObject({ takenOn: '2026-10-12', referenceHigh: 5.7, origin: 'ocr' });
    expect(carlos.filter((m) => m.code === 'bp')).toHaveLength(6);
    expect(carlos.filter((m) => m.code === 'glucose_capillary').every((m) => m.context !== null && m.origin === 'manual')).toBe(true);
  });

  it('todo item lido de documento aponta para um registro da mesma pessoa', async () => {
    const { c, measurements, doses, records, result } = await loaded();
    const medications = await c.medications.listByFamily(result.familyId);
    const linked = [...measurements, ...doses, ...medications].filter((i) => i.sourceRecordId !== null);
    expect(linked.length).toBeGreaterThan(20);
    for (const item of linked) {
      const record = records.find((r) => r.id === item.sourceRecordId);
      expect(record?.memberId).toBe(item.memberId);
      expect(item.origin).toBe('ocr');
    }
  });

  it('o painel conta a história da spec: Lia com a febre amarela atrasada, Carlos fora da faixa, Dirce com a influenza do ano', async () => {
    const { members, measurements, doses, dismissals } = await loaded();
    const attention = buildFamilyAttention({ members, measurements, doses, dismissals, today: TODAY });
    // Título sem o estado; o estado vem no detalhe (F7.3, protótipo v3).
    const lines = attention.items.map((i) => `${i.title} | ${i.detail}`);
    expect(attention.hasHealthData).toBe(true);
    expect(lines).toContain('Lia · Febre amarela (1ª dose) | Atrasada pelo calendário · a partir de 10 de out. de 2026');
    expect(lines).toContain('Dirce · Influenza de 2026 | Pendente · a partir de 1 de jan. de 2026');
    expect(lines).toContain('Carlos · Hemoglobina glicada (HbA1c) | Acima da faixa do laudo · 7,4 % · 12 de out.');
    expect(lines).toContain('Lia · Ferritina | Abaixo da faixa do laudo · 8 ng/mL · 22 de out.');
    expect(attention.items[0]!.kind).toBe('vaccine-late');
  });

  it('Ana e Carlos estão em dia com as vacinas; Lia e Dirce não', async () => {
    const { byName, doses, dismissals } = await loaded();
    const upToDate = (first: string) => {
      const m = byName(first);
      return isUpToDate(evaluateVaccines({ birthDate: m.birthDate, doses: doses.filter((d) => d.memberId === m.id), dismissals, today: TODAY }));
    };
    expect([upToDate('Ana'), upToDate('Carlos'), upToDate('Lia'), upToDate('Dirce')]).toEqual([true, true, false, false]);
  });

  it('medicamentos: Carlos com 2 em uso e 1 encerrado; o sulfato ferroso de Lia dura 60 dias', async () => {
    const { c, byName } = await loaded();
    const carlos = await c.medications.listByMember(byName('Carlos').id);
    expect(carlos.map((m) => [m.name, medicationStatus(m, TODAY)]).sort()).toEqual([
      ['Amoxicilina', 'ended'],
      ['Losartana', 'active'],
      ['Metformina', 'active'],
    ]);
    const [iron] = await c.medications.listByMember(byName('Lia').id);
    expect(iron).toMatchObject({ name: 'Sulfato ferroso', startOn: '2026-10-24', endOn: '2026-12-22' });
  });

  it('é idempotente: carregar de novo não duplica nada', async () => {
    const { c, result, members, measurements } = await loaded();
    expect(await loadDemoFamily(c, NOW)).toEqual({ familyId: result.familyId, created: false });
    expect(await c.members.listByFamily(result.familyId)).toHaveLength(members.length);
    expect(await c.measurements.listByFamily(result.familyId)).toHaveLength(measurements.length);
  });

  it('com família e "Eu" já cadastrados, acrescenta só Carlos, Lia e Dirce e mantém o que existia', async () => {
    const c = await signedIn('outra@exemplo.com');
    const family = await c.families.createFamily('Minha família');
    const me = await c.members.create({ familyId: family.id, fullName: 'Bea Lima', birthDate: '1990-02-02', relationship: 'self', sex: 'female' });
    expect(await loadDemoFamily(c, NOW)).toEqual({ familyId: family.id, created: true });
    const members = await c.members.listByFamily(family.id);
    expect(members.map((m) => m.fullName)).toEqual(['Bea Lima', 'Carlos Souza', 'Lia Souza', 'Dirce Souza']);
    expect(members[0]).toEqual(me);
    expect((await c.families.getMyFamily())?.name).toBe('Minha família');
  });
});

describe('useLoadDemoFamily', () => {
  const render = (container: AppContainer) => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    return renderHook(() => useLoadDemoFamily(), {
      wrapper: ({ children }) => (
        <AppProviders container={container} queryClient={queryClient}>
          {children}
        </AppProviders>
      ),
    });
  };

  it('no modo demo carrega a família no container do app', async () => {
    const c = await signedIn();
    const { result } = await render(c);
    let outcome: Awaited<ReturnType<typeof loadDemoFamily>> | undefined;
    await act(async () => {
      outcome = await result.current.mutateAsync();
    });
    expect(outcome?.created).toBe(true);
    expect(await c.members.listByFamily(outcome!.familyId)).toHaveLength(4);
  });

  it('fora do modo demo rejeita sem gravar', async () => {
    const c = await signedIn();
    const createFamily = jest.spyOn(c.families, 'createFamily');
    const { result } = await render({ ...c, mode: 'supabase' });
    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(/modo demonstração/);
    });
    expect(createFamily).not.toHaveBeenCalled();
  });
});
