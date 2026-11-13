import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CURRENT_TERMS_VERSION, TERMS_EMERGENCY_CARD_ADDENDUM, TERMS_HEALTH_DESCRIPTION, TERMS_V2_PARAGRAPH, useMyConsents } from '@/entities/consent';
import { useCurrentUser } from '@/entities/session';
import { Banner, Button, Card, Checkbox, ListSection, Screen, Text, errorMessage, headerOptions, useTheme } from '@/shared/ui';

/** O que a tela precisa do fluxo de aceite (vem de `useConsentFlow`, montado na rota). */
export interface ConsentFlow {
  mutate: (input: { termsAndPrivacy: boolean; healthData: boolean }) => void;
  isPending: boolean;
  error: unknown;
}

/** Reexportado para os testes. */
export { TERMS_V2_PARAGRAPH };

/**
 * Consentimento (LGPD art. 11, I): duas caixas separadas e destacadas — termos/privacidade e tratamento de dados de saúde.
 * O botão só habilita com as duas marcadas. Quem leva ao próximo passo é a guarda de navegação.
 * Com sessão e um aceite vigente de versão anterior, o título vira "Termo atualizado" (P1, DESIGN_SYSTEM.md §7.13).
 * v4: numa folha sobre a capa ultramar (cabeçalho opaco na cor da família); o termo é a folha avulsa (`Card`,
 * surface com fio) e as duas marcas ficam nos fios da folha.
 */
export function ConsentScreen({ flow }: { flow: ConsentFlow }) {
  const theme = useTheme();
  const [termsAndPrivacy, setTermsAndPrivacy] = useState(false);
  const [healthData, setHealthData] = useState(false);
  const ready = termsAndPrivacy && healthData;
  const signedIn = useCurrentUser().data != null;
  const consents = useMyConsents({ enabled: signedIn }).data ?? [];
  const updated = consents.some((c) => c.revokedAt === null && c.version !== CURRENT_TERMS_VERSION);

  return (
    <Screen
      testID="consent-screen"
      board="ultramar"
      heading={{ title: updated ? 'Termo atualizado' : 'Antes de começar' }}
      footer={
        <View style={{ gap: theme.space[2] }}>
          {ready ? null : (
            <Text variant="footnote" color="secondary" align="center">
              Marque as duas opções para continuar.
            </Text>
          )}
          <Button
          label="Aceitar e continuar"
            onPress={() => flow.mutate({ termsAndPrivacy, healthData })}
            disabled={!ready}
            loading={flow.isPending}
            fullWidth
          />
        </View>
      }
    >
      <Stack.Screen options={headerOptions(theme, { board: 'ultramar' })} />
      <StatusBar style={theme.hues.family.statusBar} />
      <Text color="secondary" style={{ marginBottom: theme.space[6] }}>
        {updated
          ? 'O termo de uso ganhou um parágrafo sobre os dados de saúde que o app passou a organizar. Leia e aceite de novo para continuar.'
          : 'Precisamos da sua autorização para guardar as informações de saúde da sua família.'}
      </Text>
      {flow.error ? <Banner tone="danger" message={errorMessage(flow.error)} style={{ marginBottom: theme.space[4] }} /> : null}
      <Card style={{ marginBottom: theme.space[4] }} testID="terms-v2">
        <Text>{TERMS_V2_PARAGRAPH}</Text>
      </Card>
      <Card style={{ marginBottom: theme.space[6] }} testID="terms-emergency-card">
        <Text>{TERMS_EMERGENCY_CARD_ADDENDUM}</Text>
      </Card>
      <ListSection>
        <Checkbox
          checked={termsAndPrivacy}
          onChange={setTermsAndPrivacy}
          label="Li e aceito os Termos de Uso e a Política de Privacidade"
          description="Explicam como o app funciona e como cuidamos das suas informações."
        />
        <Checkbox
          checked={healthData}
          onChange={setHealthData}
          label="Autorizo o tratamento dos dados de saúde da minha família"
          description={TERMS_HEALTH_DESCRIPTION}
        />
      </ListSection>
    </Screen>
  );
}
