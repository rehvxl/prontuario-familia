import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { formatShortDate, toLocalIsoDate } from '@/shared/lib';
import {
  ActionSheet,
  Banner,
  Button,
  ConfirmSheet,
  EmptyState,
  HueProvider,
  ListItem,
  ListSection,
  ListSkeleton,
  LoadErrorState,
  Screen,
  StatTile,
  StatTileGroup,
  Text,
  categoricalIndexFor,
  errorMessage,
  headerOptions,
  useTheme,
  type ActionSheetOption,
} from '@/shared/ui';
import { useRecord } from '@/entities/health-record';
import { formatAge, useMember } from '@/entities/member';
import { VaccineStatusRow, evaluateVaccines, useMemberVaccines, vaccineLabel, type RuleEvaluation, type VaccineDose } from '@/entities/vaccine';
import { DISMISSAL_REASON_LABEL, DismissRuleSheet, useDeleteVaccineDose, useUndoDismissal } from '@/features/record-vaccine-dose';
import { TOOLBAR_ICONS } from '@/shared/ui/navigation';
import { A13, A3, a12, doseDetail, doseExtra, emptyDoses, firstNameOf, plural, ruleDetail, ruleDoses, ruleTitle } from './vaccineText';

const ACTIONABLE = new Set(['late', 'due', 'confirm', 'next']);

interface Sheet {
  title: string;
  message?: string;
  options: ActionSheetOption[];
}

/** Carteira de vacinas e pendências (spec F3; rota member/[id]/vaccines). */
export function MemberVaccinesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = typeof id === 'string' ? id : '';
  const member = useMember(memberId || undefined);
  const vaccines = useMemberVaccines(memberId);
  const remove = useDeleteVaccineDose();
  const undo = useUndoDismissal();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [deleting, setDeleting] = useState<VaccineDose | null>(null);
  const [dismissing, setDismissing] = useState<{ ruleId: string; open: boolean } | null>(null);

  const today = toLocalIsoDate();
  // v4: a tela fica na divisória da pessoa; o FAB e as folhas por cima seguem a tinta dela.
  const hue = theme.personBoard(categoricalIndexFor(memberId));
  const focused = useIsFocused();
  const person = member.data;
  const data = vaccines.data;
  // F3.6: a consulta é invalidada a cada mudança, e a avaliação refaz aqui, sem recarregar a tela.
  const evaluation = useMemo(
    () => (person && data ? evaluateVaccines({ birthDate: person.birthDate, doses: data.doses, dismissals: data.dismissals, today }) : null),
    [person, data, today],
  );

  const registerDose = () => router.push({ pathname: '/(main)/vaccine-dose/new', params: { memberId } });
  const openRule = (e: RuleEvaluation) =>
    setSheet({
      title: ruleTitle(e, today),
      message: e.rule.note,
      options: [
        { label: 'Registrar dose', icon: 'add', onPress: registerDose },
        { label: 'Não se aplica', icon: 'close', onPress: () => setDismissing({ ruleId: e.rule.id, open: true }) },
      ],
    });
  const openDose = (d: VaccineDose) =>
    setSheet({
      title: vaccineLabel(d.vaccineCode, d.vaccineName),
      message: [doseDetail(d), doseExtra(d)].filter(Boolean).join(' · '),
      options: [
        { label: 'Editar dose', icon: 'edit', onPress: () => router.push({ pathname: '/(main)/vaccine-dose/new', params: { memberId, doseId: d.id } }) },
        { label: 'Excluir dose', icon: 'trash', destructive: true, onPress: () => setDeleting(d) },
      ],
    });

  const heading = { title: 'Carteira de vacinas', subtitle: person ? [person.fullName, formatAge(person.birthDate)].filter(Boolean).join(' · ') : undefined };
  const sectionGap = { marginTop: theme.space[7] };

  const body = (() => {
    if (member.isError || vaccines.isError) {
      return <LoadErrorState onRetry={() => void Promise.all([member.refetch(), vaccines.refetch()])} />;
    }
    if (member.isPending || vaccines.isPending || !evaluation || !data) {
      if (member.isSuccess && member.data === null) {
        return <EmptyState icon="person" title="Pessoa não encontrada" message="Ela pode ter sido removida da família." action={{ label: 'Voltar', onPress: () => router.back() }} />;
      }
      return <ListSkeleton />;
    }
    const firstName = firstNameOf(person?.fullName ?? '');
    const undated = data.doses.filter((d) => d.appliedOn === null).length;
    const rule = (e: RuleEvaluation, prefix: string) => (
      <VaccineStatusRow
        key={e.rule.id}
        vaccineName={ruleTitle(e, today)}
        status={e.status}
        detail={ruleDetail(e)}
        doses={ruleDoses(e, data.doses, today)}
        onPress={ACTIONABLE.has(e.status) ? () => openRule(e) : undefined}
        accessibilityHint={ACTIONABLE.has(e.status) ? 'Registrar dose ou marcar que não se aplica' : undefined}
        testID={`${prefix}-${e.rule.id}`}
      />
    );

    return (
      <>
        {remove.error ? <Banner tone="danger" message={errorMessage(remove.error, 'Não foi possível excluir. Nada foi apagado.')} style={{ marginBottom: theme.space[4] }} /> : null}
        {undo.error ? <Banner tone="danger" message={errorMessage(undo.error, 'Não foi possível desfazer. Tente novamente.')} style={{ marginBottom: theme.space[4] }} /> : null}

        {evaluation.missingBirthDate ? (
          // R13: sem nascimento, nenhuma regra é calculada (A12).
          <View style={{ gap: theme.space[2] }}>
            <View testID="missing-birth-date">
              <Text variant="body">{a12(firstName)}</Text>
              <Button
                label="Adicionar data de nascimento"
                variant="bordered"
                onPress={() => router.push({ pathname: '/(main)/member/[id]/edit', params: { id: memberId } })}
                style={{ marginTop: theme.space[4] }}
                fullWidth
              />
            </View>
            <Text variant="footnote" color="secondary">{`${A3} ${A13}`}</Text>
          </View>
        ) : (
          <>
            {/* Contagem como linha de tabela da folha: fios em cima e embaixo, sem cartão. */}
            <StatTileGroup testID="vaccine-tally" style={[styles.tally, { borderColor: theme.colors.border }]}>
              <StatTile value={String(evaluation.pending.length)} label={plural(evaluation.pending.length, 'pendência', 'pendências')} />
              <StatTile value={String(data.doses.length)} label={plural(data.doses.length, 'dose registrada', 'doses registradas')} />
              <StatTile value={String(undated)} label={plural(undated, 'data não informada', 'datas não informadas')} />
            </StatTileGroup>
            <ListSection header="Pendências" footer={`${A3} ${A13}`} style={sectionGap} testID="section-pending">
              {evaluation.pending.length > 0
                ? evaluation.pending.map((e) => rule(e, 'pending'))
                : [<ListItem key="none" title="Nada pendente pelo que está registrado no app." />]}
            </ListSection>
          </>
        )}

        <ListSection header="Aplicadas" style={sectionGap} testID="section-applied">
          {evaluation.applied.length > 0
            ? evaluation.applied.map((d) => <DoseRow key={d.id} dose={d} onPress={() => openDose(d)} />)
            : [<ListItem key="none" title={emptyDoses(firstName)} />]}
        </ListSection>

        {evaluation.calendar.length > 0 ? (
          <ListSection header="Calendário para a idade" style={sectionGap} testID="section-calendar">
            {evaluation.calendar.map((e) => rule(e, 'calendar'))}
          </ListSection>
        ) : null}

        {evaluation.notApplicable.length > 0 ? (
          <ListSection header="Não se aplica" style={sectionGap} testID="section-not-applicable">
            {evaluation.notApplicable.map((e) => {
              const reason = e.dismissal ? DISMISSAL_REASON_LABEL[e.dismissal.reason] : undefined;
              const title = ruleTitle(e, today);
              return (
                <VaccineStatusRow
                  key={e.rule.id}
                  vaccineName={title}
                  status="notApplicable"
                  detail={ruleDetail(e, reason)}
                  testID={`not-applicable-${e.rule.id}`}
                  trailing={
                    e.dismissal ? (
                      <Button
                        label="Desfazer"
                        variant="plain"
                        size="sm"
                        accessibilityLabel={`Desfazer: ${title}`}
                        loading={undo.isPending && undo.variables?.id === e.dismissal.id}
                        onPress={() => e.dismissal && undo.mutate(e.dismissal)}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </ListSection>
        ) : null}

        {evaluation.other.length > 0 ? (
          <ListSection header="Outras indicações do calendário" style={sectionGap} testID="section-other">
            {evaluation.other.map((r) => (
              <ListItem key={r.id} title={vaccineLabel(r.vaccineCode)} subtitle={r.note} />
            ))}
          </ListSection>
        ) : null}
      </>
    );
  })();

  return (
    <HueProvider hue={hue}>
      <Screen testID="member-vaccines-screen" board={hue} heading={heading}>
        <Stack.Screen options={headerOptions(theme, { board: hue, contentTitle: true })} />
        {focused ? <StatusBar style={hue.statusBar} /> : null}
        {person ? (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button icon={TOOLBAR_ICONS.add} accessibilityLabel="Registrar dose" onPress={registerDose} />
          </Stack.Toolbar>
        ) : null}
        {body}
      </Screen>
      <ActionSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet?.title} message={sheet?.message} options={sheet?.options ?? []} />
      <ConfirmSheet
        visible={deleting !== null}
        destructive
        title="Excluir esta dose?"
        message="A dose sai da carteira e as pendências são recalculadas. Não dá para desfazer."
        confirmLabel="Excluir dose"
        loading={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting, { onSettled: () => setDeleting(null) })}
      />
      {dismissing ? (
        <DismissRuleSheet memberId={memberId} ruleId={dismissing.ruleId} visible={dismissing.open} onDone={() => setDismissing({ ...dismissing, open: false })} />
      ) : null}
    </HueProvider>
  );
}

/** Dose aplicada com a origem (S5): o título do documento vem do registro ligado. */
function DoseRow({ dose, onPress }: { dose: VaccineDose; onPress(): void }) {
  const record = useRecord(dose.sourceRecordId ?? undefined);
  const origin = dose.sourceRecordId
    ? record.data
      ? `Do documento ${record.data.title}, ${formatShortDate(record.data.date)}`
      : undefined
    : 'Registrado por você';
  return (
    <VaccineStatusRow
      vaccineName={vaccineLabel(dose.vaccineCode, dose.vaccineName)}
      status="applied"
      detail={doseDetail(dose)}
      doses={doseExtra(dose)}
      origin={origin}
      onPress={onPress}
      accessibilityHint="Editar ou excluir a dose"
      testID={`dose-${dose.id}`}
    />
  );
}

const styles = StyleSheet.create({
  tally: { backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
});
