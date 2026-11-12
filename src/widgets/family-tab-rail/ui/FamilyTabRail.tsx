import type { ReactElement } from 'react';
import { useMembers } from '@/entities/member';
import { useRecordCounts } from '@/entities/health-record';
import { HueProvider, TabRail, categoricalIndexFor, useTheme, type HueTokens } from '@/shared/ui';

/** Id da aba da família na régua (as outras abas usam o id da pessoa). */
export const FAMILY_TAB_ID = 'family';

export interface FamilyTabRailOptions {
  familyId: string | undefined;
  /** Aba da tela atual: `FAMILY_TAB_ID` no painel, o id da pessoa na tela dela. */
  current: string;
  /** Chamado no toque de uma aba que não é a atual. A tela troca a divisória. */
  onNavigate(id: string): void;
}

export interface FamilyTabRail {
  /** A régua pronta para `Screen rail`/`DividerBoard rail`; null sem pessoas carregadas. */
  rail: ReactElement | null;
  /** Divisória da aba atual. Vai em `board`/`hue`. */
  hue: HueTokens;
}

const firstNameOf = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;
const docs = (n: number) => (n === 1 ? '1 documento' : `${n} documentos`);

/**
 * Régua de abas da pasta (v4): "Família" + uma aba por pessoa, na ordem de cadastro (nunca por pontuação, S9),
 * com a contagem de documentos escrita. A aba atual é a da tela (`current`); tocar outra chama `onNavigate`, e a
 * tela troca a divisória no mesmo quadro (a aba anima sozinha, no `TabRail`). O widget não conhece o router.
 */
export function useFamilyTabRail({ familyId, current, onNavigate }: FamilyTabRailOptions): FamilyTabRail {
  const theme = useTheme();
  const members = useMembers(familyId).data ?? [];
  const counts = useRecordCounts(familyId).data;
  const hueOf = (id: string) => (id === FAMILY_TAB_ID ? theme.hues.family : theme.personBoard(categoricalIndexFor(id)));
  const selected = current;
  const hue = hueOf(selected);

  const rail =
    members.length === 0 ? null : (
      // A aba marcada é a própria divisória: o HueProvider dá a ela a cor da divisória atual.
      <HueProvider hue={hue}>
        <TabRail
          onSelect={onNavigate}
          testID="family-tab-rail"
          items={[
            { id: FAMILY_TAB_ID, label: 'Família', hue: theme.hues.family, selected: selected === FAMILY_TAB_ID },
            ...members.map((m) => {
              const count = counts ? (counts[m.id] ?? 0) : undefined;
              return {
                id: m.id,
                label: firstNameOf(m.fullName),
                count,
                hue: hueOf(m.id),
                selected: selected === m.id,
                // Nome completo para o leitor de tela: duas pessoas podem ter o mesmo primeiro nome.
                accessibilityLabel: count === undefined ? m.fullName : `${m.fullName}, ${docs(count)}`,
              };
            }),
          ]}
        />
      </HueProvider>
    );

  return { rail, hue };
}
