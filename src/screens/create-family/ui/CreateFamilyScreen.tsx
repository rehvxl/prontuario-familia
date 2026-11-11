import { useState } from 'react';
import { useRouter } from 'expo-router';
import { FAMILY_NAME_MAX, useCreateFamily } from '@/features/create-family';
import { Button, Screen, Text, TextField, errorMessage, useTheme } from '@/shared/ui';

/** Primeiro passo do setup: dar nome à família. Em seguida, adicionar as primeiras pessoas. */
export function CreateFamilyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const create = useCreateFamily();
  const submit = () => create.mutate(name, { onSuccess: () => router.replace('/(setup)/members') });
  return (
    <Screen
      testID="create-family-screen"
      footer={<Button label="Criar família" onPress={submit} loading={create.isPending} disabled={name.trim() === ''} fullWidth />}
    >
      <Text variant="title1">Como se chama a sua família?</Text>
      <Text color="secondary" style={{ marginTop: theme.space[2], marginBottom: theme.space[6] }}>
        Será o nome da sua pasta. Pode ser o sobrenome ou algo simples, como “Família Souza”.
      </Text>
      <TextField
        label="Nome da família"
        value={name}
        onChangeText={setName}
        maxLength={FAMILY_NAME_MAX}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={submit}
        error={create.error ? errorMessage(create.error, 'Não foi possível criar a família. Tente novamente.') : null}
        disabled={create.isPending}
        testID="family-name-input"
      />
    </Screen>
  );
}
