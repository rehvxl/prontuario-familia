import { useState } from 'react';
import { View } from 'react-native';
import { toLocalIsoDate } from '@/shared/lib';
import { useFamilyAttention, type AttentionItem, type FamilyAttention } from '@/features/health-overview';
import {
  AttentionList,
  Button,
  ListSection,
  ListSkeleton,
  SectionHeader,
  StateLine,
  Text,
  useTheme,
  type AttentionItemView,
  type AttentionTone,
  type IconName,
} from '@/shared/ui';

// Copy exata da spec §3.3.
const A1 = 'A faixa de referência é a impressa no laudo. Só o profissional de saúde pode interpretar o resultado.';
const A3 = 'Referência do calendário público. Confirme com o profissional de saúde.';
const A13 = 'As pendências consideram só as doses registradas no app.';
const EMPTY = 'Nada pendente pelo que está registrado no app.';
const ERROR = 'Não foi possível montar o resumo da família.';

export interface FamilyAttentionCardProps {
  familyId: string;
  /** Destino do item: carteira de vacinas ou série do exame. */
  onOpen(target: AttentionItem['target']): void;
}

const lower = (s: string) => s.toLocaleLowerCase('pt-BR');

/**
 * Linha do item na folha (v4, esboço da pasta). Exame: "↑ 138 mg/dL, acima da faixa do laudo" com a data à
 * direita, e o nome sem a sigla entre parênteses ("Hemoglobina glicada"), para a data caber na linha do título.
 * Vacina: relógio (atrasada) ou calendário e o status do domínio com a data no texto, porque a data sozinha à
 * direita não diz o que significa; o ano corrente sai e a atrasada vira "Atrasada desde 10 de out.", para o
 * estado caber numa linha (o "pelo calendário" fica no aviso A3, abaixo das pessoas). O detalhe do domínio vem
 * em partes separadas por " · ".
 */
export function present(
  item: AttentionItem,
  today: string = toLocalIsoDate(),
): { icon: IconName; tone: AttentionTone; title: string; detail: string; meta?: string } {
  const parts = item.detail.split(' · ');
  if (item.kind === 'lab-out-of-range') {
    const [state = '', value, date] = parts;
    // O item do domínio não carrega a direção; o detalhe começa por ela (A2).
    const low = state.startsWith('Abaixo');
    return {
      icon: low ? 'stateLow' : 'stateHigh',
      tone: low ? 'low' : 'high',
      title: item.title.replace(/\s\([^()]*\)$/, ''),
      detail: value ? `${value}, ${lower(state)}` : item.detail,
      meta: date,
    };
  }
  const late = item.kind === 'vaccine-late';
  const thisYear = ` de ${today.slice(0, 4)}`;
  const detail = parts
    .map((p) => (p.endsWith(thisYear) ? p.slice(0, -thisYear.length) : p))
    .join(', ')
    .replace(/^Atrasada pelo calendário, a partir de /, 'Atrasada desde ');
  return { icon: late ? 'clock' : 'calendar', tone: late ? 'high' : 'care', title: item.title, detail };
}

/**
 * Rodapé do cartão: a linha coletiva das vacinas (F7.4) e, num só parágrafo abaixo, os avisos que cabem ao que
 * aparece (F7.5, S7, A1). Texto dos avisos como na spec §3.3.
 */
export function attentionFooter({ items, vaccines }: FamilyAttention): string {
  const people = vaccines.total === 1 ? 'pessoa' : 'pessoas';
  const missing = vaccines.withoutBirthDate > 0 ? `, ${vaccines.withoutBirthDate} sem data de nascimento` : '';
  const notices = [
    items.length === 0 ? A13 : null,
    items.some((i) => i.kind !== 'lab-out-of-range') ? A3 : null,
    items.some((i) => i.kind === 'lab-out-of-range') ? A1 : null,
  ].filter(Boolean);
  const line = `Vacinas: ${vaccines.upToDate} de ${vaccines.total} ${people} em dia com o calendário${missing}.`;
  return notices.length > 0 ? `${line}\n${notices.join(' ')}` : line;
}

/**
 * "Para acompanhar" do painel da família (F7): até 5 itens na ordem do domínio (tipo e data, nunca pessoas),
 * "Ver todos (n)" abre a lista completa no lugar. Sem nenhum dado de saúde na família, não aparece (F7.6).
 * v4: cada linha leva a marca de aba da pessoa; abaixo, a linha coletiva das vacinas. Os avisos ficam em
 * `FamilyAttentionNotices`, que a tela põe abaixo das pessoas.
 */
export function FamilyAttentionCard({ familyId, onOpen }: FamilyAttentionCardProps) {
  const theme = useTheme();
  const attention = useFamilyAttention(familyId);
  const [expanded, setExpanded] = useState(false);
  const data = attention.data;

  if (attention.isSuccess && data && !data.hasHealthData) return null;

  const header = <SectionHeader title="Para acompanhar" style={{ marginTop: 0 }} />;

  if (attention.isError) {
    return (
      <View testID="family-attention">
        {header}
        <ListSection>
          <View style={{ paddingVertical: theme.space[3], gap: theme.space[3], alignItems: 'flex-start' }}>
            <Text variant="body">{ERROR}</Text>
            <Button label="Tentar de novo" variant="bordered" size="sm" icon="refresh" onPress={() => void attention.refetch()} />
          </View>
        </ListSection>
      </View>
    );
  }

  if (!data) {
    return (
      <View testID="family-attention">
        {header}
        <ListSection>
          <ListSkeleton count={3} />
        </ListSection>
      </View>
    );
  }

  const views: AttentionItemView[] = data.items.map((item) => ({
    id: item.id,
    ...present(item),
    personId: item.memberId,
    onPress: () => onOpen(item.target),
  }));
  const [collective] = attentionFooter(data).split('\n');

  return (
    <View testID="family-attention">
      {header}
      <AttentionList
        items={views}
        max={expanded ? views.length : 5}
        onSeeAll={() => setExpanded(true)}
        emptyText={EMPTY}
      />
      <View style={{ paddingTop: theme.space[3] }}>
        <StateLine icon="shot" text={collective ?? ''} testID="family-vaccines-line" />
      </View>
    </View>
  );
}

/**
 * Os avisos do "Para acompanhar" (A1, A3, A13) num só parágrafo, para ir abaixo das pessoas: na folha, a primeira
 * tela mostra o que acompanhar e quem é a família antes das ressalvas. Mesma consulta do cartão (cache comum).
 */
export function FamilyAttentionNotices({ familyId }: { familyId: string }) {
  const data = useFamilyAttention(familyId).data;
  const notices = data?.hasHealthData ? attentionFooter(data).split('\n')[1] : undefined;
  if (!notices) return null;
  return (
    <Text variant="footnote" color="secondary" testID="family-attention-notices">
      {notices}
    </Text>
  );
}
