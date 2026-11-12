import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { useStackedLayout } from '../lib/a11y';
import { SectionHeader } from './SectionHeader';
import { Text } from './Text';

export interface SummaryCardProps {
  /** Vai num `SectionHeader` acima do grupo, fora dele. */
  title?: string;
  children: ReactNode;
  /** Rodapé de 13 pt fora do grupo (ex.: aviso A1). */
  footer?: string;
  /** Mostra "Ver tudo" no cabeçalho (precisa de `title`). */
  onPressMore?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Grupo (folha `surface`, raio 16, fio) com cabeçalho serifado e rodapé. Não aninhe outro cartão. */
export function SummaryCard({ title, children, footer, onPressMore, style, testID }: SummaryCardProps) {
  const theme = useTheme();
  return (
    <View style={style} testID={testID}>
      {title ? <SectionHeader title={title} action={onPressMore ? { label: 'Ver tudo', onPress: onPressMore } : undefined} /> : null}
      <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.card }]}>
        {children}
      </View>
      {footer ? (
        <Text variant="footnote" color="secondary" style={{ marginTop: theme.space[2] }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export interface StatTileProps {
  /** Já formatado ("2", "1.024"). */
  value: string;
  label: string;
  /** Padrão "{value} {label}". */
  accessibilityLabel?: string;
  testID?: string;
}

/** Contagem calma: número SF 600 28/34 tabular (sem serifa) + rótulo `footnote`. Use dentro de `StatTileGroup`. */
export function StatTile({ value, label, accessibilityLabel, testID }: StatTileProps) {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel={accessibilityLabel ?? `${value} ${label}`} testID={testID} style={[styles.tile, { padding: theme.space[4], gap: 2 }]}>
      {/* Tamanho do title1 sem a serifa: é contagem, não título. */}
      <Text variant="metric" style={styles.count}>
        {value}
      </Text>
      <Text variant="footnote" color="secondary">
        {label}
      </Text>
    </View>
  );
}

/** Faixa de 2–3 `StatTile` num único grupo, separados por fio vertical. Em AX3+ empilham. */
export function StatTileGroup({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const theme = useTheme();
  const stacked = useStackedLayout();
  const items = Children.toArray(children).filter(isValidElement);
  const divider = stacked ? { height: 1, alignSelf: 'stretch' as const } : { width: 1, alignSelf: 'stretch' as const };
  return (
    <View
      testID={testID}
      style={[styles.group, { flexDirection: stacked ? 'column' : 'row', backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.card }, style]}
    >
      {items.map((child, i) => (
        <Fragment key={child.key ?? i}>
          {i > 0 ? <View style={[divider, { backgroundColor: theme.colors.border }]} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, overflow: 'hidden', borderCurve: 'continuous' },
  tile: { flex: 1 },
  count: { fontSize: 28, lineHeight: 34 },
});
