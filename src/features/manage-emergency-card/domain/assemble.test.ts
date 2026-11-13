import { assembleEmergencyCard, calendarDay, emergencyPhoneUrl, personDetail } from './assemble';
import { contactError, formToDraft } from './form';

const member = { fullName: 'Ana Souza', birthDate: '1959-03-01', relationship: 'parent', sex: 'female' };
const med = (over: Partial<{ startOn: string; endOn: string | null; name: string; sourceRecordId: string | null }> = {}) => ({
  id: over.name ?? 'm',
  name: over.name ?? 'Losartana',
  dosage: '50 mg',
  instructions: null,
  startOn: over.startOn ?? '2026-01-01',
  endOn: over.endOn ?? null,
  sourceRecordId: over.sourceRecordId ?? null,
});

describe('assembleEmergencyCard', () => {
  it('fica só com remédios em uso e monta a origem', () => {
    const records = new Map([['r1', { title: 'Receita', date: '2026-11-05' }]]);
    const view = assembleEmergencyCard(
      member,
      null,
      [
        med({ name: 'Losartana' }),
        med({ name: 'Amoxicilina', endOn: '2026-11-01' }),
        med({ name: 'Futuro', startOn: '2026-12-01' }),
        med({ name: 'Do documento', sourceRecordId: 'r1' }),
        med({ name: 'Sem título', sourceRecordId: 'sumiu' }),
      ],
      '2026-11-12',
      records,
    );
    expect(view.medications.map((item) => item.name)).toEqual(['Losartana', 'Do documento', 'Sem título']);
    expect(view.medications.map((item) => item.origin)).toEqual(['Registrado por você', 'Do documento Receita, 5 de nov. de 2026', 'Do documento de origem']);
  });

  it('identificação, telefone e contato incompleto', () => {
    expect(personDetail(member, new Date(2026, 10, 12))).toBe('Mãe · 67 anos');
    expect(personDetail({ ...member, birthDate: null }, new Date(2026, 10, 12))).toBe('Mãe');
    expect(emergencyPhoneUrl('+55 (11) 99999-0000')).toBe('tel:+5511999990000');
    expect(contactError({ name: 'Marina', relation: '', phone: '' })).toBe('Informe o nome e o telefone deste contato.');
    expect(contactError({ name: '', relation: '', phone: '' })).toBeNull();
    expect(() => formToDraft({ bloodType: 'unknown', noKnownAllergies: false, allergies: [], conditions: [], contacts: [{ name: 'Marina', relation: 'irmã', phone: '' }], notes: '' })).toThrow(
      /nome e o telefone/,
    );
    expect(calendarDay('2026-11-12T02:30:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
