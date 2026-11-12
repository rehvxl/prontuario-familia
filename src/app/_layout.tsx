import { useState } from "react";
import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, Redirect, Stack, ThemeProvider, useSegments, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AppProviders,
  entryRouteFor,
  isRouteInStep,
  useSessionState,
  type NextStep,
} from "@/application";
import { LoadErrorState, Screen, Spinner, UiProvider } from "@/shared/ui";

/**
 * Guarda de navegação (docs/ARCHITECTURE.md §4): cada grupo de rotas só existe na etapa a que pertence
 * (consentimento → login → família → app). `Stack.Protected` redireciona sozinho quando a etapa muda.
 */
function SessionGate() {
  const session = useSessionState();
  const segments = useSegments();
  const [lastStep, setLastStep] = useState<NextStep | null>(null);
  if (session.nextStep && session.nextStep !== lastStep)
    setLastStep(session.nextStep);
  // Durante a transição (ex.: logo após o login) mantém a última etapa, em vez de piscar a splash.
  const step = session.nextStep ?? lastStep;

  if (session.status === "error") {
    return (
      <Screen scroll={false}>
        <LoadErrorState onRetry={session.retry} />
      </Screen>
    );
  }
  if (!step) {
    return (
      <Screen scroll={false} testID="splash">
        <Spinner fill label="Abrindo sua pasta" />
      </Screen>
    );
  }

  // O setup (família → pessoas) continua acessível enquanto o usuário está nele, mesmo depois de a família existir.
  const inSetup = step === "main" && isRouteInStep("family", segments[0]);

  // Rota fora da etapa (ex.: abrir em "/" antes do login, link antigo): leva à entrada da etapa.
  const outOfStep = !inSetup && !isRouteInStep(step, segments[0]);

  return (
    <>
      {outOfStep ? <Redirect href={entryRouteFor(step, session.user !== null) as Href} /> : null}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={step === "consent"}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={step === "sign-in"}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="auth/callback" />
        </Stack.Protected>
        <Stack.Protected guard={step === "family" || inSetup}>
          <Stack.Screen name="(setup)" />
        </Stack.Protected>
        <Stack.Protected guard={step === "main"}>
          <Stack.Screen name="(main)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <UiProvider>
      <AppProviders>
        {/* Tema de navegação do expo-router: cabeçalhos e abas nativos (Liquid Glass no iOS 26) seguem claro/escuro do sistema. */}
        <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <SessionGate />
        </ThemeProvider>
      </AppProviders>
    </UiProvider>
  );
}
