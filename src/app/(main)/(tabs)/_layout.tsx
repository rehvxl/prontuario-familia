import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '@/shared/ui';

/**
 * Abas nativas (UITabBar com Liquid Glass no iOS 26; Material no Android). Cada aba tem seu próprio Stack
 * (cabeçalho nativo com título grande). "Buscar" usa role="search": a barra de busca fica na aba (Stack.SearchBar).
 */
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={theme.colors.primary}>
      <NativeTabs.Trigger name="(family)" testID="tab-family">
        <NativeTabs.Trigger.Label>Família</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} md="group" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(settings)" testID="tab-settings">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(search)" role="search" testID="tab-search">
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
