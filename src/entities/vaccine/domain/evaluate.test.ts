import { evaluateVaccines, isUpToDate } from './evaluate';
import type { RuleEvaluation, VaccineDose, VaccineEvaluation, VaccineRuleDismissal } from './types';

const TODAY = '2026-11-11';
let seq = 0;

function dose(vaccineCode: string, appliedOn: string | null, extra: Partial<VaccineDose> = {}): VaccineDose {
  seq += 1;
  return {
    id: `d${seq}`,
    familyId: 'f1',
    memberId: 'm1',
    vaccineCode,
    vaccineName: null,
    doseKey: 'D1',
    doseLabel: '1ª dose',
    appliedOn,
    lot: null,
    location: null,
    sourceRecordId: null,
    origin: 'manual',
    createdAt: `2026-11-01T10:00:${String(seq % 60).padStart(2, '0')}Z`,
    updatedAt: '2026-11-01T10:00:00Z',
    ...extra,
  };
}

function evaluate(birthDate: string | null, doses: VaccineDose[] = [], today = TODAY, dismissals: VaccineRuleDismissal[] = []) {
  return evaluateVaccines({ birthDate, doses, dismissals, today });
}

const find = (e: VaccineEvaluation, id: string): RuleEvaluation => {
  const found = e.calendar.find((r) => r.rule.id === id) ?? e.pending.find((r) => r.rule.id === id);
  if (!found) throw new Error(`regra ${id} fora da avaliação`);
  return found;
};
/** 'outside' = a regra não está no "Calendário para a idade" nem nas pendências. */
const status = (birth: string, id: string, doses: VaccineDose[] = [], today = TODAY) => {
  const e = evaluate(birth, doses, today);
  return (e.calendar.find((r) => r.rule.id === id) ?? e.pending.find((r) => r.rule.id === id))?.status ?? 'outside';
};

// Spec F3.3: nascimento em 10/01/2026, hoje 11/11/2026 (10 meses).
const LIA = '2026-01-10';

describe('evaluateVaccines: exemplos da F3.3', () => {
  it('penta D3 (6 m = 10/07/2026) sem registro: rec + 30 = 09/08/2026 < hoje → Atrasada pelo calendário', () => {
    const penta = find(evaluate(LIA), 'penta_d3');
    expect(penta).toMatchObject({ status: 'late', dueFrom: '2026-07-10' });
  });

  it('febre amarela D1 (9 m = 10/10/2026): 32 dias depois → Atrasada; com hoje em 09/11/2026 (30 dias) → Pendente', () => {
    expect(find(evaluate(LIA), 'yellow_fever_d1')).toMatchObject({ status: 'late', dueFrom: '2026-10-10' });
    expect(status(LIA, 'yellow_fever_d1', [], '2026-11-09')).toBe('due');
  });

  it('SCR D1 (12 m = 10/01/2027): faltam 60 dias → Prevista; a partir de 11/12/2026 → Próxima', () => {
    expect(find(evaluate(LIA), 'mmr_d1')).toMatchObject({ status: 'planned', dueFrom: '2027-01-10' });
    expect(status(LIA, 'mmr_d1', [], '2026-12-10')).toBe('planned');
    expect(status(LIA, 'mmr_d1', [], '2026-12-11')).toBe('next');
  });

  it('rotavírus D2 sem registro aos 24 meses (10/01/2028) → Sem registro, sem pendência', () => {
    const withD1 = [dose('rotavirus', '2026-03-10')];
    expect(status(LIA, 'rotavirus_d2', withD1, '2028-01-09')).toBe('late');
    // Aos 24 meses a janela terminou: sem registro, sem pendência e fora do calendário da idade.
    const at24m = evaluate(LIA, withD1, '2028-01-10');
    expect(status(LIA, 'rotavirus_d2', withD1, '2028-01-10')).toBe('outside');
    expect(at24m.pending.map((p) => p.rule.id)).not.toContain('rotavirus_d2');
  });
});

describe('R7: idade por calendário (aniversário + meses), véspera e dia exato', () => {
  it('hepatite B ao nascer vale até a véspera de 1 mês', () => {
    expect(status(LIA, 'hepatitis_b_birth', [], '2026-02-09')).toBe('due');
    expect(status(LIA, 'hepatitis_b_birth', [], '2026-02-10')).toBe('outside');
  });

  it('penta D1 aos 2 meses: Próxima a partir de rec − 30, Pendente no dia exato', () => {
    expect(status(LIA, 'penta_d1', [], '2026-02-07')).toBe('planned');
    expect(status(LIA, 'penta_d1', [], '2026-02-08')).toBe('next');
    expect(status(LIA, 'penta_d1', [], '2026-03-09')).toBe('next');
    expect(status(LIA, 'penta_d1', [], '2026-03-10')).toBe('due');
  });

  it('31/01 + 2 meses é 31/03, não 1/4 por dias / 30', () => {
    expect(find(evaluate('2026-01-31', [], '2026-02-01'), 'penta_d1').dueFrom).toBe('2026-03-31');
    expect(find(evaluate('2026-01-31', [], '2026-02-01'), 'hepatitis_b_birth').status).toBe('due');
    // 31/01 + 1 mês = 28/02 (último dia do mês): a janela da hepatite B ao nascer termina na véspera.
    expect(status('2026-01-31', 'hepatitis_b_birth', [], '2026-02-27')).toBe('due');
    expect(status('2026-01-31', 'hepatitis_b_birth', [], '2026-02-28')).toBe('outside');
  });

  it('rotavírus D1 até a véspera de 12 meses; sem D1, a D2 também não se aplica', () => {
    expect(status(LIA, 'rotavirus_d1', [], '2027-01-09')).toBe('late');
    expect(status(LIA, 'rotavirus_d1', [], '2027-01-10')).toBe('outside');
    expect(status(LIA, 'rotavirus_d2', [], '2027-01-09')).toBe('late');
    expect(status(LIA, 'rotavirus_d2', [], '2027-01-10')).toBe('noRecord');
  });
});

describe('R8: contagem da série', () => {
  it('conta doses sem data e as vacinas de "conta como"', () => {
    const e = evaluate(LIA, [dose('penta', null), dose('penta', '2026-05-10')]);
    expect(find(e, 'penta_d1').status).toBe('applied');
    expect(find(e, 'penta_d2').status).toBe('applied');
    expect(find(e, 'penta_d3').status).toBe('late');
    expect(find(e, 'ipv_d1').status).toBe('late');
  });

  it('pneumocócica: aos 13 m sem histórico, D1 e D2 ficam sem registro e o reforço fica atrasado', () => {
    const birth = '2025-10-01';
    const e = evaluate(birth);
    expect(status(birth, 'pcv_d1')).toBe('outside');
    expect(status(birth, 'pcv_d2')).toBe('outside');
    expect(e.pending.map((p) => p.rule.id)).not.toEqual(expect.arrayContaining(['pcv_d1']));
    expect(find(e, 'pcv_r').status).toBe('late');
    // Na véspera de 12 meses, D1 e D2 ainda estão na janela, atrasadas pelo calendário.
    expect(status(birth, 'pcv_d1', [], '2026-09-30')).toBe('late');
  });

  it('pneumocócica: uma dose a partir de 12 m completa a série, e VPC13/VPC15 contam (L5)', () => {
    const birth = '2025-10-01';
    expect(status(birth, 'pcv_r', [dose('pcv13', '2026-10-05')])).toBe('applied');
    expect(status(birth, 'pcv_r', [dose('pcv15', '2026-10-05')])).toBe('applied');
    expect(status(birth, 'pcv_r', [dose('pcv10', '2025-12-01'), dose('pcv10', '2026-02-01')])).toBe('late');
    expect(status(birth, 'pcv_d1', [dose('pcv13', '2025-12-01')], '2026-09-01')).toBe('applied');
  });

  it('men ACWY aos 12 m: men C a partir de 12 m conta como vacinado', () => {
    const birth = '2025-10-01';
    expect(status(birth, 'menacwy_r')).toBe('late');
    expect(status(birth, 'menacwy_r', [dose('menc', '2026-10-20')])).toBe('applied');
  });

  it('tetraviral conta para tríplice viral e varicela', () => {
    const birth = '2024-01-10';
    const e = evaluate(birth, [dose('mmrv', '2025-04-10'), dose('mmr', '2025-01-10')]);
    expect(find(e, 'mmr_d1').status).toBe('applied');
    expect(find(e, 'mmr_d2').status).toBe('applied');
    expect(find(e, 'varicella_d1').status).toBe('applied');
    expect(find(e, 'varicella_d2').status).toBe('planned');
  });

  it('men ACWY do adolescente: a dose dos 12 m não substitui a dos 11 anos', () => {
    const birth = '2014-06-01'; // 12 anos
    expect(status(birth, 'menacwy_teen', [dose('menacwy', '2015-06-10')])).toBe('late');
    expect(status(birth, 'menacwy_teen', [dose('menacwy', '2015-06-10'), dose('menacwy', '2025-07-01')])).toBe('applied');
  });
});

describe('R9: tolerância de 30 dias', () => {
  it('30 dias exatos depois da data recomendada → Pendente; 31 → Atrasada pelo calendário', () => {
    expect(status(LIA, 'yellow_fever_d1', [], '2026-11-09')).toBe('due');
    expect(status(LIA, 'yellow_fever_d1', [], '2026-11-10')).toBe('late');
  });
});

describe('R10: "conforme histórico" no adulto', () => {
  const ANA = '1988-03-15'; // 38 anos

  it('sem registro → Confirmar na carteira, nunca Atrasada', () => {
    const e = evaluate(ANA);
    expect(e.pending.some((p) => p.status === 'late')).toBe(false);
    expect(e.pending.filter((p) => p.status === 'confirm').map((p) => p.rule.id).sort()).toEqual(
      ['dt_basic', 'hepatitis_b_history', 'mmr_adult', 'yellow_fever_history'].sort(),
    );
    expect(isUpToDate(e)).toBe(false);
  });

  it('não mostra regras da criança nem influenza para quem tem 38 anos', () => {
    const ids = evaluate(ANA).calendar.map((c) => c.rule.id);
    expect(ids).not.toContain('penta_d1');
    expect(ids).not.toContain('influenza_child');
    expect(ids).not.toContain('influenza_elder');
  });

  it('febre amarela: dose a partir dos 5 anos ou 2 doses antes dos 5 completam; 1 dose antes dos 5 pede confirmação', () => {
    expect(status(ANA, 'yellow_fever_history', [dose('yellow_fever', '1991-01-10')])).toBe('confirm');
    expect(status(ANA, 'yellow_fever_history', [dose('yellow_fever', '1994-01-10')])).toBe('applied');
    expect(status(ANA, 'yellow_fever_history', [dose('yellow_fever', '1989-01-10'), dose('yellow_fever', '1992-01-10')])).toBe('applied');
  });

  it('tríplice viral: 2 doses até 29 anos, 1 dose de 30 a 59', () => {
    expect(status('2000-01-01', 'mmr_teen', [dose('mmr', null)])).toBe('confirm');
    expect(status('2000-01-01', 'mmr_teen', [dose('mmr', null), dose('mmr', null)])).toBe('applied');
    expect(status(ANA, 'mmr_adult', [dose('mmr', null)])).toBe('applied');
  });
});

describe('calendário para a idade: limite de 12 meses', () => {
  it('a regra que começa daqui a 12 meses exatos entra; a do dia seguinte, não', () => {
    // ipv_r2 começa aos 4 anos: 2026-11-11 para quem nasceu em 2022-11-11.
    expect(status('2022-11-11', 'ipv_r2', [], '2025-11-11')).toBe('planned');
    expect(status('2022-11-12', 'ipv_r2', [], '2025-11-11')).toBe('outside');
  });
});

describe('R11: reforço periódico', () => {
  const ADULT = '1986-05-20';
  const basic = [dose('dt', '2000-01-01'), dose('dt', '2000-03-01')];

  it('dT: última dose com toxoide + 10 anos, com Próxima, Pendente e Atrasada pela R9', () => {
    expect(find(evaluate(ADULT, [...basic, dose('dt', '2016-12-01')]), 'dt_booster')).toMatchObject({ status: 'next', dueFrom: '2026-12-01' });
    expect(status(ADULT, 'dt_booster', [...basic, dose('dtpa', '2016-11-11')])).toBe('due');
    expect(status(ADULT, 'dt_booster', [...basic, dose('dt', '2016-10-11')])).toBe('late');
    expect(find(evaluate(ADULT, [...basic, dose('dt', '2020-01-01')]), 'dt_booster')).toMatchObject({ status: 'planned', dueFrom: '2030-01-01' });
  });

  it('dT: penta e DTP da infância contam; sem o 2º reforço da DTP, o próximo é 10 anos após o 1º', () => {
    const birth = '2014-01-10'; // 12 anos
    const childhood = [dose('penta', '2014-03-10'), dose('penta', '2014-05-10'), dose('penta', '2014-07-10'), dose('dtp', '2015-04-10')];
    const e = evaluate(birth, childhood);
    expect(find(e, 'dt_basic').status).toBe('applied');
    expect(find(e, 'dt_booster')).toMatchObject({ status: 'late', dueFrom: '2025-04-10' });
  });

  it('dT com dose de dT/dTpa registrada: o reforço acompanha e o esquema básico não entra nas pendências', () => {
    for (const code of ['dt', 'dtpa']) {
      const e = evaluate(ADULT, [dose(code, '2020-01-01')]);
      expect(find(e, 'dt_booster')).toMatchObject({ status: 'planned', dueFrom: '2030-01-01' });
      expect(e.pending.map((p) => p.rule.id)).not.toContain('dt_basic');
      expect(e.calendar.find((c) => c.rule.id === 'dt_basic')?.status).toBe('confirm');
    }
    // Reforço vencido continua como único item da série.
    const late = evaluate(ADULT, [dose('dt', '2014-01-01')]);
    expect(late.pending.filter((p) => p.rule.series === 'dt').map((p) => [p.rule.id, p.status])).toEqual([['dt_booster', 'late']]);
  });

  it('dT só com doses da infância (penta) ou só com dose sem data: o esquema básico continua pedindo confirmação', () => {
    expect(evaluate(ADULT, [dose('penta', '1987-01-01')]).pending.map((p) => p.rule.id)).toContain('dt_basic');
    expect(evaluate(ADULT, [dose('dt', null)]).pending.map((p) => p.rule.id)).toContain('dt_basic');
  });

  it('dT sem nenhuma dose → um só item, Confirmar na carteira (esquema básico)', () => {
    const e = evaluate(ADULT);
    expect(find(e, 'dt_basic').status).toBe('confirm');
    expect(find(e, 'dt_booster')).toMatchObject({ status: 'planned', dueFrom: null });
    expect(e.pending.filter((p) => p.rule.series === 'dt')).toHaveLength(1);
  });

  it('covid-19 a partir de 60 anos: última dose + 6 meses; sem dose → Pendente', () => {
    const ELDER = '1950-03-01';
    expect(status(ELDER, 'covid19_periodic')).toBe('due');
    expect(find(evaluate(ELDER, [dose('covid19', '2026-06-01')]), 'covid19_periodic')).toMatchObject({ status: 'next', dueFrom: '2026-12-01' });
    expect(status(ELDER, 'covid19_periodic', [dose('covid19', '2026-04-01')])).toBe('late');
    expect(status(ELDER, 'covid19_periodic', [dose('covid19', '2026-09-01')])).toBe('planned');
  });
});

describe('R12: influenza por ano civil', () => {
  const DIRCE = '1950-03-01';
  const CHILD = '2024-05-01'; // 2 anos e meio

  it('60 anos ou mais: Pendente sem dose no ano corrente (F7.3, "Influenza de 2026, pendente")', () => {
    expect(find(evaluate(DIRCE), 'influenza_elder')).toMatchObject({ status: 'due', dueFrom: '2026-01-01' });
    expect(status(DIRCE, 'influenza_elder', [dose('influenza', '2026-04-15')])).toBe('applied');
    expect(status(DIRCE, 'influenza_elder', [dose('influenza', '2025-05-01')])).toBe('due');
  });

  it('dose sem data não conta para o ano', () => {
    expect(status(DIRCE, 'influenza_elder', [dose('influenza', null)])).toBe('due');
  });

  it('criança sem dose em anos anteriores precisa de 2 doses no ano, com 30 dias entre elas', () => {
    expect(find(evaluate(CHILD, [dose('influenza', '2026-04-01')]), 'influenza_child')).toMatchObject({ status: 'due', dueFrom: '2026-05-01' });
    expect(find(evaluate(CHILD, [dose('influenza', '2026-10-20')]), 'influenza_child')).toMatchObject({ status: 'next', dueFrom: '2026-11-19' });
    expect(status(CHILD, 'influenza_child', [dose('influenza', '2026-04-01'), dose('influenza', '2026-05-02')])).toBe('applied');
  });

  it('criança com dose em ano anterior precisa de 1 dose no ano', () => {
    expect(status(CHILD, 'influenza_child', [dose('influenza', '2025-05-01')])).toBe('due');
    expect(status(CHILD, 'influenza_child', [dose('influenza', '2025-05-01'), dose('influenza', '2026-05-01')])).toBe('applied');
    // Dose sem data é anterior: basta 1 dose com data no ano.
    expect(status(CHILD, 'influenza_child', [dose('influenza', null), dose('influenza', '2026-05-01')])).toBe('applied');
  });

  it('antes dos 6 meses → Próxima a partir dos 6 meses; a partir de 6 anos sai do calendário', () => {
    expect(find(evaluate('2026-05-20'), 'influenza_child')).toMatchObject({ status: 'next', dueFrom: '2026-11-20' });
    expect(status('2020-01-01', 'influenza_child')).toBe('outside');
  });
});

describe('R13: sem data de nascimento', () => {
  it('nenhuma regra é calculada; as doses continuam em Aplicadas', () => {
    const e = evaluate(null, [dose('bcg', '2026-01-11')]);
    expect(e).toMatchObject({ missingBirthDate: true, pending: [], calendar: [], other: [], notApplicable: [] });
    expect(e.applied).toHaveLength(1);
    expect(isUpToDate(e)).toBe(false);
    expect(evaluate('2026-02-30').missingBirthDate).toBe(true);
  });
});

describe('R14: em dia com o calendário', () => {
  it('em dia quando só há Próxima ou Prevista', () => {
    const ADULT = '1986-05-20';
    const e = evaluate(ADULT, [
      dose('hepatitis_b', '2005-01-01'), dose('hepatitis_b', '2005-02-01'), dose('hepatitis_b', '2005-07-01'),
      dose('dt', '2005-01-01'), dose('dt', '2005-03-01'), dose('dt', '2016-12-01'),
      dose('yellow_fever', '2010-01-01'),
      dose('mmr', null),
    ]);
    expect(e.pending.map((p) => p.status)).toEqual(['next']);
    expect(isUpToDate(e)).toBe(true);
  });

  it('não está em dia com Confirmar na carteira', () => {
    expect(isUpToDate(evaluate('1986-05-20'))).toBe(false);
  });
});

describe('seções da carteira (F3.1)', () => {
  it('pendências em ordem: Atrasada → Pendente → Confirmar → Próxima; dentro do tipo, a data mais antiga primeiro', () => {
    const e = evaluate(LIA, [], '2026-11-09');
    const order = ['late', 'due', 'confirm', 'next'];
    const statuses = e.pending.map((p) => p.status);
    expect([...statuses].sort((x, y) => order.indexOf(x) - order.indexOf(y))).toEqual(statuses);
    const late = e.pending.filter((p) => p.status === 'late').map((p) => p.dueFrom ?? '');
    expect([...late].sort()).toEqual(late);
    expect(e.pending[0]?.rule.id).toBe('bcg_du');
    expect(statuses).toContain('due');
  });

  it('aplicadas: data mais recente primeiro e "Data não informada" por último', () => {
    const e = evaluate(LIA, [dose('bcg', '2026-01-11'), dose('penta', null), dose('penta', '2026-03-10')]);
    expect(e.applied.map((d) => d.appliedOn)).toEqual(['2026-03-10', '2026-01-11', null]);
  });

  it('calendário para a idade: faixa atual e próximos 12 meses; outras indicações não geram pendência', () => {
    const e = evaluate(LIA);
    const ids = e.calendar.map((c) => c.rule.id);
    // Dentro da faixa (penta) e começando em até 12 meses (SCR aos 12 m, DTP aos 15 m em 10/04/2027).
    expect(ids).toEqual(expect.arrayContaining(['penta_d3', 'mmr_d1', 'dtp_r1']));
    // Faixa encerrada (hepatite B ao nascer), adulto, adolescente e reforço de dT em 2036 ficam de fora.
    expect(ids).not.toEqual(expect.arrayContaining(['hepatitis_b_birth']));
    for (const id of ['hpv4_du', 'dengue_d1', 'dt_basic', 'dt_booster', 'hepatitis_b_history', 'mmr_adult', 'influenza_elder', 'ipv_r2']) {
      expect(ids).not.toContain(id);
    }
    expect(e.calendar.every((c) => c.rule.automatic)).toBe(true);
    expect(e.other.map((r) => r.id)).toEqual(['covid19_special']);
    expect(e.pending.every((p) => p.rule.automatic)).toBe(true);
  });

  it('gestante e grupos especiais aparecem só em outras indicações (F3.8)', () => {
    const e = evaluate('1988-03-15');
    expect(e.other.map((r) => r.id)).toEqual(expect.arrayContaining(['dtpa_pregnancy', 'rsv_pregnancy', 'dtpa_health_workers']));
    expect(e.other.every((r) => !r.automatic && !!r.note)).toBe(true);
  });
});

describe('Não se aplica (F3.7)', () => {
  const dismissal: VaccineRuleDismissal = {
    id: 'x1', familyId: 'f1', memberId: 'm1', ruleId: 'varicella_d1', reason: 'had_disease', note: null, createdAt: '2026-11-01T10:00:00Z',
  };
  const BIRTH = '2024-01-10';

  it('a regra dispensada sai das pendências e vai para "Não se aplica", com o motivo', () => {
    const before = evaluate(BIRTH);
    expect(before.pending.map((p) => p.rule.id)).toContain('varicella_d1');
    const after = evaluate(BIRTH, [], TODAY, [dismissal]);
    expect(after.pending.map((p) => p.rule.id)).not.toContain('varicella_d1');
    expect(after.notApplicable).toEqual([expect.objectContaining({ status: 'notApplicable', dismissal })]);
  });

  it('dose registrada vale mais que a dispensa', () => {
    const e = evaluate(BIRTH, [dose('varicella', '2025-04-10')], TODAY, [dismissal]);
    expect(find(e, 'varicella_d1')).toMatchObject({ status: 'applied', dismissal: null });
    expect(e.notApplicable).toEqual([]);
  });
});
