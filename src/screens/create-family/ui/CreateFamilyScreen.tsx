import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FAMILY_NAME_MAX, useCreateFamily } from '@/features/create-family';
import { Button, Screen, Text, TextField, errorMessage, useTheme } from '@/shared/ui';

/**
 * Primeiro passo do setup: dar nome à família. Em seguida, adicionar as primeiras pessoas.
 * v4: criar a família é rotular a capa. Abaixo do campo, a capa ultramar com a etiqueta mostra o nome enquanto
 * ele é digitado (o exemplo "Família Souza" em tom de dica até lá).
 */
export function CreateFamilyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const create = useCreateFamily();
  const submit = () => create.mutate(name, { onSuccess: () => router.replace('/(setup)/members') });
  return (
    <Screen
      testID="create-family-screen"
      board="ultramar"
      edges={['top', 'left', 'right', 'bottom']}
      heading={{ title: 'Como se chama a sua família?' }}
      footer={<Button label="Criar família" onPress={submit} loading={create.isPending} disabled={name.trim() === ''} fullWidth />}
    >
      <StatusBar style={theme.hues.family.statusBar} />
      <Text color="secondary" style={{ marginBottom: theme.space[6] }}>
        Será o nome da sua pasta. Pode ser o sobrenome ou algo simples.
      </Text>
      <TextField
        label="Nome da família"
        value={name}
        onChangeText={setName}
        placeholder="Família Souza"
        maxLength={FAMILY_NAME_MAX}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={submit}
        error={create.error ? errorMessage(create.error, 'Não foi possível criar a família. Tente novamente.') : null}
        disabled={create.isPending}
        testID="family-name-input"
      />
      {/* Depois do campo: com o teclado aberto, o campo fica à vista e a etiqueta logo abaixo. */}
      <CoverLabel name={name.trim()} />
    </Screen>
  );
}

/**
 * A capa da pasta com a etiqueta: a divisória da família (cor plena) e, nela, o nome na folha leitosa.
 * Decorativa para o leitor de tela: o nome já está no campo logo acima.
 */
function CoverLabel({ name }: { name: string }) {
  const theme = useTheme();
  const cover = theme.hues.family;
  return (
    <View
      testID="family-cover-preview"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.cover,
        { backgroundColor: cover.board, borderTopRightRadius: theme.radii.leaf, padding: theme.space[4], marginTop: theme.space[6] },
      ]}
    >
      <View style={[styles.label, { backgroundColor: theme.colors.background, borderRadius: theme.radii.xs, paddingHorizontal: theme.space[3], paddingVertical: theme.space[2] }]}>
        <Text variant="title1" color={name ? 'link' : 'tertiary'}>
          {name || 'Família Souza'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Altura fixa mínima: a capa não pula quando o nome quebra linha ou some.
  cover: { minHeight: 128, justifyContent: 'flex-end', borderCurve: 'continuous' },
  label: { alignSelf: 'flex-start', maxWidth: '100%' },
});
