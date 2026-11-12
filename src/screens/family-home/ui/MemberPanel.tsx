import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { formatAge, relationshipLabel, type Member } from '@/entities/member';
import { RECORD_TYPE_OPTIONS, RecordListItem, monthLabel, useMemberTimeline, type RecordType } from '@/entities/health-record';
import { MemberHealthSummary, type SummaryTarget } from '@/widgets/member-health-summary';
import { ChipGroup, EmptyState, ListSection, ListSkeleton, LoadErrorState, SegmentedControl, useTheme } from '@/shared/ui';

export type PersonView = 'summary' | 'documents';
const VIEWS = [
  { value: 'summary', label: 'Resumo' },
  { value: 'documents', label: 'Documentos' },
] as const;

/** "Cônjuge · 67 anos · 9 documentos" (a contagem só quando conhecida). */
export function memberSubtitle(member: Member, documents?: number): string {
  return [
    relationshipLabel(member.relationship, member.sex),
    formatAge(member.birthDate),
    documents === undefined ? null : documents === 1 ? '1 documento' : `${documents} documentos`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export interface MemberPanelProps {
  familyId: string | undefined;
  memberId: string;
  /** A pessoa, da lista que o painel da família já carregou (sem consulta nova na troca); null = não está mais na família. */
  member: Member | null;
  initialView?: PersonView;
  /** Volta para a divisória da família (pessoa removida). */
  onLeave(): void;
}

/**
 * Conteúdo da divisória de uma pessoa (spec F6), dentro do painel da família: Resumo (padrão) e Documentos (a
 * linha do tempo do MVP: registros por mês, do mais recente ao mais antigo, com filtro por tipo). O nome e
 * "parentesco · idade · n documentos" ficam no cabeçalho da folha, no mesmo lugar de "Família Souza".
 */
export function MemberPanel({ familyId, memberId, member, initialView = 'summary', onLeave }: MemberPanelProps) {
  const theme = useTheme();
  const router = useRouter();
  const [view, setView] = useState<PersonView>(initialView);
  const [types, setTypes] = useState<RecordType[]>([]);
  const timeline = useMemberTimeline(familyId, memberId, types);
  const documents = view === 'documents';

  const open = (target: SummaryTarget) => {
    const id = memberId;
    switch (target.screen) {
      case 'exams':
        return router.push({ pathname: '/(main)/member/[id]/exams', params: { id } });
      case 'exam-series':
        return router.push({ pathname: '/(main)/member/[id]/exams/[series]', params: { id, series: target.seriesKey } });
      case 'vaccines':
        return router.push({ pathname: '/(main)/member/[id]/vaccines', params: { id } });
      case 'medications':
        return router.push({ pathname: '/(main)/member/[id]/medications', params: { id } });
      case 'vitals':
        return router.push({ pathname: '/(main)/member/[id]/vitals/[code]', params: { id, code: target.code } });
      case 'new-measurement':
        return router.push({ pathname: '/(main)/measurement/new', params: { memberId: id } });
      case 'new-vaccine-dose':
        return router.push({ pathname: '/(main)/vaccine-dose/new', params: { memberId: id } });
      case 'new-medication':
        return router.push({ pathname: '/(main)/medication/new', params: { memberId: id } });
      case 'new-vital':
        return router.push({ pathname: '/(main)/vital/new', params: { memberId: id } });
      case 'edit-member':
        return router.push({ pathname: '/(main)/member/[id]/edit', params: { id } });
    }
  };

  if (!member) {
    return <EmptyState icon="person" title="Pessoa não encontrada" message="Ela pode ter sido removida da família." action={{ label: 'Voltar para a família', onPress: onLeave }} />;
  }
  const name = member.fullName;

  const documentsBody = () => {
    if (timeline.isError) return <LoadErrorState onRetry={() => void timeline.refetch()} />;
    if (timeline.isPending) return timeline.fetchStatus === 'paused' ? <LoadErrorState onRetry={() => void timeline.refetch()} /> : <ListSkeleton />;
    const groups = timeline.data ?? [];
    if (groups.length === 0) {
      return types.length > 0 ? (
        <EmptyState
          icon="filter"
          title="Nenhum documento deste tipo"
          message="Tente outro tipo ou limpe o filtro para ver tudo."
          action={{ label: 'Limpar filtro', onPress: () => setTypes([]) }}
        />
      ) : (
        <EmptyState icon="folder" title={`Ainda não há documentos de ${name}`} message="Toque em “Novo registro” para adicionar o primeiro exame, receita ou laudo." />
      );
    }
    // shortcut: os meses vão num map dentro da rolagem da folha (sem virtualizar); troque por FlatList se uma pessoa passar de centenas de registros.
    return groups.map((g) => (
      <ListSection key={g.month} header={monthLabel(g.month)} style={{ marginTop: theme.space[6] }} testID={`month-${g.month}`}>
        {g.records.map((record) => (
          <RecordListItem key={record.id} record={record} onPress={() => router.push({ pathname: '/(main)/record/[id]', params: { id: record.id } })} />
        ))}
      </ListSection>
    ));
  };

  return (
    <View testID="timeline-list">
      <SegmentedControl options={VIEWS} value={view} onChange={setView} accessibilityLabel="Vista da pessoa" testID="member-view" />
      {documents ? (
        <>
          <ChipGroup
            options={RECORD_TYPE_OPTIONS}
            value={types}
            onChange={setTypes}
            allLabel="Todos"
            style={{ marginTop: theme.space[4], marginBottom: theme.space[2] }}
            testID="type-filter"
          />
          {documentsBody()}
        </>
      ) : (
        <MemberHealthSummary member={member} onOpen={open} />
      )}
    </View>
  );
}
