import type { CategoricalIndex, ChipGroupOption, IconName } from '@/shared/ui';
import { RECORD_TYPES, type RecordType } from '../domain/health-record';
import { RECORD_TYPE_LABELS } from '../domain/labels';

/** Cor (acento) e ícone de cada tipo de registro (docs/DESIGN_SYSTEM.md §8). Sempre mostrar o rótulo junto. */
export const RECORD_TYPE_APPEARANCE: Readonly<Record<RecordType, { colorIndex: CategoricalIndex; icon: IconName }>> = {
  consultation: { colorIndex: 0, icon: 'stethoscope' },
  exam: { colorIndex: 1, icon: 'flask' },
  result: { colorIndex: 2, icon: 'pulse' },
  report: { colorIndex: 5, icon: 'fileText' },
  prescription: { colorIndex: 3, icon: 'clipboard' },
  vaccine: { colorIndex: 4, icon: 'shot' },
  other: { colorIndex: 6, icon: 'folder' },
};

/** Opções prontas para `ChipGroup` (filtros) e `Select`/`SegmentedControl` de tipo de registro. */
export const RECORD_TYPE_OPTIONS: readonly ChipGroupOption<RecordType>[] = RECORD_TYPES.map((value) => ({
  value,
  label: RECORD_TYPE_LABELS[value],
  icon: RECORD_TYPE_APPEARANCE[value].icon,
  colorIndex: RECORD_TYPE_APPEARANCE[value].colorIndex,
}));
