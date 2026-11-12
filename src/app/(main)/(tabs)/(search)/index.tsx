import { Platform } from 'react-native';
import { SearchScreen } from '@/screens/search';
import { ScrollEdgeVeil } from '@/shared/ui';

/** Lista própria (FlatList) sob cabeçalho transparente no iOS: o véu vem depois dela, que segue primeiro filho (A1). */
export default function SearchRoute() {
  return (
    <>
      <SearchScreen />
      {Platform.OS === 'ios' ? <ScrollEdgeVeil /> : null}
    </>
  );
}
