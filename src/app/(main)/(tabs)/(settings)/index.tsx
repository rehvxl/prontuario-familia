import { useContainer, useDeleteAccountFlow, useRevokeConsentFlow } from '@/application';
import { SettingsScreen } from '@/screens/settings';

export default function SettingsRoute() {
  const mode = useContainer().mode;
  return <SettingsScreen mode={mode} revokeConsent={useRevokeConsentFlow()} deleteAccount={useDeleteAccountFlow()} />;
}
