import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RECORD_TYPE_APPEARANCE, recordTypeLabel, type RecordType } from '@/entities/health-record';
import {
  Button,
  IconTile,
  ListItem,
  ListSection,
  MetricValue,
  RangeBar,
  Screen,
  StateChip,
  TabRail,
  Text,
  formatDate,
  useTheme,
  type HueName,
} from '@/shared/ui';

/** `people`: quantas divisórias de exemplo a pasta já mostra; `hue`: a divisória aberta no passo. */
type Step = { title: string; message: string; people: number; hue: HueName };

const STEPS: readonly Step[] = [
  {
    title: 'A pasta da família, no celular',
    message: 'Guarde exames, receitas, laudos e vacinas de cada pessoa, organizados por data.',
    people: 0,
    hue: 'ultramar',
  },
  {
    title: 'Cada resultado ao lado da faixa do laudo',
    message: 'Os valores dos exames ficam em sequência, comparados à faixa impressa no próprio laudo.',
    people: 1,
    hue: 'cromo',
  },
  {
    title: 'Só a sua família vê',
    message: 'Seus dados ficam protegidos. Você pode exportar ou apagar tudo quando quiser.',
    people: 3,
    hue: 'ultramar',
  },
];

/** Divisórias fictícias que surgem passo a passo na régua (a do Carlos abre no passo 2, com o exame dele). */
const EXAMPLE_PEOPLE: readonly { id: string; label: string; count: number; hue: HueName }[] = [
  { id: 'carlos', label: 'Carlos', count: 6, hue: 'cromo' },
  { id: 'ana', label: 'Ana', count: 2, hue: 'oxido' },
  { id: 'lia', label: 'Lia', count: 4, hue: 'grama' },
];

/** Documentos fictícios do passo 1 (rotulados "Exemplo"), do mais recente ao mais antigo. */
const EXAMPLE_RECORDS: readonly { type: RecordType; title: string; detail: string; date: string }[] = [
  { type: 'result', title: 'Hemograma completo', detail: 'Laboratório Vida', date: '2026-11-03' },
  { type: 'prescription', title: 'Losartana 50 mg', detail: 'Dra. Paula Lima', date: '2026-10-28' },
  { type: 'vaccine', title: 'Influenza', detail: 'Dose única', date: '2026-04-15' },
];

/**
 * Três passos curtos de boas-vindas (DESIGN_SYSTEM.md §7.13), já dentro da pasta (v4): a capa ultramar, a folha
 * com os furos e, na borda direita, as divisórias surgindo a cada passo. No passo 2 a pasta abre na divisória
 * do Carlos (troca de 90 ms em 2 quadros). Na folha: o passo em texto, um exemplo do próprio app (a pasta com os
 * tipos de registro, a régua do laudo, a leitura no aparelho) e o texto ancorado embaixo, perto do botão. Sem
 * ilustração: os exemplos são componentes reais com dados fictícios. A última leva ao consentimento; "Pular"
 * vai direto a ele.
 */
export function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const step = STEPS[index] ?? STEPS[0]!;
  const last = index === STEPS.length - 1;
  const goToConsent = () => router.push('/(onboarding)/consent');
  const position = `Passo ${index + 1} de ${STEPS.length}`;
  const rail = [
    { id: 'family', label: 'Família', hue: 'ultramar' as const, selected: step.hue === 'ultramar' },
    ...EXAMPLE_PEOPLE.slice(0, step.people).map((p) => ({ ...p, selected: p.hue === step.hue })),
  ];

  return (
    <Screen
      board={step.hue}
      rail={
        // Ilustrativa: a pasta de exemplo não troca de pessoa; o texto do passo é quem informa.
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="welcome-rail">
          <TabRail items={rail} onSelect={() => undefined} />
        </View>
      }
      edges={['top', 'left', 'right', 'bottom']}
      // A rolagem é desta tela: o conteúdo ocupa a altura toda (exemplo no meio, texto embaixo) e ainda rola
      // com Dynamic Type grande.
      scroll={false}
      testID="welcome-screen"
      footer={
        <View style={{ gap: theme.space[2] }}>
          <Button label={last ? 'Começar' : 'Continuar'} onPress={last ? goToConsent : () => setIndex(index + 1)} fullWidth />
          {last ? null : <Button label="Pular" variant="plain" onPress={goToConsent} fullWidth />}
        </View>
      }
    >
      <StatusBar style={theme.hues.byName[step.hue].statusBar} />
      <ScrollView style={styles.flex} contentContainerStyle={[styles.grow, { paddingTop: theme.space[4], paddingBottom: theme.space[6] }]} showsVerticalScrollIndicator={false}>
        {/* O progresso é a régua (uma divisória nova por passo, decorativa); o texto "Passo n de 3" é quem informa. */}
        <Text variant="subheadline" color="secondary" tabular testID="welcome-step">
          {position}
        </Text>
        <View style={[styles.stage, { paddingVertical: theme.space[8] }]} testID="welcome-visual">
          {index === 0 ? <ExampleFolder /> : index === 1 ? <ExampleResult /> : <OnDevice />}
        </View>
        {/* key: ao trocar de passo, o título é outro elemento e o leitor de tela o anuncia. */}
        <View key={index} style={{ gap: theme.space[3] }} accessibilityLiveRegion="polite" testID="welcome-text">
          <Text variant="largeTitle" color="link">
            {step.title}
          </Text>
          <Text variant="body" color="secondary">
            {step.message}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** "Exemplo" no canto do exemplo: os dados são fictícios e a tela diz isso. */
function ExampleLabel() {
  const theme = useTheme();
  return (
    <Text variant="footnote" color="secondary" style={{ alignSelf: 'flex-end', marginBottom: theme.space[2] }}>
      Exemplo
    </Text>
  );
}

/**
 * Passo 1: folhas da pasta, três documentos de tipos diferentes, cada um com o ícone e o rótulo do tipo (a cor é
 * só da pessoa, DESIGN_SYSTEM §8). Decorativo para o leitor de tela: a frase do passo já diz o mesmo.
 */
function ExampleFolder() {
  const theme = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID="welcome-folder">
      <ExampleLabel />
      <ListSection>
        {EXAMPLE_RECORDS.map((r) => {
          const { icon, colorIndex } = RECORD_TYPE_APPEARANCE[r.type];
          const color = theme.categorical[colorIndex];
          return (
            <ListItem
              key={r.title}
              leading={<IconTile icon={icon} background={color?.soft} color={color?.main} />}
              title={r.title}
              subtitle={`${recordTypeLabel(r.type)} · ${r.detail}`}
              meta={formatDate(r.date, 'short')}
              chevron={false}
            />
          );
        })}
      </ListSection>
    </View>
  );
}

/** Passo 2: linha de exame ilustrativa (valor fictício, rotulado "Exemplo"), no formato da `MeasurementRow`. */
function ExampleResult() {
  const theme = useTheme();
  return (
    <View testID="welcome-example">
      <ExampleLabel />
      <ListSection>
        <View style={{ paddingVertical: theme.space[3], gap: theme.space[2] }}>
          <Text variant="headline">Carlos · Hemoglobina glicada</Text>
          <MetricValue value="5,4" unit="%" unitSpoken="por cento" state="in" />
          <RangeBar value={5.4} range={{ low: 4, high: 5.6 }} state="in" width="fill" />
          <View style={[styles.row, styles.wrap, { gap: theme.space[2] }]}>
            <StateChip state="in" variant="long" />
            <Text variant="footnote" color="secondary">
              Faixa do laudo: 4,0 a 5,6 %
            </Text>
          </View>
        </View>
      </ListSection>
    </View>
  );
}

/** Passo 3: a leitura é no aparelho, no mesmo grupo dos outros passos. */
function OnDevice() {
  const theme = useTheme();
  return (
    <ListSection testID="welcome-on-device">
      <View style={[styles.row, { paddingVertical: theme.space[3], gap: theme.space[3] }]}>
        <IconTile icon="privacy" background="primarySoft" color="primary" />
        <Text variant="body" style={styles.flex}>
          A leitura dos documentos é feita no aparelho
        </Text>
      </View>
    </ListSection>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  // O exemplo fica centrado no espaço livre; com Dynamic Type grande, o espaço some e a tela rola.
  stage: { flexGrow: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
});
