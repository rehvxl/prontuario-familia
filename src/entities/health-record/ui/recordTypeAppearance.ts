import { NEUTRAL_CATEGORICAL, type CategoricalIndex, type ChipGroupOption, type IconName } from '@/shared/ui';
import { RECORD_TYPES, type RecordType } from '../domain/health-record';
import { RECORD_TYPE_LABELS } from '../domain/labels';

/**
 * Ícone de cada tipo de registro (docs/DESIGN_SYSTEM.md §8, v4). Na pasta com divisórias a cor é da pessoa:
 * todo tipo usa a entrada neutra da paleta (`NEUTRAL_CATEGORICAL`, tinta) e se distingue pelo ícone e pelo
 * rótulo, sempre escritos juntos. Assim um exame nunca "parece" ser do Carlos por ter a cor dele.
 */
const NEUTRAL: CategoricalIndex = NEUTRAL_CATEGORICAL;
export const RECORD_TYPE_APPEARANCE: Readonly<Record<RecordType, { colorIndex: CategoricalIndex; icon: IconName }>> = {
  result: { colorIndex: NEUTRAL, icon: 'flask' },
  consultation: { colorIndex: NEUTRAL, icon: 'stethoscope' },
  exam: { colorIndex: NEUTRAL, icon: 'clipboard' },
  other: { colorIndex: NEUTRAL, icon: 'folder' },
  vaccine: { colorIndex: NEUTRAL, icon: 'shot' },
  prescription: { colorIndex: NEUTRAL, icon: 'pills' },
  report: { colorIndex: NEUTRAL, icon: 'fileText' },
};

/** Opções prontas para `ChipGroup` (filtros) e `Select`/`SegmentedControl` de tipo de registro. */
export const RECORD_TYPE_OPTIONS: readonly ChipGroupOption<RecordType>[] = RECORD_TYPES.map((value) => ({
  value,
  label: RECORD_TYPE_LABELS[value],
  icon: RECORD_TYPE_APPEARANCE[value].icon,
  colorIndex: RECORD_TYPE_APPEARANCE[value].colorIndex,
}));
