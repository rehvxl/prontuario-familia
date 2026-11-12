import { useContainer, useDeleteAccountFlow, useLoadDemoFamily, useRevokeConsentFlow } from '@/application';
import { SettingsScreen } from '@/screens/settings';

export default function SettingsRoute() {
  const mode = useContainer().mode;
  const loadDemoFamily = useLoadDemoFamily();
  return (
    <SettingsScreen
      mode={mode}
      revokeConsent={useRevokeConsentFlow()}
      deleteAccount={useDeleteAccountFlow()}
      // "Carregar família de exemplo" só existe no modo demo (ARCHITECTURE §3, Q10/L1).
      loadDemoFamily={mode === 'demo' ? loadDemoFamily : undefined}
    />
  );
}
