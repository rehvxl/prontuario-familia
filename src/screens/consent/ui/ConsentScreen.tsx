import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, Card, Checkbox, Screen, Text, errorMessage, useTheme } from '@/shared/ui';

/** O que a tela precisa do fluxo de aceite (vem de `useConsentFlow`, montado na rota). */
export interface ConsentFlow {
  mutate: (input: { termsAndPrivacy: boolean; healthData: boolean }) => void;
  isPending: boolean;
  error: unknown;
}

/**
 * Consentimento (LGPD art. 11, I): duas caixas separadas e destacadas — termos/privacidade e tratamento de dados de saúde.
 * O botão só habilita com as duas marcadas. Quem leva ao próximo passo é a guarda de navegação.
 */
export function ConsentScreen({ flow }: { flow: ConsentFlow }) {
  const theme = useTheme();
  const [termsAndPrivacy, setTermsAndPrivacy] = useState(false);
  const [healthData, setHealthData] = useState(false);
  const ready = termsAndPrivacy && healthData;

  return (
    <Screen
      testID="consent-screen"
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
      <Text variant="title1">Antes de começar</Text>
      <Text color="secondary" style={{ marginTop: theme.space[2], marginBottom: theme.space[6] }}>
        Precisamos da sua autorização para guardar as informações de saúde da sua família.
      </Text>
      {flow.error ? <Banner tone="danger" message={errorMessage(flow.error)} style={{ marginBottom: theme.space[4] }} /> : null}
      <View style={{ gap: theme.space[4] }}>
        <Card>
          <Checkbox
            checked={termsAndPrivacy}
            onChange={setTermsAndPrivacy}
            label="Li e aceito os Termos de Uso e a Política de Privacidade"
            description="Explicam como o app funciona e como cuidamos das suas informações."
          />
        </Card>
        <Card>
          <Checkbox
            checked={healthData}
            onChange={setHealthData}
            label="Autorizo o tratamento dos dados de saúde da minha família"
            description="Exames, receitas e vacinas são dados pessoais sensíveis (LGPD, art. 11). Só servem para mostrar o histórico a você e a quem você adicionar à família. Você pode revogar quando quiser, em Ajustes."
          />
        </Card>
      </View>
    </Screen>
  );
}
