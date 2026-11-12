import type { ColorTokens } from '../tokens';
import type { SemanticIconName } from './Icon';

/**
 * Estado de um valor contra a faixa impressa no laudo. Mesmos literais de `ReferenceFlag`
 * (`entities/measurement`), que faz o cálculo (`computeFlag`); o shared/ui só recebe o estado pronto.
 */
export type ReferenceState = 'in' | 'high' | 'low' | 'none';
/** Faixa impressa no laudo. Sem `low` nem `high` não há faixa numérica (só texto ou nada). */
export interface ReferenceRange {
  low?: number;
  high?: number;
  text?: string;
}
/** Confiança da leitura do documento, sempre dita em palavras (nunca porcentagem). */
export type Confidence = 'high' | 'medium' | 'low';

interface StateAppearance {
  /** Texto da A2 / §5 da spec. É sempre o rótulo de acessibilidade. */
  long: string;
  short: string;
  icon: SemanticIconName;
  main: keyof ColorTokens;
  soft: keyof ColorTokens;
  onSoft: keyof ColorTokens;
}

/** Escala clínica v3: ícone + rótulo + trio de cor. Nunca vermelho. */
export const REFERENCE_STATE_APPEARANCE: Readonly<Record<ReferenceState, StateAppearance>> = {
  in: { long: 'Dentro da faixa do laudo', short: 'Dentro da faixa', icon: 'stateIn', main: 'clinicalIn', soft: 'clinicalInSoft', onSoft: 'onClinicalInSoft' },
  high: { long: 'Acima da faixa do laudo', short: 'Acima da faixa', icon: 'stateHigh', main: 'clinicalHigh', soft: 'clinicalHighSoft', onSoft: 'onClinicalHighSoft' },
  low: { long: 'Abaixo da faixa do laudo', short: 'Abaixo da faixa', icon: 'stateLow', main: 'clinicalLow', soft: 'clinicalLowSoft', onSoft: 'onClinicalLowSoft' },
  none: { long: 'Sem faixa no laudo', short: 'Sem faixa', icon: 'stateNone', main: 'clinicalNone', soft: 'clinicalNoneSoft', onSoft: 'onClinicalNoneSoft' },
};

/** "Acima da faixa do laudo" → "acima da faixa do laudo", para compor rótulos lidos em sequência. */
export const spokenState = (state: ReferenceState) => REFERENCE_STATE_APPEARANCE[state].long.toLocaleLowerCase('pt-BR');
