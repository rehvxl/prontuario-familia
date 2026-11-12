import { Host, Menu, RNHostView, Section, Toggle } from '@expo/ui/swift-ui';
import { accessibilityHint, accessibilityLabel, accessibilityValue } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { selectionFeedback } from '../lib/haptics';
import { FieldLabel, FieldMessage, fieldAccessibilityHint } from './FieldMessage';
import { Icon } from './Icon';
import { SelectSheet, type SelectProps } from './SelectSheet';
import { Text } from './Text';

export type { SelectOption, SelectProps } from './SelectSheet';

/**
 * iOS: o campo abre um menu nativo (SwiftUI `Menu`, com vidro no iOS 26) com a opção atual marcada —
 * o padrão do Ajustes/Saúde para escolha única curta. Se alguma opção tiver `description`, usa a folha.
 */
export function Select<T extends string>(props: SelectProps<T>) {
  const { label, options, value, onChange, placeholder = 'Selecionar', helper, error, optional, disabled = false, testID } = props;
  const theme = useTheme();
  // O gatilho do MenuView (RNHostView com matchContents) encolhe até o conteúdo. Medimos a largura
  // disponível e fixamos o campo nela, para ocupar a largura toda como os demais campos.
  const [width, setWidth] = useState<number>();
  if (options.some((o) => o.description)) return <SelectSheet {...props} />;
  const current = options.find((o) => o.value === value) ?? null;

  const field = (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}${optional ? ', opcional' : ''}: ${current ? current.label : 'nenhum selecionado'}`}
      accessibilityHint={fieldAccessibilityHint(helper, error) ?? 'Abre a lista de opções'}
      accessibilityState={{ disabled }}
      style={[
        styles.field,
        {
          minHeight: theme.layout.controlHeight,
          borderRadius: theme.radii.field,
          borderWidth: error ? 2 : 1,
          borderColor: error ? theme.colors.danger : theme.colors.borderStrong,
          paddingHorizontal: theme.space[4] - (error ? 1 : 0),
          backgroundColor: disabled ? theme.colors.surfaceSunken : theme.colors.surface,
        },
      ]}
    >
      <Text variant="body" color={current ? (disabled ? 'disabled' : 'primary') : 'tertiary'} style={styles.flex}>
        {current ? current.label : placeholder}
      </Text>
      <Icon name="expand" size={16} weight="semibold" color="textSecondary" />
    </View>
  );

  return (
    <View>
      <FieldLabel label={label} optional={optional} />
      {/* Mede sempre (rotação, Dynamic Type, split view) e fixa o gatilho do menu nessa largura. */}
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} testID={testID ? `${testID}-frame` : undefined}>
        {disabled || width === undefined ? (
          <View testID={testID}>{field}</View>
        ) : (
          <SelectMenu
            title={label}
            testID={testID}
            options={options}
            value={value}
            a11yLabel={`${label}${optional ? ', opcional' : ''}`}
            a11yValue={current ? current.label : 'nenhum selecionado'}
            a11yHint={fieldAccessibilityHint(helper, error) ?? 'Abre a lista de opções'}
            onPressAction={({ nativeEvent }) => {
              const next = options.find((o) => o.value === nativeEvent.event);
              if (!next) return;
              selectionFeedback();
              onChange(next.value);
            }}
          >
            <View style={{ width }}>{field}</View>
          </SelectMenu>
        )}
      </View>
      <FieldMessage helper={helper} error={error} />
    </View>
  );
}

interface SelectMenuProps<T extends string> {
  title: string;
  options: SelectProps<T>['options'];
  value: T | null | undefined;
  a11yLabel: string;
  a11yValue: string;
  a11yHint: string;
  /** Mesma assinatura do `MenuView` do @expo/ui (e dos testes que disparam `pressAction`). */
  onPressAction: (e: { nativeEvent: { event: string } }) => void;
  testID?: string;
  children: ReactElement;
}

/**
 * Menu SwiftUI do Select. Igual ao `MenuView` do @expo/ui, mas com nome, valor e dica no próprio `Menu`.
 * O `Menu` vira um único `AXPopUpButton` e esconde o campo RN que está dentro do rótulo. Sem esses
 * modificadores, o VoiceOver lia o seletor sem nome nem valor (BUG-04).
 */
function SelectMenu<T extends string>({ title, options, value, a11yLabel, a11yValue, a11yHint, onPressAction, testID, children }: SelectMenuProps<T>) {
  return (
    <Host testID={testID} ignoreSafeArea="all">
      <Menu
        label={
          <RNHostView matchContents boundedByHost>
            {children}
          </RNHostView>
        }
        modifiers={[accessibilityLabel(a11yLabel), accessibilityValue(a11yValue), accessibilityHint(a11yHint)]}
      >
        <Section title={title}>
          {options.map((o) => (
            <Toggle
              key={o.value}
              label={o.label}
              isOn={o.value === value}
              onIsOnChange={() => onPressAction({ nativeEvent: { event: o.value } })}
            />
          ))}
        </Section>
      </Menu>
    </Host>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
