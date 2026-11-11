import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { useState, type ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { resolveIcon, type IconName } from './Icon';

export interface MenuItem {
  /** Identificador estável; padrão = label. */
  id?: string;
  label: string;
  /** Ícone semântico (só aparece no iOS; menus Material do Android ficam só com texto). */
  icon?: IconName;
  onPress?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Mostra marca de seleção (escolha única/múltipla dentro do menu). */
  selected?: boolean;
  /** Sub-itens: viram submenu, ou seção inline com `inline: true`. */
  children?: readonly MenuItem[];
  inline?: boolean;
}

export interface MenuProps {
  items: readonly MenuItem[];
  /** O gatilho (botão, IconButton, linha). Mantém o próprio rótulo de acessibilidade. */
  children: ReactNode;
  /** Título no topo do menu (iOS). */
  title?: string;
  /**
   * Gatilho ocupa toda a largura disponível (linhas de lista). O conteúdo nativo do menu mede o
   * gatilho pelo próprio conteúdo; aqui medimos a largura do pai e a repassamos ao gatilho.
   */
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function toActions(items: readonly MenuItem[]): MenuAction[] {
  return items.map((item) => ({
    id: item.id ?? item.label,
    title: item.label,
    image: Platform.OS === 'ios' && item.icon ? resolveIcon(item.icon)?.sf : undefined,
    state: item.selected === undefined ? undefined : item.selected ? 'on' : 'off',
    attributes: { destructive: item.destructive, disabled: item.disabled },
    subactions: item.children ? toActions(item.children) : undefined,
    displayInline: item.inline,
  }));
}

function findById(items: readonly MenuItem[], id: string): MenuItem | undefined {
  for (const item of items) {
    if ((item.id ?? item.label) === id) return item;
    const nested = item.children && findById(item.children, id);
    if (nested) return nested;
  }
  return undefined;
}

function NativeMenu({ items, children, title, stretch, style, testID, longPress }: MenuProps & { longPress: boolean }) {
  const theme = useTheme();
  const [width, setWidth] = useState<number>();
  if (stretch) {
    return (
      <View style={{ alignSelf: 'stretch' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width ? (
          <NativeMenu items={items} title={title} style={style} testID={testID} longPress={longPress}>
            <View style={{ width }}>{children}</View>
          </NativeMenu>
        ) : null}
      </View>
    );
  }
  return (
    <MenuView
      actions={toActions(items)}
      title={title}
      colorScheme={theme.scheme}
      shouldOpenOnLongPress={longPress}
      onPressAction={({ nativeEvent }) => findById(items, nativeEvent.event)?.onPress?.()}
      style={style}
      testID={testID}
    >
      {children}
    </MenuView>
  );
}

/**
 * Menu suspenso nativo ao tocar no gatilho: SwiftUI `Menu` no iOS (com vidro no iOS 26),
 * `DropdownMenu` do Material 3 no Android. Use para "Mais ações", ordenar, filtrar.
 * Ações destrutivas aqui ainda pedem confirmação (ConfirmSheet) depois.
 */
export function Menu(props: MenuProps) {
  return <NativeMenu {...props} longPress={false} />;
}

/**
 * Menu de contexto ao tocar e segurar (iOS `ContextMenu`; Android: menu suspenso ao segurar).
 * É um atalho: toda ação dele precisa existir também num caminho visível (ex.: tela de detalhe),
 * porque muita gente nunca descobre o toque longo.
 */
export function ContextMenu(props: MenuProps) {
  return <NativeMenu {...props} longPress />;
}
