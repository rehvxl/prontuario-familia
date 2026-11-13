import { useMutation, useQueryClient } from '@tanstack/react-query';
import { emergencyCardKeys, filledFieldCount, useEmergencyCardRepository, type EmergencyCard, type EmergencyCardDraft } from '@/entities/emergency-card';
import { trackEmergencyCardEvent } from '../domain/analytics';

export function useSaveEmergencyCard() {
  const repo = useEmergencyCardRepository();
  const queryClient = useQueryClient();
  return useMutation<EmergencyCard, Error, { memberId: string; familyId: string; draft: EmergencyCardDraft }>({
    mutationFn: ({ memberId, familyId, draft }) => repo.upsert(memberId, familyId, draft),
    onSuccess: (card) => {
      trackEmergencyCardEvent('emergency_card_saved', { filledFieldCount: filledFieldCount(card) });
      void queryClient.invalidateQueries({ queryKey: emergencyCardKeys.byMember(card.memberId) });
    },
  });
}
