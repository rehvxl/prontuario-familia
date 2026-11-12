import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, View, type ScrollView } from 'react-native';
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { toLocalIsoDate } from '@/shared/lib';
import { useMyFamily } from '@/entities/family';
import { formatAge, relationshipLabel, useMembers, type Member } from '@/entities/member';
import { useRecordCounts } from '@/entities/health-record';
import type { AttentionItem } from '@/features/health-overview';
import { FamilyAttentionCard, FamilyAttentionNotices } from '@/widgets/family-attention';
import { FloatingActions, floatingFooterOf } from '@/widgets/floating-actions';
import { FAMILY_TAB_ID, useFamilyTabRail } from '@/widgets/family-tab-rail';
import {
  DemoBadge,
  EmptyState,
  HueProvider,
  Icon,
  IconButton,
  ListItem,
  ListSection,
  ListSkeleton,
  LoadErrorState,
  Menu,
  Screen,
  TabMark,
  formatDate,
  parseISODate,
  useFloatingFooterInset,
  useTheme,
} from '@/shared/ui';
import { MemberPanel, memberSubtitle, type PersonView } from './MemberPanel';

const WEEKDAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

/** '2026-11-11' → "Quarta-feira, 11 de novembro de 2026". */
export function todayHeading(iso: string): string {
  const date = parseISODate(iso);
  return date ? `${WEEKDAYS[date.getDay()]}, ${formatDate(iso, 'long')}` : '';
}

/** "Souza" → "Família Souza"; quem já escreveu "Família Souza" fica como está. */
export function familyTitle(name: string | undefined): string {
  if (!name) return 'Sua família';
  return /^família\b/i.test(name.trim()) ? name.trim() : `Família ${name.trim()}`;
}

/**
 * Gatilho do menu "…" da linha. Não é um `Pressable`/`IconButton`: o menu nativo (SwiftUI) precisa receber o
 * toque, e um botão RN dentro dele o intercepta (BUG-01). O nome acessível e o papel ficam nesta `View`,
 * no mesmo padrão do `Select`. "Editar pessoa" também existe na barra da linha do tempo da pessoa.
 */
function MenuTrigger({ label, testID }: { label: string; testID: string }) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Abre o menu de ações"
      testID={testID}
      style={{ width: theme.minTouchTarget, height: theme.minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name="moreCircle" size={24} color="textSecondary" />
    </View>
  );
}

// "Documentos", como na régua de abas e no cabeçalho da pessoa.
const documentsLabel = (n: number) => (n === 0 ? 'nenhum documento' : n === 1 ? '1 documento' : `${n} documentos`);

/**
 * O conteúdo da folha entra em opacidade (150 ms; na hora com Reduzir movimento) a cada troca de divisória.
 * Montado de novo a cada troca (`key`), já começa transparente: nunca mostra um quadro do conteúdo novo antes do fade.
 */
function LeafContentFade({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const reduced = theme.motion.reduced;
  const [opacity] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (!reduced) Animated.timing(opacity, { toValue: 1, duration: theme.motion.boardSwap.content, useNativeDriver: true }).start();
  }, [opacity, reduced, theme.motion.boardSwap.content]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/**
 * Painel da família (F7) e divisória de cada pessoa (F6), v4 "Pasta com divisórias", numa tela só: capa na cor
 * da divisória, folha com o título (a família ou a pessoa) sempre no mesmo lugar, e a régua de abas na borda
 * direita. Tocar numa aba ou numa pessoa da lista troca a divisória no mesmo quadro (capa, título e conteúdo),
 * sem empilhar tela: tab bar, busca e "Novo registro" não se mexem. Voltar só existe ao entrar em algo (exame,
 * vacina, documento). `?member=<id>` (e `&view=documents`) abre já na divisória da pessoa.
 */
export function FamilyHomeScreen({ demo = false }: { demo?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ member?: string; view?: string }>();
  const familyQuery = useMyFamily();
  const family = familyQuery.data ?? null;
  const members = useMembers(family?.id);
  const counts = useRecordCounts(family?.id).data;
  const list = members.data ?? [];
  const offline = members.fetchStatus === 'paused';
  const focused = useIsFocused();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [selected, setSelected] = useState<string>(params.member || FAMILY_TAB_ID);
  // Quem chega por `?member=` (ex.: depois de salvar um registro) abre a divisória da pessoa (ajuste no render, sem efeito).
  const [seenParam, setSeenParam] = useState(params.member);
  if (params.member !== seenParam) {
    setSeenParam(params.member);
    if (params.member) setSelected(params.member);
  }
  const initialView: PersonView = params.view === 'documents' ? 'documents' : 'summary';
  const select = (id: string) => {
    setSelected(id);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    // O parâmetro já cumpriu o papel: sem ele, um novo `?member=` igual ainda abre a pessoa.
    if (params.member || params.view) router.setParams({ member: undefined, view: undefined });
  };
  const tabs = useFamilyTabRail({ familyId: family?.id, current: selected, onNavigate: select });
  const personId = selected === FAMILY_TAB_ID ? null : selected;
  const person = personId ? (list.find((m) => m.id === personId) ?? null) : null;

  const newRecord = (memberId?: string) =>
    router.push(memberId ? { pathname: '/(main)/record/new', params: { memberId } } : '/(main)/record/new');

  const openAttention = (target: AttentionItem['target']) =>
    router.push(
      target.screen === 'vaccines'
        ? { pathname: '/(main)/member/[id]/vaccines', params: { id: target.memberId } }
        : { pathname: '/(main)/member/[id]/exams/[series]', params: { id: target.memberId, series: target.seriesKey } },
    );

  const memberRow = (m: Member) => {
    const parts = [relationshipLabel(m.relationship, m.sex), formatAge(m.birthDate), counts ? documentsLabel(counts[m.id] ?? 0) : undefined].filter(Boolean);
    return (
      <ListItem
        key={m.id}
        // A marca de aba na cor da pessoa; o nome vai escrito ao lado (a cor nunca é a única pista).
        leading={<TabMark id={m.id} />}
        title={m.fullName}
        subtitle={parts.join(' · ')}
        accessibilityLabel={[m.fullName, ...parts].join(', ')}
        onPress={() => select(m.id)}
        testID={`member-${m.id}`}
        trailing={
          <Menu
            items={[
              { label: 'Novo registro', icon: 'add', onPress: () => newRecord(m.id) },
              { label: 'Editar pessoa', icon: 'edit', onPress: () => router.push({ pathname: '/(main)/member/[id]/edit', params: { id: m.id } }) },
            ]}
          >
            <MenuTrigger label={`Mais ações para ${m.fullName}`} testID={`member-menu-${m.id}`} />
          </Menu>
        }
      />
    );
  };

  const fabMember = personId ?? (list.length === 1 ? list[0]!.id : undefined);
  const fab = list.length > 0 ? { label: 'Novo registro', onPress: () => newRecord(fabMember), testID: 'new-record-fab' } : null;
  const footerInset = useFloatingFooterInset(floatingFooterOf({ offline, action: fab }));

  const content = (() => {
    if (members.isPending) return offline ? <LoadErrorState onRetry={() => void members.refetch()} /> : <ListSkeleton />;
    if (members.isError) return <LoadErrorState onRetry={() => void members.refetch()} />;
    if (personId) {
      return <MemberPanel key={personId} familyId={family?.id} memberId={personId} member={person} initialView={initialView} onLeave={() => select(FAMILY_TAB_ID)} />;
    }
    if (list.length === 0) {
      return (
        <EmptyState
          icon="people"
          title="Nenhuma pessoa ainda"
          message="Adicione quem terá o histórico de saúde guardado aqui."
          action={{ label: 'Adicionar pessoa', onPress: () => router.push('/(main)/member/new'), icon: 'personAdd' }}
        />
      );
    }
    return (
      <View style={{ gap: theme.layout.sectionHeaderTop }}>
        {family ? <FamilyAttentionCard familyId={family.id} onOpen={openAttention} /> : null}
        <ListSection header="Pessoas">
          {list.map(memberRow)}
          <ListItem
            leading={<Icon name="personAdd" size={22} color="primary" />}
            title="Adicionar pessoa"
            onPress={() => router.push('/(main)/member/new')}
            chevron={false}
            testID="add-member"
          />
        </ListSection>
        {/* Os avisos vêm depois das pessoas: a primeira tela mostra o que acompanhar e quem é a família. */}
        {family ? <FamilyAttentionNotices familyId={family.id} /> : null}
      </View>
    );
  })();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Só a tela em foco manda na barra de status (a aba fica montada quando outra aba abre). */}
      {focused ? <StatusBar style={tabs.hue.statusBar} /> : null}
      <Screen
        board={tabs.hue}
        rail={tabs.rail}
        edges={['top', 'left', 'right', 'bottom']}
        scrollRef={scrollRef}
        heading={
          person
            ? {
                title: person.fullName,
                subtitle: memberSubtitle(person, counts ? (counts[person.id] ?? 0) : undefined),
                testID: 'member-header',
                trailing: (
                  <IconButton
                    icon="edit"
                    accessibilityLabel="Editar pessoa"
                    color="primary"
                    onPress={() => router.push({ pathname: '/(main)/member/[id]/edit', params: { id: person.id } })}
                    testID="edit-member"
                  />
                ),
              }
            : { title: familyTitle(family?.name), subtitle: todayHeading(toLocalIsoDate()) }
        }
        contentContainerStyle={{ paddingBottom: footerInset || theme.space[4] }}
        testID="family-home-screen"
      >
        {/* Aviso de demonstração no fluxo, logo abaixo da data: não cobre a lista nem rouba toques (DESIGN_SYSTEM §7.1). */}
        {demo ? (
          <View style={{ marginTop: -theme.space[2], marginBottom: theme.space[4] }}>
            <DemoBadge />
          </View>
        ) : null}
        <LeafContentFade key={selected}>{content}</LeafContentFade>
      </Screen>
      {/* O botão flutuante fica fora da folha: leva a tinta da divisória atual. */}
      <HueProvider hue={tabs.hue}>
        <FloatingActions offline={offline} action={fab} rail={!!tabs.rail} />
      </HueProvider>
    </>
  );
}
