import * as Crypto from 'expo-crypto';

function fallbackUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** UUID v4. Usa o gerador seguro do Expo; cai em Math.random só se o módulo nativo não estiver disponível (ex.: Jest). */
export function newId(): string {
  try {
    const id: unknown = Crypto.randomUUID();
    if (typeof id === 'string' && id.length > 0) return id;
  } catch {
    // módulo nativo indisponível
  }
  return fallbackUuid();
}
