import { Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { CategoricalIndex } from '../tokens';
import { useTheme } from '../theme';
import { FocusRing, useFocusState } from '../lib/focus';
import { selectionFeedback } from '../lib/haptics';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { useScreenHorizontalInset } from './Screen';

const CHIP_HEIGHT = 36;

export interface ChipProps {
  label: string;
  /** Sem onPress o chip é só informativo. */
  onPress?: () => void;
  /** Estado de seleção (FilterChip). Selecionado: `primarySoft` + ✓, sem contorno — não depende só da cor. */
  selected?: boolean;
  icon?: IconName;
  /** Marcador da paleta categórica (0..6 pessoa, 7 neutro — tipos de registro são neutros na v4). */
  colorIndex?: CategoricalIndex;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function Chip({ label, onPress, selected, icon, colorIndex, disabled = false, accessibilityLabel, testID }: ChipProps) {
  const theme = useTheme();
  const focus = useFocusState();
  const cat = colorIndex !== undefined ? theme.categorical[colorIndex] : undefined;
  const isSelected = !!selected;
  // Não selecionado = contorno `borderStrong`; selecionado = `soft` da divisória + ✓, sem contorno.
  const bg = isSelected ? theme.colors.primarySoft : theme.colors.surface;
  const fgColor = isSelected ? theme.colors.onPrimarySoft : theme.colors.textPrimary;
  const border = isSelected ? 'transparent' : theme.colors.borderStrong;
  const slop = Math.max(0, (theme.minTouchTarget - CHIP_HEIGHT) / 2);
  const radius = theme.radii.full;

  const body = (
    <>
      {isSelected ? (
        <Icon name="checkmark" size={18} color={fgColor} />
      ) : icon ? (
        <Icon name={icon} size={18} color={cat?.main ?? 'textSecondary'} />
      ) : cat ? (
        <View style={[styles.dot, { backgroundColor: cat.main }]} />
      ) : null}
      <Text variant="subhead" style={{ color: disabled ? theme.colors.textDisabled : fgColor, fontWeight: isSelected ? '600' : '500' }} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    styles.chip,
    { minHeight: CHIP_HEIGHT, borderRadius: radius, backgroundColor: bg, borderColor: border, paddingHorizontal: theme.space[3] + 2, gap: theme.space[1] + 2 },
  ];

  if (!onPress) {
    return (
      <View style={containerStyle} accessible accessibilityLabel={accessibilityLabel ?? label} testID={testID}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        selectionFeedback();
        onPress();
      }}
      disabled={disabled}
      hitSlop={{ top: slop, bottom: slop }}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: isSelected, disabled }}
      android_ripple={{ color: theme.colors.border, foreground: true }}
      testID={testID}
      style={({ pressed }) => [containerStyle, pressed && Platform.OS !== 'android' && { opacity: 0.7 }]}
    >
      {body}
      <FocusRing visible={focus.focused} radius={CHIP_HEIGHT / 2} />
    </Pressable>
  );
}

/** Chip de filtro (liga/desliga). Igual a Chip, com `selected` obrigatório. */
export function FilterChip(props: ChipProps & { selected: boolean; onPress: () => void }) {
  return <Chip {...props} />;
}

export interface ChipGroupOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  colorIndex?: CategoricalIndex;
}

export interface ChipGroupProps<T extends string> {
  options: readonly ChipGroupOption<T>[];
  /** Valores selecionados. Vazio = nenhum filtro. */
  value: readonly T[];
  onChange: (value: T[]) => void;
  /** Padrão true (seleção múltipla). Com false, tocar escolhe um só (tocar de novo desmarca). */
  multiple?: boolean;
  /** Se informado, mostra um primeiro chip (ex.: "Todos") selecionado quando nada está filtrado; tocar limpa. */
  allLabel?: string;
  /**
   * Recuo lateral do conteúdo rolável. Padrão: margem da tela. O primeiro chip alinha com a margem e a
   * rolagem sangra até a borda: dentro de um `Screen` com padding, o grupo desfaz o recuo do Screen.
   */
  inset?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Linha horizontal rolável de FilterChips. */
export function ChipGroup<T extends string>({ options, value, onChange, multiple = true, allLabel, inset, style, testID }: ChipGroupProps<T>) {
  const theme = useTheme();
  const screenInset = useScreenHorizontalInset();
  const pad = inset ?? (screenInset || theme.layout.screenGutter);
  const toggle = (v: T) => {
    const isOn = value.includes(v);
    if (multiple) onChange(isOn ? value.filter((x) => x !== v) : [...value, v]);
    else onChange(isOn ? [] : [v]);
  };
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ flexGrow: 0, flexShrink: 0, marginHorizontal: -screenInset }, style]}
      testID={testID}
      contentContainerStyle={{ paddingHorizontal: pad, paddingVertical: theme.space[1], gap: theme.space[2] }}
    >
      {allLabel ? <FilterChip label={allLabel} selected={value.length === 0} onPress={() => onChange([])} /> : null}
      {options.map((opt) => (
        <FilterChip
          key={opt.value}
          label={opt.label}
          icon={opt.icon}
          colorIndex={opt.colorIndex}
          selected={value.includes(opt.value)}
          onPress={() => toggle(opt.value)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, alignSelf: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
