import { useMutation, useQueryClient } from '@tanstack/react-query';
import { familyKeys, useFamilyRepository } from '@/entities/family';
import { createFamily } from '../domain/create-family';

export function useCreateFamily() {
  const families = useFamilyRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createFamily({ families }, name),
    onSuccess: (family) => queryClient.setQueryData(familyKeys.mine, family),
  });
}
