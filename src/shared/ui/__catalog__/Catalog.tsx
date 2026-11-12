/**
 * Catálogo do design system v4 ("Pasta com divisórias") — telas de referência com dados FICTÍCIOS.
 * Não é rota do app: só para revisão visual e screenshots. `home` é a primeira tela do esboço escolhido
 * (.impeccable/mocks/decision/challenger-pasta.html); `boards` mostra os 8 matizes nos dois temas;
 * `clinical` mostra os 4 estados clínicos nos dois temas. Importa apenas de shared/ui (fronteiras do eslint).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HueProvider, nativeScrollProps, ThemeProvider, useTheme } from '../theme';
import { HUE_LABELS, NEUTRAL_CATEGORICAL, type CategoricalIndex, type HueName } from '../tokens';
import { DividerBoard } from '../components/DividerBoard';
import { Leaf } from '../components/Leaf';
import { StateLine } from '../components/StateLine';
import { TabMark } from '../components/TabMark';
import { TabRail } from '../components/TabRail';
import { AttentionList } from '../components/AttentionList';
import { Avatar } from '../components/Avatar';
import type { ReferenceState } from '../components/clinical';
import { IconTile } from '../components/IconTile';
import { MetricValue } from '../components/MetricValue';
import { ProgressSteps } from '../components/ProgressSteps';
import { RangeBar } from '../components/RangeBar';
import { SectionHeader } from '../components/SectionHeader';
import { Sparkline } from '../components/Sparkline';
import { StateChip } from '../components/StateChip';
import { SuggestedField } from '../components/SuggestedField';
import { StatTile, StatTileGroup, SummaryCard } from '../components/SummaryCard';
import { TrendChart } from '../components/TrendChart';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { Icon, type IconName } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { ListItem } from '../components/ListItem';
import { ListSection } from '../components/ListSection';
import { Menu } from '../components/Menu';
import { SearchField } from '../components/SearchField';
import { SegmentedControl } from '../components/SegmentedControl';
import { Switch } from '../components/Switch';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';

export type CatalogScreen = 'login' | 'home' | 'timeline' | 'detail' | 'settings' | 'clinical' | 'boards';

// Matizes fixos no catálogo para casar com o esboço; no app vêm de `personBoard(categoricalIndexFor(id))`.
const MEMBERS: { id: string; name: string; short: string; meta: string; docs: number; hue: HueName }[] = [
  { id: 'm-ana', name: 'Ana Souza', short: 'Ana', meta: 'Eu · 38 anos · 0 documentos', docs: 0, hue: 'oxido' },
  { id: 'm-carlos', name: 'Carlos Souza', short: 'Carlos', meta: 'Cônjuge · 67 anos · 6 documentos', docs: 6, hue: 'cromo' },
  { id: 'm-lia', name: 'Lia Souza', short: 'Lia', meta: 'Filha · 10 meses · 4 documentos', docs: 4, hue: 'grama' },
  { id: 'm-dirce', name: 'Dirce Souza', short: 'Dirce', meta: 'Mãe · 78 anos · 2 documentos', docs: 2, hue: 'petroleo' },
];

type Kind = 'exam' | 'visit' | 'vaccine' | 'prescription';
// v4: tipos neutros (a cor é da pessoa), como o mapa de entities/health-record/ui (DESIGN_SYSTEM.md §8).
const KIND: Record<Kind, { label: string; icon: IconName; accent: CategoricalIndex }> = {
  exam: { label: 'Resultado', icon: 'flask', accent: NEUTRAL_CATEGORICAL },
  visit: { label: 'Consulta', icon: 'stethoscope', accent: NEUTRAL_CATEGORICAL },
  vaccine: { label: 'Vacina', icon: 'shot', accent: NEUTRAL_CATEGORICAL },
  prescription: { label: 'Receita', icon: 'pills', accent: NEUTRAL_CATEGORICAL },
};

const TIMELINE: { month: string; items: { kind: Kind; title: string; place: string; date: string; files: number }[] }[] = [
  {
    month: 'Março de 2026',
    items: [
      { kind: 'exam', title: 'Hemograma completo', place: 'Laboratório Vida · Dra. Paula Lima', date: '12 mar', files: 2 },
      { kind: 'visit', title: 'Pediatra — rotina', place: 'Clínica Bem Crescer · Dr. Rui', date: '3 mar', files: 1 },
    ],
  },
  {
    month: 'Fevereiro de 2026',
    items: [
      { kind: 'vaccine', title: 'Influenza 2026', place: 'UBS Jardim · Lote FX2391', date: '20 fev', files: 1 },
      { kind: 'prescription', title: 'Amoxicilina 250 mg', place: 'Dr. Rui · 7 dias', date: '2 fev', files: 1 },
    ],
  },
];

function useTopInset() {
  const insets = useSafeAreaInsets();
  return insets.top;
}

/** Título grande "de mentira" — nas telas reais quem desenha é o cabeçalho nativo (headerOptions). */
function LargeTitle({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.titleRow, { paddingHorizontal: theme.layout.screenGutter, paddingTop: theme.space[2], paddingBottom: theme.space[3] }]}>
      <Text variant="largeTitle" accessibilityRole="header" style={styles.flex}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

function Scroll({ children, bottom = 32 }: { children: React.ReactNode; bottom?: number }) {
  const theme = useTheme();
  // contentInsetAdjustmentBehavior="automatic" (nativeScrollProps) já soma a safe area do topo.
  return (
    <ScrollView
      {...nativeScrollProps}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingTop: theme.space[2], paddingBottom: bottom }}
    >
      {children}
    </ScrollView>
  );
}

function Gutter({ children, gap = 24 }: { children: React.ReactNode; gap?: number }) {
  const theme = useTheme();
  return <View style={{ paddingHorizontal: theme.layout.screenGutter, gap }}>{children}</View>;
}

function LoginScreen() {
  const theme = useTheme();
  const top = useTopInset();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('ana.souza@exemplo.com');
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: top + 56, paddingBottom: insets.bottom + 16 }}>
      <Gutter gap={0}>
        <View style={[styles.mark, { backgroundColor: theme.colors.primary, borderRadius: 22 }]}>
          <Icon name="folder" filled size={34} color="onPrimary" />
        </View>
        <Text variant="largeTitle" accessibilityRole="header" style={{ marginTop: 28 }}>
          Prontuário{'\n'}da Família
        </Text>
        <Text variant="body" color="secondary" style={{ marginTop: 12 }}>
          Exames, consultas e vacinas de todo mundo de casa, guardados num lugar só e só para vocês.
        </Text>
        <View style={{ marginTop: 40, gap: 16 }}>
          <TextField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leadingIcon="mail"
          />
          <Button label="Continuar" variant="filled" onPress={() => {}} fullWidth />
          <Button label="Entrar com código de acesso" variant="plain" onPress={() => {}} fullWidth />
        </View>
      </Gutter>
      <View style={styles.flex} />
      <Gutter gap={0}>
        <View style={[styles.row, { gap: 8, justifyContent: 'center' }]}>
          <Icon name="lock" size={15} color="textSecondary" />
          <Text variant="footnote" color="secondary" align="center">
            Seus dados ficam criptografados e nunca são vendidos.
          </Text>
        </View>
      </Gutter>
    </View>
  );
}

/** A primeira tela do esboço: capa ultramar, folha com furos, régua de abas e "Novo registro". */
function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('family');
  const current = MEMBERS.find((m) => m.id === selected);
  const rail = (
    <TabRail
      onSelect={setSelected}
      items={[
        { id: 'family', label: 'Família', hue: 'ultramar', selected: selected === 'family' },
        ...MEMBERS.map((m) => ({ id: m.id, label: m.short, count: m.docs, hue: m.hue, selected: selected === m.id })),
      ]}
    />
  );
  return (
    <View style={styles.flex}>
      <DividerBoard hue={current?.hue ?? 'ultramar'} rail={rail} edges={['top', 'left', 'right']}>
        <Leaf contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
          <Text variant="largeTitle" color="link">
            {current ? current.name : 'Família Souza'}
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: 2 }}>
            {current ? current.meta : 'Quarta-feira, 11 de novembro de 2026'}
          </Text>
          <SectionHeader title="Para acompanhar" style={{ marginTop: theme.space[5], marginBottom: 2 }} />
          <AttentionList items={ATTENTION} />
          <View style={{ paddingTop: theme.space[3] }}>
            <StateLine icon="stateIn" text="Vacinas: 1 de 4 pessoas em dia com o calendário." />
          </View>
          <ListSection header="Pessoas" style={{ marginTop: theme.space[5] }}>
            {MEMBERS.map((m) => (
              <ListItem
                key={m.id}
                title={m.name}
                subtitle={m.meta}
                leading={<TabMark hue={m.hue} style={{ marginTop: -20 }} />}
                onPress={() => setSelected(m.id)}
                chevron
              />
            ))}
          </ListSection>
        </Leaf>
      </DividerBoard>
      <HueProvider hue={current?.hue ?? 'ultramar'}>
        <View pointerEvents="box-none" style={[styles.floating, { bottom: insets.bottom + 16, paddingHorizontal: theme.layout.railWidth + theme.space[3] }]}>
          <FloatingActionButton icon="add" label="Novo registro" extended onPress={() => {}} />
        </View>
      </HueProvider>
    </View>
  );
}

/** Os 8 matizes no tema atual: divisória com aba, tinta e soft sobre a folha. */
function BoardsPanel() {
  const theme = useTheme();
  const all = [theme.hues.family, ...theme.hues.people];
  return (
    <View style={{ backgroundColor: theme.colors.background, padding: 16, gap: 12 }}>
      <Text variant="title2">{theme.scheme === 'dark' ? 'Escuro' : 'Claro'}</Text>
      {all.map((h) => (
        <View key={h.name} style={[styles.row, { gap: 12 }]}>
          <View style={{ width: 120, height: 56, backgroundColor: h.board, borderRadius: 4, padding: 8, justifyContent: 'flex-end' }}>
            <Text variant="bodyStrong" style={{ color: h.onBoard }}>
              {HUE_LABELS[h.name]}
            </Text>
          </View>
          <View style={{ width: 36, height: 56, backgroundColor: h.tab, borderTopRightRadius: 8, borderBottomRightRadius: 8, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 }}>
            <Text variant="subheadline" tabular style={{ color: h.onTab, fontWeight: '500' }}>
              6
            </Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="bodyStrong" style={{ color: h.ink }}>
              Tinta sobre a folha
            </Text>
            <View style={{ backgroundColor: h.soft, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
              <Text variant="subheadline" style={{ color: h.ink }}>
                Soft (faixa do laudo)
              </Text>
            </View>
          </View>
        </View>
      ))}
      <View style={[styles.row, { gap: 12, flexWrap: 'wrap' }]}>
        <Button label="Salvar registro" onPress={() => {}} />
        <Button label="Excluir" role="destructive" variant="plain" onPress={() => {}} />
      </View>
    </View>
  );
}

function BoardsScreen() {
  return (
    <Scroll>
      <ThemeProvider scheme="light">
        <BoardsPanel />
      </ThemeProvider>
      <ThemeProvider scheme="dark">
        <BoardsPanel />
      </ThemeProvider>
    </Scroll>
  );
}

function KindBadge({ kind }: { kind: Kind }) {
  const theme = useTheme();
  const k = KIND[kind];
  const c = theme.categorical[k.accent];
  return (
    <View style={[styles.kind, { backgroundColor: c?.soft }]}>
      <Icon name={k.icon} size={22} color={c?.main ?? "textPrimary"} />
    </View>
  );
}

function TimelineScreen() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'exam' | 'visit'>('all');
  return (
    <DividerBoard hue="grama" edges={['top', 'left', 'right']}>
      <Leaf>
      <View style={[styles.row, { gap: 12, marginBottom: 16 }]}>
        <Avatar name="Lia Souza" id="m-lia" size="md" />
        <View style={styles.flex}>
          <Text variant="title1" color="link">
            Lia Souza
          </Text>
          <Text variant="subheadline" color="secondary">
            Filha · 10 meses · 4 documentos
          </Text>
        </View>
      </View>
      <View style={{ gap: 16 }}>
        <SearchField value={q} onChangeText={setQ} />
        <SegmentedControl
          accessibilityLabel="Mostrar"
          options={[
            { value: 'all', label: 'Tudo' },
            { value: 'exam', label: 'Exames' },
            { value: 'visit', label: 'Consultas' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        {TIMELINE.map((group) => (
          <ListSection key={group.month} header={group.month}>
            {group.items.map((item) => {
              const k = KIND[item.kind];
              return (
                <ListItem
                  key={item.title}
                  title={item.title}
                  subtitle={`${k.label} · ${item.place} · ${item.files === 1 ? '1 anexo' : `${item.files} anexos`}`}
                  meta={item.date}
                  leading={<KindBadge kind={item.kind} />}
                  onPress={() => {}}
                />
              );
            })}
          </ListSection>
        ))}
      </View>
      </Leaf>
    </DividerBoard>
  );
}

function DetailScreen() {
  const theme = useTheme();
  const c = theme.categorical[1];
  return (
    <Scroll>
      <Gutter gap={24}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <IconButton icon="back" variant="glass" accessibilityLabel="Voltar" />
          <Menu
            items={[
              { label: 'Editar', icon: 'edit' },
              { label: 'Compartilhar', icon: 'share' },
              { label: 'Excluir registro', icon: 'trash', destructive: true },
            ]}
          >
            <IconButton icon="more" variant="glass" accessibilityLabel="Mais ações" />
          </Menu>
        </View>
        <View style={{ gap: 8 }}>
          <View style={[styles.pillTag, { backgroundColor: c?.soft }]}>
            <Icon name="flask" size={15} color={c?.main} />
            <Text variant="footnote" style={{ fontWeight: '600', color: c?.main }}>
              Exame
            </Text>
          </View>
          <Text variant="title1" accessibilityRole="header">
            Hemograma completo
          </Text>
          <Text variant="body" color="secondary">
            Lia Souza · 12 de março de 2026
          </Text>
        </View>
        <ListSection separatorInset="none">
          <ListItem title="Local" meta="Laboratório Vida" />
          <ListItem title="Profissional" meta="Dra. Paula Lima" />
          <ListItem title="Pedido por" meta="Dr. Rui" />
        </ListSection>
        <ListSection header="Anexos" footer="Só quem é da família vê estes arquivos.">
          <ListItem
            title="Resultado.pdf"
            subtitle="PDF · 240 KB"
            leading={<FileThumb icon="fileText" />}
            onPress={() => {}}
          />
          <ListItem title="Pedido médico" subtitle="Foto · 1,1 MB" leading={<FileThumb icon="gallery" />} onPress={() => {}} />
        </ListSection>
        <Card>
          <Text variant="headline">Observações</Text>
          <Text variant="body" color="secondary" style={{ marginTop: 6 }}>
            Repetir em 6 meses. Ferritina um pouco baixa, a pediatra pediu para acompanhar.
          </Text>
        </Card>
        <View style={{ gap: 12 }}>
          <Button label="Compartilhar com médico" icon="share" variant="filled" onPress={() => {}} fullWidth />
          <Button label="Adicionar anexo" icon="attach" variant="bordered" onPress={() => {}} fullWidth />
        </View>
      </Gutter>
    </Scroll>
  );
}

function FileThumb({ icon }: { icon: IconName }) {
  const theme = useTheme();
  return (
    <View style={[styles.kind, { backgroundColor: theme.colors.surfaceSunken }]}>
      <Icon name={icon} size={22} color="textSecondary" />
    </View>
  );
}

const APPEARANCE = [
  { value: 'system', label: 'Igual ao aparelho' },
  { value: 'light', label: 'Clara' },
  { value: 'dark', label: 'Escura' },
] as const;

function SettingsScreen() {
  const [reminders, setReminders] = useState(true);
  const [faceId, setFaceId] = useState(true);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const t = useTheme();
  return (
    <Scroll>
      <LargeTitle title="Ajustes" />
      <Gutter>
        <ListSection>
          <ListItem
            title="Ana Souza"
            subtitle="ana.souza@exemplo.com"
            leading={<Avatar name="Ana Souza" id="m-ana" />}
            onPress={() => {}}
          />
        </ListSection>
        <ListSection header="Preferências" separatorInset="none">
          <View style={{ paddingHorizontal: t.space[4] }}>
            <Switch label="Lembretes de consulta" description="Avisa um dia antes" value={reminders} onValueChange={setReminders} />
          </View>
          <View style={{ paddingHorizontal: t.space[4] }}>
            <Switch label="Desbloquear com Face ID" value={faceId} onValueChange={setFaceId} />
          </View>
        </ListSection>
        <ListSection header="Tela" separatorInset="none">
          <Menu
            title="Aparência"
            stretch
            items={APPEARANCE.map((o) => ({ id: o.value, label: o.label, selected: o.value === theme, onPress: () => setTheme(o.value) }))}
          >
            <ListItem
              title="Aparência"
              meta={APPEARANCE.find((o) => o.value === theme)?.label}
              trailing={<Icon name="expand" size={14} weight="semibold" color="textTertiary" />}
              chevron={false}
            />
          </Menu>
        </ListSection>
        <ListSection header="Privacidade" separatorInset={16 + 36 + 12} footer="Você pode baixar ou apagar tudo a qualquer momento.">
          <ListItem title="Quem vê a família" leading={<SettingIcon icon="people" bg={0} />} onPress={() => {}} />
          <ListItem title="Consentimentos" leading={<SettingIcon icon="hand" bg={3} />} onPress={() => {}} />
          <ListItem title="Baixar meus dados" leading={<SettingIcon icon="download" bg={1} />} onPress={() => {}} />
        </ListSection>
        <ListSection separatorInset="none">
          <ListItem title="Sair" destructive chevron={false} onPress={() => {}} />
        </ListSection>
      </Gutter>
    </Scroll>
  );
}

/** v3: tile neutro (`surfaceSunken` + `textSecondary`), não blocos coloridos. `bg` mantido por compatibilidade. */
function SettingIcon({ icon }: { icon: IconName; bg?: CategoricalIndex }) {
  return <IconTile icon={icon} />;
}

const ATTENTION = [
  { id: 'a1', icon: 'shot', tone: 'high', title: 'Lia · Febre amarela', detail: 'Atrasada pelo calendário' },
  { id: 'a2', icon: 'stateHigh', tone: 'high', title: 'Carlos · Hemoglobina glicada', detail: 'Acima da faixa do laudo · 7,4 % · 28 de out.' },
  { id: 'a3', icon: 'stateLow', tone: 'low', title: 'Lia · Ferritina', detail: 'Abaixo da faixa do laudo · 18 ng/mL · 12 de mar.' },
  { id: 'a4', icon: 'shot', tone: 'care', title: 'Dirce · Influenza de 2026', detail: 'Pendente' },
].map((i) => ({ ...i, icon: i.icon as IconName, tone: i.tone as 'high' | 'low' | 'care', onPress: () => {} }));

const STATES: { state: ReferenceState; name: string; value: string; unit: string; n: number; range: { low?: number; high?: number; text?: string }; faixa: string }[] = [
  { state: 'in', name: 'TSH', value: '3,1', unit: 'mUI/L', n: 3.1, range: { low: 0.4, high: 4 }, faixa: '0,4–4 mUI/L' },
  { state: 'high', name: 'Hemoglobina glicada', value: '7,4', unit: '%', n: 7.4, range: { high: 5.7 }, faixa: 'inferior a 5,7 %' },
  { state: 'low', name: 'HDL', value: '38', unit: 'mg/dL', n: 38, range: { low: 40 }, faixa: 'superior a 40 mg/dL' },
  { state: 'none', name: 'LDL', value: '120', unit: 'mg/dL', n: 120, range: { text: 'Desejável: < 100' }, faixa: 'Desejável: < 100' },
];

/** Os 4 estados clínicos e os componentes novos, num tema. */
function ClinicalPanel() {
  const theme = useTheme();
  const [field, setField] = useState('Dra. Paula Lima');
  return (
    <View style={{ backgroundColor: theme.colors.background, paddingVertical: 16 }}>
      <Gutter gap={0}>
        <Text variant="largeTitle">{theme.scheme === 'dark' ? 'Escuro' : 'Claro'}</Text>
        <SectionHeader title="Exames recentes" action={{ label: 'Ver tudo', onPress: () => {} }} />
        <ListSection separatorInset={16} footer="A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.">
          {STATES.map((s) => (
            <View key={s.state} style={{ padding: 16, gap: 8 }}>
              <Text variant="headline">{s.name}</Text>
              <View style={[styles.row, { justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }]}>
                <MetricValue value={s.value} unit={s.unit} state={s.state} showStateLabel />
                <RangeBar value={s.n} range={s.range} state={s.state} />
              </View>
              <Text variant="footnote" color="tertiary">
                Faixa do laudo: {s.faixa} · 28 de out. de 2026 · do laudo Laboratório Vida
              </Text>
            </View>
          ))}
        </ListSection>
        <SectionHeader title="Estados" />
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          {STATES.map((s) => (
            <StateChip key={s.state} state={s.state} variant="long" />
          ))}
        </View>
        <SummaryCard title="Agora">
          <View style={{ padding: 16, gap: 12 }}>
            <MetricValue value="7,4" unit="%" unitSpoken="por cento" state="high" size="hero" />
            <RangeBar value={7.4} range={{ high: 5.7 }} state="high" width="fill" />
          </View>
        </SummaryCard>
        <SummaryCard title="Evolução">
          <View style={{ padding: 16 }}>
            <TrendChart
              unit="%"
              summary="Hemoglobina glicada: 4 resultados de março de 2025 a outubro de 2026. Último: 7,4 %, acima da faixa do laudo."
              points={[
                { date: '2025-03-10', label: 'mar./25', value: 7.9, state: 'high', range: { high: 5.7, text: 'inferior a 5,7' } },
                { date: '2025-09-02', label: 'set./25', value: 5.4, state: 'in', range: { high: 5.7, text: 'inferior a 5,7' } },
                { date: '2026-03-15', label: 'mar./26', value: 6.6, state: 'high', range: { high: 5.7, text: 'inferior a 5,7' } },
                { date: '2026-10-28', label: 'out./26', value: 7.4, state: 'high', range: { high: 5.7, text: 'inferior a 5,7' } },
              ]}
            />
          </View>
        </SummaryCard>
        <SectionHeader title="Sinais vitais" />
        <ListSection separatorInset={16}>
          <ListItem
            title="Pressão"
            subtitle="10 de nov. · 08:12"
            leading={<IconTile icon="bloodPressure" />}
            value={<Sparkline series={[[136, 145, 139, 142], [84, 90, 86, 88]]} summary="4 medições em 30 dias, de 136/84 a 145/90; última 142/88" />}
          />
        </ListSection>
        <SectionHeader title="Carteira de vacinas" />
        <StatTileGroup>
          <StatTile value="2" label="pendências" />
          <StatTile value="7" label="doses registradas" />
          <StatTile value="1" label="data não informada" />
        </StatTileGroup>
        <SectionHeader title="Revisar dados do documento" />
        <View style={{ gap: 16 }}>
          <SuggestedField label="Profissional" value={field} onChange={setField} origin="ocr" confidence="low" sourceHint="Dra. Paula Lima CRM 12345" />
          <SuggestedField label="Data" value="3 de nov. de 2026" onChange={() => {}} origin="ocr" confidence="high" sourceHint="Coletado em 03/11/2026" />
          <ProgressSteps progress={0.5} label="1 de 2" />
        </View>
      </Gutter>
    </View>
  );
}

function ClinicalScreen() {
  return (
    <Scroll>
      <ThemeProvider scheme="light">
        <ClinicalPanel />
      </ThemeProvider>
      <ThemeProvider scheme="dark">
        <ClinicalPanel />
      </ThemeProvider>
    </Scroll>
  );
}

const SCREENS: Record<CatalogScreen, () => React.ReactElement> = {
  clinical: ClinicalScreen,
  boards: BoardsScreen,
  login: LoginScreen,
  home: HomeScreen,
  timeline: TimelineScreen,
  detail: DetailScreen,
  settings: SettingsScreen,
};

export function Catalog({ screen = 'home' }: { screen?: CatalogScreen }) {
  const Comp = SCREENS[screen] ?? HomeScreen;
  return <Comp />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
  kind: { width: 44, height: 44, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  floating: { position: 'absolute', left: 0, right: 0, gap: 12, alignItems: 'flex-end' },
  pillTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
