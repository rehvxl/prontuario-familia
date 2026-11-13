import { trackConsentEvent } from './analytics';

describe('trackConsentEvent', () => {
  it('aceita só os três nomes e não recebe payload', () => {
    expect(() => trackConsentEvent('consent_v3_shown')).not.toThrow();
    expect(() => trackConsentEvent('consent_v3_accepted')).not.toThrow();
    expect(() => trackConsentEvent('consent_v3_declined')).not.toThrow();
    expect(() => trackConsentEvent('consent_v3_shown', {})).not.toThrow();
  });

  it('rejeita nome fora da lista e qualquer valor, inclusive clínico', () => {
    expect(() => trackConsentEvent('page_view')).toThrow(/não permitido/);
    expect(() => trackConsentEvent('consent_v3_accepted', { allergies: 'dipirona' })).toThrow(/não recebe valores/);
    expect(() => trackConsentEvent('consent_v3_declined', { bloodType: 'A+' })).toThrow(/não recebe valores/);
  });
});
