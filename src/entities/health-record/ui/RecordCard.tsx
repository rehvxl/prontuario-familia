import { StyleSheet, View } from 'react-native';
import { Badge, Card, Icon, Text, formatDate } from '@/shared/ui';
import type { HealthRecord } from '../domain/health-record';
import { recordTypeLabel } from '../domain/labels';
import { RECORD_TYPE_APPEARANCE } from './recordTypeAppearance';

export interface RecordCardProps {
  record: HealthRecord;
  /** Nome da pessoa (na busca, que mistura pessoas). */
  memberName?: string;
  onPress?: () => void;
}

/** Registro na linha do tempo e na busca: aba da divisória na cor do tipo, rótulo do tipo, título e data. */
export function RecordCard({ record, memberName, onPress }: RecordCardProps) {
  const { colorIndex, icon } = RECORD_TYPE_APPEARANCE[record.type];
  const typeLabel = recordTypeLabel(record.type);
  const date = formatDate(record.date, 'long');
  const where = [record.professional, record.location].filter(Boolean).join(' · ');
  const files = record.attachments.length;
  const filesLabel = files === 1 ? '1 anexo' : `${files} anexos`;
  const label = [record.title, typeLabel, memberName, date, where, files > 0 ? filesLabel : null].filter(Boolean).join(', ');

  return (
    <Card tab={colorIndex} onPress={onPress} accessibilityLabel={label} testID={`record-card-${record.id}`}>
      <View style={styles.top}>
        <Badge label={typeLabel} colorIndex={colorIndex} icon={icon} />
        {files > 0 ? (
          <View style={styles.files}>
            <Icon name="attach-outline" size={16} color="textSecondary" />
            <Text variant="caption" color="secondary">
              {filesLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <Text variant="headline" style={styles.title}>
        {record.title}
      </Text>
      <Text variant="subhead" color="secondary">
        {[memberName, date].filter(Boolean).join(' · ')}
      </Text>
      {where ? (
        <Text variant="subhead" color="secondary">
          {where}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  files: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { marginTop: 8 },
});
