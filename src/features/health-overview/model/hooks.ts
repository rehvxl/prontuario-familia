import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { toLocalIsoDate } from '@/shared/lib';
import {
  measurementKeys,
  useFamilyMeasurements,
  useMeasurementRepository,
  useMemberMeasurements,
  type Measurement,
} from '@/entities/measurement';
import { medicationKeys, useMedicationRepository, useMemberMedications, type Medication } from '@/entities/medication';
import { useMember, useMembers } from '@/entities/member';
import { useMemberVaccines, useVaccineDoseRepository, vaccineKeys, type VaccineDose } from '@/entities/vaccine';
import { buildFamilyAttention, type FamilyAttention } from '../domain/family-attention';
import { buildMemberSummary, type MemberHealthSummary } from '../domain/member-summary';

export type HealthSection = 'vaccines' | 'labs' | 'medications' | 'vitals';
export interface SectionState {
  isLoading: boolean;
  error: unknown;
  retry(): void;
}

export interface RecordLinkedItems {
  measurements: Measurement[];
  vaccineDoses: VaccineDose[];
  medications: Medication[];
  /** {n} da A15. */
  count: number;
}

/**
 * Chaves dos itens de um documento que as entities não declaram. Ficam sob o prefixo da entity para pegar a
 * invalidação ampla (`vaccineKeys.all`, `medicationKeys.all`) de quem apaga ou cria em lote.
 */
const linkedKeys = {
  vaccineDoses: (recordId: string) => [...vaccineKeys.all, 'source', recordId] as const,
  medications: (recordId: string) => [...medicationKeys.all, 'source', recordId] as const,
};

type AnyQuery = UseQueryResult<unknown>;

function sectionOf(...parts: AnyQuery[]): SectionState {
  return {
    isLoading: parts.some((p) => p.isLoading),
    error: parts.find((p) => p.isError)?.error ?? null,
    retry: () => parts.filter((p) => p.isError).forEach((p) => void p.refetch()),
  };
}

/**
 * Junta consultas que já existem num resultado só. Cada parte mantém a própria chave, então a invalidação que as
 * mutations já fazem (medições, vacinas, pessoas) atualiza o resultado sem chave nova para lembrar.
 * O estado é o da primeira parte com erro, senão o da primeira ainda carregando.
 */
function combine<T>(parts: AnyQuery[], data: T | undefined): UseQueryResult<T> {
  const base = parts.find((p) => p.isError) ?? parts.find((p) => !p.isSuccess) ?? parts[0]!;
  // cast: o objeto tem todos os campos de UseQueryResult; só `data` e `refetch` passam a valer para o conjunto.
  return {
    ...base,
    data: parts.every((p) => p.isSuccess) ? data : undefined,
    refetch: () => Promise.all(parts.map((p) => p.refetch())).then(() => base),
  } as unknown as UseQueryResult<T>;
}

/** Resumo de saúde da pessoa (F6). Uma seção com erro não derruba as outras: o resumo usa lista vazia no lugar. */
export function useMemberHealthSummary(memberId: string): {
  summary?: MemberHealthSummary;
  sections: Record<HealthSection, SectionState>;
} {
  const member = useMember(memberId);
  const measurements = useMemberMeasurements(memberId);
  const vaccines = useMemberVaccines(memberId);
  const medications = useMemberMedications(memberId);
  const today = toLocalIsoDate();

  const summary = useMemo(
    () =>
      member.data
        ? buildMemberSummary({
            member: member.data,
            measurements: measurements.data ?? [],
            doses: vaccines.data?.doses ?? [],
            dismissals: vaccines.data?.dismissals ?? [],
            medications: medications.data ?? [],
            today,
          })
        : undefined,
    [member.data, measurements.data, vaccines.data, medications.data, today],
  );

  return {
    summary,
    sections: {
      vaccines: sectionOf(member, vaccines),
      labs: sectionOf(measurements),
      medications: sectionOf(medications),
      vitals: sectionOf(measurements),
    },
  };
}

/** Cartão "Para acompanhar" do painel da família (F7). */
export function useFamilyAttention(familyId: string): UseQueryResult<FamilyAttention> {
  const repo = useVaccineDoseRepository();
  const members = useMembers(familyId);
  const measurements = useFamilyMeasurements(familyId);
  const doses = useQuery({ queryKey: vaccineKeys.byFamily(familyId), queryFn: () => repo.listByFamily(familyId), enabled: !!familyId });
  const dismissals = useQuery({
    queryKey: vaccineKeys.dismissals(familyId),
    queryFn: () => repo.listFamilyDismissals(familyId),
    enabled: !!familyId,
  });
  const today = toLocalIsoDate();
  const data = useMemo(
    () =>
      members.data && measurements.data && doses.data && dismissals.data
        ? buildFamilyAttention({ members: members.data, measurements: measurements.data, doses: doses.data, dismissals: dismissals.data, today })
        : undefined,
    [members.data, measurements.data, doses.data, dismissals.data, today],
  );
  return combine([members, measurements, doses, dismissals], data);
}

/** Itens de saúde ligados a um documento; `count` é o {n} da A15. */
export function useRecordLinkedItems(recordId: string): UseQueryResult<RecordLinkedItems> {
  const measurementRepo = useMeasurementRepository();
  const vaccineRepo = useVaccineDoseRepository();
  const medicationRepo = useMedicationRepository();
  const enabled = !!recordId;
  const measurements = useQuery({
    queryKey: measurementKeys.bySource(recordId),
    queryFn: () => measurementRepo.listBySourceRecord(recordId),
    enabled,
  });
  const vaccineDoses = useQuery({
    queryKey: linkedKeys.vaccineDoses(recordId),
    queryFn: () => vaccineRepo.listBySourceRecord(recordId),
    enabled,
  });
  const medications = useQuery({
    queryKey: linkedKeys.medications(recordId),
    queryFn: () => medicationRepo.listBySourceRecord(recordId),
    enabled,
  });
  const data = useMemo(
    () =>
      measurements.data && vaccineDoses.data && medications.data
        ? {
            measurements: measurements.data,
            vaccineDoses: vaccineDoses.data,
            medications: medications.data,
            count: measurements.data.length + vaccineDoses.data.length + medications.data.length,
          }
        : undefined,
    [measurements.data, vaccineDoses.data, medications.data],
  );
  return combine([measurements, vaccineDoses, medications], data);
}
