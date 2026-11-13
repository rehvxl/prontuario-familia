import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { APP_CONSENT_VERSIONS, CURRENT_TERMS_VERSION } from '@/entities/consent';

/**
 * Aceite dos termos dado NESTE aparelho. Necessário porque o consentimento só pode ser gravado no servidor
 * com usuário logado (tabela `consents`), mas o fluxo pede o aceite antes do login. Após o login, a versão
 * aqui é gravada no repositório (ver `useSessionState`). Guarda só a versão aceita, nenhum dado pessoal.
 */
interface DeviceConsentState {
  acceptedVersion: string | null;
  hydrated: boolean;
  accept(version?: string): void;
  clear(): void;
}

export const useDeviceConsentStore = create<DeviceConsentState>()(
  persist(
    (set) => ({
      acceptedVersion: null,
      hydrated: false,
      accept: (version = CURRENT_TERMS_VERSION) => set({ acceptedVersion: version }),
      clear: () => set({ acceptedVersion: null }),
    }),
    {
      name: 'pf:device-consent',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ acceptedVersion: state.acceptedVersion }),
      onRehydrateStorage: () => () => useDeviceConsentStore.setState({ hydrated: true }),
    },
  ),
);

const appVersions: readonly string[] = APP_CONSENT_VERSIONS;

/** v2 ou v3 no aparelho: sem sessão, a guarda vai ao login (não força o onboarding da v3). */
export const hasDeviceAppConsent = (acceptedVersion: string | null): boolean =>
  acceptedVersion !== null && appVersions.includes(acceptedVersion);

/** Só a v3 no aparelho autoriza gravar o aceite no servidor depois do login. Nunca promove a v2 em silêncio. */
export const hasDeviceCurrentConsent = (acceptedVersion: string | null): boolean => acceptedVersion === CURRENT_TERMS_VERSION;

/** A guarda sem sessão usa o aceite de app (v2 ou v3), não só a versão atual. */
export const hasDeviceConsent = hasDeviceAppConsent;
