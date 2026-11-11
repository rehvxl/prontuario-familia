/**
 * Catálogo do design system v2 — cinco telas de referência com dados FICTÍCIOS.
 * Não é rota do app: só para revisão visual e screenshots (docs/screenshots/v2/).
 * Importa apenas de shared/ui (respeita as fronteiras do eslint).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nativeScrollProps, useTheme } from '../theme';
import type { CategoricalIndex } from '../tokens';
import { Avatar } from '../components/Avatar';
import { Banner } from '../components/Banner';
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

export type CatalogScreen = 'login' | 'home' | 'timeline' | 'detail' | 'settings';

const MEMBERS = [
  { id: 'm-ana', name: 'Ana Souza', meta: 'Você · 14 registros' },
  { id: 'm-carlos', name: 'Carlos Souza', meta: 'Cônjuge · 9 registros' },
  { id: 'm-lia', name: 'Lia Souza', meta: 'Filha, 7 anos · 22 registros' },
  { id: 'm-dirce-2', name: 'Dirce Almeida', meta: 'Mãe · 31 registros' },
];

type Kind = 'exam' | 'visit' | 'vaccine' | 'prescription';
const KIND: Record<Kind, { label: string; icon: IconName; accent: CategoricalIndex }> = {
  exam: { label: 'Exame', icon: 'flask', accent: 1 },
  visit: { label: 'Consulta', icon: 'stethoscope', accent: 0 },
  vaccine: { label: 'Vacina', icon: 'shot', accent: 2 },
  prescription: { label: 'Receita', icon: 'pill', accent: 5 },
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

function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.flex}>
      <Scroll bottom={140}>
        <LargeTitle
          title="Família"
          trailing={
            <Menu
              items={[
                { label: 'Adicionar pessoa', icon: 'personAdd' },
                { label: 'Convidar alguém', icon: 'mail' },
                { label: 'Ajustes', icon: 'settings' },
              ]}
            >
              <IconButton icon="moreCircle" variant="plain" color="primary" iconSize={26} accessibilityLabel="Mais opções" />
            </Menu>
          }
        />
        <Gutter>
          <Card accent={1} onPress={() => {}} accessibilityLabel="Próximo: retorno da Lia no pediatra, quinta, 14h">
            <Text variant="footnote" color="secondary">
              PRÓXIMO
            </Text>
            <Text variant="headline" style={{ marginTop: 4 }}>
              Retorno da Lia no pediatra
            </Text>
            <View style={[styles.row, { gap: 6, marginTop: 6 }]}>
              <Icon name="calendar" size={16} color="textSecondary" />
              <Text variant="subheadline" color="secondary">
                Quinta, 14h · Clínica Bem Crescer
              </Text>
            </View>
          </Card>
          <ListSection header="Pessoas">
            {MEMBERS.map((m) => (
              <ListItem
                key={m.id}
                title={m.name}
                subtitle={m.meta}
                leading={<Avatar name={m.name} id={m.id} />}
                onPress={() => {}}
                chevron
              />
            ))}
          </ListSection>
          <ListSection header="Adicionados recentemente" separatorInset="text">
            <ListItem
              title="Hemograma completo"
              subtitle="Lia · Laboratório Vida"
              meta="12 mar"
              leading={<KindBadge kind="exam" />}
              onPress={() => {}}
            />
            <ListItem
              title="Influenza 2026"
              subtitle="Dirce · UBS Jardim"
              meta="20 fev"
              leading={<KindBadge kind="vaccine" />}
              onPress={() => {}}
            />
          </ListSection>
        </Gutter>
      </Scroll>
      <View pointerEvents="box-none" style={[styles.floating, { bottom: insets.bottom + 16, paddingHorizontal: theme.layout.screenGutter }]}>
        <Banner appearance="floating" tone="warning" icon="offline" message="Sem conexão · mostrando o que já está salvo" />
        <FloatingActionButton icon="add" label="Novo registro" extended onPress={() => {}} />
      </View>
    </View>
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
    <Scroll>
      <LargeTitle
        title="Lia"
        trailing={<Avatar name="Lia Souza" id="m-lia" size="md" />}
      />
      <Gutter gap={16}>
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
          <View key={group.month} style={{ gap: 12, marginTop: 8 }}>
            <Text variant="title3" accessibilityRole="header">
              {group.month}
            </Text>
            {group.items.map((item) => {
              const k = KIND[item.kind];
              return (
                <Card
                  key={item.title}
                  onPress={() => {}}
                  accessibilityLabel={`${k.label}: ${item.title}, ${item.date}. ${item.place}`}
                >
                  <View style={[styles.row, { gap: 12, alignItems: 'flex-start' }]}>
                    <KindBadge kind={item.kind} />
                    <View style={styles.flex}>
                      <View style={[styles.row, { gap: 8 }]}>
                        <Text variant="footnote" color="secondary" style={styles.flex}>
                          {k.label.toUpperCase()}
                        </Text>
                        <Text variant="footnote" color="secondary" tabular>
                          {item.date}
                        </Text>
                      </View>
                      <Text variant="headline" style={{ marginTop: 2 }}>
                        {item.title}
                      </Text>
                      <Text variant="subheadline" color="secondary" style={{ marginTop: 2 }}>
                        {item.place}
                      </Text>
                      <View style={[styles.row, { gap: 6, marginTop: 10 }]}>
                        <Icon name="attach" size={15} color="textTertiary" />
                        <Text variant="footnote" color="tertiary">
                          {item.files === 1 ? '1 anexo' : `${item.files} anexos`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        ))}
      </Gutter>
    </Scroll>
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
        <ListSection header="Privacidade" separatorInset={16 + 30 + 12} footer="Você pode baixar ou apagar tudo a qualquer momento.">
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

/** Ícone de ajuste no estilo iOS (quadrado colorido), com cor categórica sólida e glifo claro. */
function SettingIcon({ icon, bg }: { icon: IconName; bg: CategoricalIndex }) {
  const theme = useTheme();
  const c = theme.categorical[bg];
  return (
    <View style={[styles.settingIcon, { backgroundColor: c?.main }]}>
      <Icon name={icon} size={18} weight="semibold" color={c?.onMain ?? '#fff'} />
    </View>
  );
}

const SCREENS: Record<CatalogScreen, () => React.ReactElement> = {
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
  settingIcon: { width: 30, height: 30, borderRadius: 8, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' },
  floating: { position: 'absolute', left: 0, right: 0, gap: 12, alignItems: 'flex-end' },
  pillTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
