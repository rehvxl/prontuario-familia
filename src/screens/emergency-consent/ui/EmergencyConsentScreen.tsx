import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { onlineManager } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import {
  LGPD_LAW_URL,
  TERMS_V2_PARAGRAPH,
  TERMS_V3_ADDENDUM,
  TERMS_V3_HEALTH_DESCRIPTION,
  hasEmergencyCardConsent,
  useConsentRepository,
  useMyConsents,
} from '@/entities/consent';
import { declineEmergencyCardConsent, trackConsentEvent } from '@/features/consent';
import {
  Banner,
  Button,
  Card,
  Checkbox,
  IconButton,
  ListSection,
  ListSkeleton,
  LoadErrorState,
  Screen,
  SectionHeader,
  Text,
  errorMessage,
  headerOptions,
  useTheme,
} from '@/shared/ui';

/** O que a rota faz com o aceite (grava a v3 e abre a ficha). A tela não revoga. */
export interface EmergencyConsentFlow {
  mutate: (input: { termsAndPrivacy: boolean; healthData: boolean }) => void;
  isPending: boolean;
  error: unknown;
}

export interface EmergencyConsentScreenProps {
  flow: EmergencyConsentFlow;
  /** Volta ao resumo. O mesmo efeito de “Agora não”. */
  onDecline(): void;
  /** Já há v3: abre a leitura da ficha sem passar de novo pelo termo. */
  onAccepted(): void;
}

const CONTEXT =
  'A ficha de emergência guarda informações de saúde que o termo anterior não cobria. Leia o que mudou e, se concordar, aceite para usar a ficha. O resto do app continua funcionando com o consentimento que você já deu.';

const DECLINE_NOTE =
  'Se escolher Agora não, a ficha de emergência fica indisponível. O resto do app continua funcionando com o consentimento que você já deu. Nada é apagado, e esse consentimento não é revogado. Você pode aceitar depois, ao abrir a ficha de novo.';

const OFFLINE = 'Sem conexão: é preciso estar conectado para aceitar o termo. A ficha permanece indisponível.';

const SAVE_ERROR = 'Não foi possível salvar o aceite. Nada foi alterado. Tente de novo.';

/**
 * Reaceite da v3, só na porta da ficha. Não é o onboarding e não muda a etapa da SessionGate.
 * Textos do adendo: rascunho para revisão do Douglas no PR.
 */
export function EmergencyConsentScreen({ flow, onDecline, onAccepted }: EmergencyConsentScreenProps) {
  const theme = useTheme();
  // O tipo genérico do expo-router não inclui `beforeRemove` sem a lista de rotas da pilha.
  const navigation = useNavigation() as {
    addListener(event: 'beforeRemove', callback: (event: { preventDefault(): void }) => void): () => void;
  };
  const consents = useConsentRepository();
  const mine = useMyConsents();
  const [termsAndPrivacy, setTermsAndPrivacy] = useState(false);
  const [healthData, setHealthData] = useState(false);
  const [full, setFull] = useState(false);
  const [online, setOnline] = useState(() => onlineManager.isOnline());
  const left = useRef(false);
  const accepting = useRef(false);
  const forwarded = useRef(false);
  const onAcceptedRef = useRef(onAccepted);
  useEffect(() => {
    onAcceptedRef.current = onAccepted;
  }, [onAccepted]);
  const ready = termsAndPrivacy && healthData;
  const blocked = mine.isSuccess && !hasEmergencyCardConsent(mine.data);

  useEffect(() => onlineManager.subscribe(setOnline), []);

  useEffect(() => {
    if (flow.error) accepting.current = false;
  }, [flow.error]);

  useEffect(() => {
    if (!mine.isSuccess || !hasEmergencyCardConsent(mine.data) || forwarded.current) return;
    forwarded.current = true;
    accepting.current = true;
    onAcceptedRef.current();
  }, [mine.isSuccess, mine.data]);

  useEffect(() => {
    if (blocked) trackConsentEvent('consent_v3_shown');
  }, [blocked]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (event) => {
      if (flow.isPending) {
        (event as { preventDefault?: () => void }).preventDefault?.();
        return;
      }
      if (accepting.current || left.current) return;
      left.current = true;
      void declineEmergencyCardConsent(consents);
    });
    return unsub;
  }, [navigation, flow.isPending, consents]);

  const decline = () => {
    if (flow.isPending || left.current) return;
    left.current = true;
    void declineEmergencyCardConsent(consents);
    onDecline();
  };

  const accept = () => {
    if (!ready || !online || flow.isPending) return;
    accepting.current = true;
    flow.mutate({ termsAndPrivacy, healthData });
  };

  const footer = (
    <View style={{ gap: theme.space[2] }}>
      {ready ? null : (
        <Text variant="footnote" color="secondary" align="center">
          Marque as duas opções para continuar.
        </Text>
      )}
      <Button label="Aceitar e continuar" onPress={accept} disabled={!ready || !online} loading={flow.isPending} fullWidth />
      <Text variant="footnote" color="secondary">
        {DECLINE_NOTE}
      </Text>
      <Button label="Agora não" variant="bordered" onPress={decline} disabled={flow.isPending} fullWidth />
    </View>
  );

  let body;
  if (mine.isPending) body = <ListSkeleton count={3} />;
  else if (mine.isError) body = <LoadErrorState onRetry={() => void mine.refetch()} />;
  else if (blocked) {
    body = (
      <>
        {!online ? <Banner tone="warning" icon="offline" message={OFFLINE} style={{ marginBottom: theme.space[4] }} testID="consent-offline" /> : null}
        {flow.error ? (
          <Banner tone="danger" message={errorMessage(flow.error, SAVE_ERROR)} style={{ marginBottom: theme.space[4] }} testID="consent-save-error" />
        ) : null}
        <Text color="secondary" style={{ marginBottom: theme.space[4] }}>
          {CONTEXT}
        </Text>
        <SectionHeader title="O que mudou" style={{ marginTop: 0 }} />
        <Card testID="terms-v3-addendum">
          <Text>{TERMS_V3_ADDENDUM}</Text>
        </Card>
        <LawLink />
        <Pressable
          onPress={() => setFull((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={full ? 'Ocultar o texto completo do termo' : 'Ver o texto completo do termo'}
          accessibilityState={{ expanded: full }}
          style={{ minHeight: theme.minTouchTarget, justifyContent: 'center' }}
        >
          <Text variant="subheadline" color="link">
            {full ? 'Ocultar o texto completo do termo' : 'Ver o texto completo do termo'}
          </Text>
        </Pressable>
        {full ? (
          <Card testID="terms-full" style={{ marginBottom: theme.space[4] }}>
            <Text variant="title3" accessibilityRole="header" style={{ marginBottom: theme.space[3] }}>
              Texto completo do termo
            </Text>
            <Text>{TERMS_V2_PARAGRAPH}</Text>
            <Text style={{ marginTop: theme.space[4] }}>{TERMS_V3_ADDENDUM}</Text>
            <LawLink />
          </Card>
        ) : null}
        <ListSection style={{ marginTop: theme.space[4] }}>
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
            description={TERMS_V3_HEALTH_DESCRIPTION}
          />
        </ListSection>
      </>
    );
  }

  return (
    <Screen testID="emergency-consent-screen" board="ultramar" footer={blocked ? footer : undefined}>
      <Stack.Screen
        options={{
          ...headerOptions(theme, { board: 'ultramar', contentTitle: true }),
          headerBackVisible: false,
          title: 'Termo atualizado',
        }}
      />
      <StatusBar style={theme.hues.family.statusBar} />
      <IconButton
        icon="close"
        accessibilityLabel="Agora não. Fecha sem aceitar."
        accessibilityHint="A ficha permanece indisponível. Nada é apagado, e o consentimento que você já deu não é revogado."
        onPress={decline}
        disabled={flow.isPending}
        testID="consent-close"
      />
      <Text variant="largeTitle" color="link" accessibilityRole="header" style={{ marginTop: theme.space[2], marginBottom: theme.space[4] }}>
        Termo atualizado
      </Text>
      {body}
    </Screen>
  );
}

function LawLink() {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => void Linking.openURL(LGPD_LAW_URL)}
      accessibilityRole="link"
      accessibilityLabel="Lei nº 13.709/2018 (LGPD)"
      accessibilityHint="Abre o texto oficial da lei no navegador."
      style={{ minHeight: theme.minTouchTarget, justifyContent: 'center' }}
    >
      <Text variant="subheadline" color="link">
        Lei nº 13.709/2018 (LGPD)
      </Text>
    </Pressable>
  );
}
