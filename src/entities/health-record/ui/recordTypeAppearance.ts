import type { CategoricalIndex, ChipGroupOption, IconName } from '@/shared/ui';
import { RECORD_TYPES, type RecordType } from '../domain/health-record';
import { RECORD_TYPE_LABELS } from '../domain/labels';

/** Cor (divisória) e ícone de cada tipo de registro (docs/DESIGN_SYSTEM.md §6). Sempre mostrar o rótulo junto. */
export const RECORD_TYPE_APPEARANCE: Readonly<Record<RecordType, { colorIndex: CategoricalIndex; icon: IconName }>> = {
  consultation: { colorIndex: 0, icon: 'medkit-outline' },
  exam: { colorIndex: 1, icon: 'flask-outline' },
  result: { colorIndex: 2, icon: 'pulse-outline' },
  report: { colorIndex: 5, icon: 'document-text-outline' },
  prescription: { colorIndex: 3, icon: 'clipboard-outline' },
  vaccine: { colorIndex: 4, icon: 'eyedrop-outline' },
  other: { colorIndex: 6, icon: 'folder-open-outline' },
};

/** Opções prontas para `ChipGroup` (filtros) e `Select`/`SegmentedControl` de tipo de registro. */
export const RECORD_TYPE_OPTIONS: readonly ChipGroupOption<RecordType>[] = RECORD_TYPES.map((value) => ({
  value,
  label: RECORD_TYPE_LABELS[value],
  icon: RECORD_TYPE_APPEARANCE[value].icon,
  colorIndex: RECORD_TYPE_APPEARANCE[value].colorIndex,
}));
