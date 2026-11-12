import { Stack } from 'expo-router';
import { useMyFamily } from '@/entities/family';
import { useMembers } from '@/entities/member';
import { headerTitleColors, registerPersonHues, useTheme } from '@/shared/ui';
import { sheetScreenOptions } from '@/shared/ui/navigation';

/**
 * Stack do app logado: abas nativas + telas empilhadas. Sem cor de fundo fixa nos cabeçalhos no iOS
 * (o iOS 26 desenha o vidro/Liquid Glass); no Android mantém a cor do tema.
 * Formulários (pessoa, registro e os da v0.2: resultado, dose, medicamento, sinal vital) abrem como formSheet
 * (folha nativa com detents) no iOS e como modal com cabeçalho no Android (`sheetScreenOptions`), e usam
 * <Screen presentation="sheet"> (raiz sem fundo nem testID; DESIGN_SYSTEM §13.1/§13.2).
 */

/** Rotas empilhadas da pessoa (spec §9): título curto no cabeçalho; o título completo vai no conteúdo. */
const MEMBER_PAGES = [
  ['member/[id]/exams/index', 'Exames'],
  ['member/[id]/exams/[series]', 'Exame'],
  ['member/[id]/vaccines', 'Vacinas'],
  ['member/[id]/medications', 'Medicamentos'],
  ['member/[id]/vitals/[code]', 'Sinais vitais'],
] as const;

const SHEETS = [
  ['member/new', 'Nova pessoa'],
  ['record/new', 'Novo registro'],
  ['measurement/new', 'Novo resultado'],
  ['vaccine-dose/new', 'Nova dose'],
  ['medication/new', 'Novo medicamento'],
  ['vital/new', 'Novo sinal vital'],
] as const;

const SHEET_OPTIONS = sheetScreenOptions();

/** Cores das divisórias sem repetição na família, na ordem de cadastro (antes de qualquer tela pintar uma pessoa). */
function usePersonHues() {
  const family = useMyFamily();
  const members = useMembers(family.data?.id);
  const ids = [...(members.data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((m) => m.id);
  registerPersonHues(ids);
}

export default function MainLayout() {
  const theme = useTheme();
  usePersonHues();
  const ios = process.env.EXPO_OS === 'ios';
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.colors.primary,
        ...headerTitleColors(theme),
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: theme.colors.background },
        ...(ios ? { headerTransparent: true } : { headerStyle: { backgroundColor: theme.colors.background }, headerShadowVisible: false }),
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="member/[id]/index" options={{ title: 'Linha do tempo', headerTitle: '' }} />
      <Stack.Screen name="member/[id]/edit" options={{ title: 'Editar pessoa' }} />
      <Stack.Screen name="record/[id]" options={{ title: 'Registro' }} />
      {MEMBER_PAGES.map(([name, title]) => (
        <Stack.Screen key={name} name={name} options={{ title }} />
      ))}
      {SHEETS.map(([name, title]) => (
        <Stack.Screen key={name} name={name} options={{ title, ...SHEET_OPTIONS }} />
      ))}
    </Stack>
  );
}
