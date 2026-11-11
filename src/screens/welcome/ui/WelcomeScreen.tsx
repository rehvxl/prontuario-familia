import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Icon, Screen, Text, useTheme, type IconName } from '@/shared/ui';

const SLIDES: readonly { icon: IconName; title: string; message: string }[] = [
  {
    icon: 'folder-open-outline',
    title: 'A pasta da família, no celular',
    message: 'Guarde exames, receitas, laudos e vacinas de cada pessoa, organizados por data.',
  },
  {
    icon: 'search-outline',
    title: 'Ache na hora',
    message: 'Busque por exame, médico ou local e mostre o documento certo na hora da consulta.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Só a sua família vê',
    message: 'Seus dados ficam protegidos. Você pode exportar ou apagar tudo quando quiser.',
  },
];

/** Três telas curtas de boas-vindas; a última leva ao consentimento. "Pular" vai direto a ele. */
export function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0]!;
  const last = index === SLIDES.length - 1;
  const goToConsent = () => router.push('/(onboarding)/consent');

  return (
    <Screen
      edges={['top', 'left', 'right', 'bottom']}
      scroll={false}
      testID="welcome-screen"
      footer={
        <View style={{ gap: theme.space[2] }}>
          <Button label={last ? 'Começar' : 'Continuar'} onPress={last ? goToConsent : () => setIndex(index + 1)} fullWidth />
          {last ? null : <Button label="Pular" variant="ghost" onPress={goToConsent} fullWidth />}
        </View>
      }
    >
      <View style={styles.content}>
        <View style={[styles.badge, { backgroundColor: theme.colors.primarySoft, borderRadius: theme.radii.xl }]}>
          <Icon name={slide.icon} size={56} color="onPrimarySoft" />
        </View>
        <Text variant="display" align="center" style={{ marginTop: theme.space[8] }}>
          {slide.title}
        </Text>
        <Text variant="body" color="secondary" align="center" style={{ marginTop: theme.space[3] }}>
          {slide.message}
        </Text>
        <Text variant="footnote" color="tertiary" align="center" style={{ marginTop: theme.space[8] }} accessibilityLabel={`Passo ${index + 1} de ${SLIDES.length}`}>
          {`${index + 1} de ${SLIDES.length}`}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
});
