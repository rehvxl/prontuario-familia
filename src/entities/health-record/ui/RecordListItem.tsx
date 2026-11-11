import { View } from 'react-native';
import { Icon, ListItem, formatDate, useTheme } from '@/shared/ui';
import type { HealthRecord } from '../domain/health-record';
import { recordTypeLabel } from '../domain/labels';
import { RECORD_TYPE_APPEARANCE } from './recordTypeAppearance';

export interface RecordListItemProps {
  record: HealthRecord;
  /** Nome da pessoa (na busca, que mistura pessoas). */
  memberName?: string;
  onPress?: () => void;
}

/**
 * Registro como linha de lista (use dentro de `ListSection`): ícone do tipo na cor da categoria,
 * título, "tipo · pessoa · onde" e a data. O tipo sempre aparece por escrito, nunca só pela cor.
 */
export function RecordListItem({ record, memberName, onPress }: RecordListItemProps) {
  const theme = useTheme();
  const { colorIndex, icon } = RECORD_TYPE_APPEARANCE[record.type];
  const color = theme.categorical[colorIndex];
  const files = record.attachments.length;
  const subtitle = [
    recordTypeLabel(record.type),
    memberName,
    record.professional ?? record.location,
    files > 0 ? (files === 1 ? '1 anexo' : `${files} anexos`) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <ListItem
      leading={
        <View style={{ width: 44, height: 44, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: color?.soft }}>
          <Icon name={icon} size={22} color={color?.main ?? 'textPrimary'} />
        </View>
      }
      title={record.title}
      subtitle={subtitle}
      meta={formatDate(record.date, 'short')}
      onPress={onPress}
      chevron
      testID={`record-card-${record.id}`}
    />
  );
}
