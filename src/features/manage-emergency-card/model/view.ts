import { useEffect, useMemo, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';
import {
  readEmergencyReadCache,
  useMemberEmergencyCard,
  writeEmergencyReadCache,
  type EmergencyReadSnapshot,
} from '@/entities/emergency-card';
import { useMemberTimeline } from '@/entities/health-record';
import { useMemberMedications } from '@/entities/medication';
import { useMember } from '@/entities/member';
import { useCurrentUser } from '@/entities/session';
import { toLocalIsoDate } from '@/shared/lib';
import { assembleEmergencyCard, type AssembledEmergencyCard } from '../domain/assemble';

export type EmergencyCardViewState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; offline: boolean }
  | { status: 'ready'; offline: boolean; view: AssembledEmergencyCard };

function useOnline(): boolean {
  const [online, setOnline] = useState(() => onlineManager.isOnline());
  useEffect(() => onlineManager.subscribe(() => setOnline(onlineManager.isOnline())), []);
  return online;
}

function fromSnapshot(snapshot: EmergencyReadSnapshot): AssembledEmergencyCard {
  return {
    card: snapshot.card,
    identity: snapshot.identity,
    medications: snapshot.medications.map(({ id, name, dosage, instructions, startOn, endOn, origin }) => ({
      id,
      name,
      dosage,
      instructions,
      startOn,
      endOn,
      origin,
    })),
  };
}

/**
 * Leitura da ficha: a rede quando responde; o snapshot cifrado quando a consulta pausa. Sem snapshot, não inventa dado.
 * `enabled` falso (paywall) não busca a ficha nem lê ou grava o snapshot.
 */
export function useEmergencyCardView(memberId: string, enabled = true): EmergencyCardViewState {
  const user = useCurrentUser();
  const member = useMember(memberId || undefined);
  const card = useMemberEmergencyCard(memberId, enabled);
  const medications = useMemberMedications(memberId);
  const timeline = useMemberTimeline(member.data?.familyId, memberId || undefined);
  const online = useOnline();
  const [snapshot, setSnapshot] = useState<EmergencyReadSnapshot | null | undefined>(undefined);
  const userId = user.data?.id;
  const today = toLocalIsoDate();

  useEffect(() => {
    if (!enabled || !userId || !memberId) return;
    let cancel = false;
    void readEmergencyReadCache(userId, memberId).then((value) => {
      if (!cancel) setSnapshot(value);
    });
    return () => {
      cancel = true;
    };
  }, [enabled, userId, memberId]);

  const records = useMemo(
    () => new Map((timeline.data ?? []).flatMap((group) => group.records).map((record) => [record.id, { title: record.title, date: record.date }] as const)),
    [timeline.data],
  );
  const paused = !online || card.fetchStatus === 'paused' || member.fetchStatus === 'paused' || medications.fetchStatus === 'paused';
  // Dado já recebido continua na tela quando a rede cai. `paused` só esconde o que ainda não chegou.
  const hasLive = Boolean(member.isSuccess && member.data && card.isSuccess && medications.isSuccess);

  const liveView = useMemo(() => {
    if (!hasLive || !member.data) return null;
    return assembleEmergencyCard(
      { fullName: member.data.fullName, birthDate: member.data.birthDate, relationship: member.data.relationship, sex: member.data.sex },
      card.data ?? null,
      medications.data ?? [],
      today,
      records,
    );
  }, [hasLive, member.data, card.data, medications.data, today, records]);

  useEffect(() => {
    if (!userId || !memberId || !liveView) return;
    void writeEmergencyReadCache(userId, memberId, {
      card: liveView.card,
      identity: liveView.identity,
      medications: liveView.medications,
      cachedAt: new Date().toISOString(),
    });
  }, [userId, memberId, liveView]);

  if (member.isSuccess && member.data === null && !paused) return { status: 'missing' };
  if (liveView) return { status: 'ready', offline: paused, view: liveView };
  if (snapshot) return { status: 'ready', offline: true, view: fromSnapshot(snapshot) };
  if ((paused || card.isError || member.isError || medications.isError) && snapshot === null) return { status: 'error', offline: !online || paused };
  return { status: 'loading' };
}
