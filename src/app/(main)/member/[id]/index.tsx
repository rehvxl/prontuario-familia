import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * A pessoa abre como divisória dentro do painel da família (mesma tela, sem empilhar): este endereço só leva
 * links antigos ou externos para lá, com a vista pedida (`?view=documents`).
 */
export default function MemberRoute() {
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  return <Redirect href={{ pathname: '/(main)/(tabs)/(family)', params: { member: id, ...(view ? { view } : {}) } }} />;
}
