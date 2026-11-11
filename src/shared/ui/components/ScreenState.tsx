import { StyleSheet, View } from 'react-native';
import { Banner } from './Banner';
import { EmptyState } from './EmptyState';
import { SkeletonListItem } from './Skeleton';

/**
 * Texto para o usuário a partir de um erro: mensagens de regra de negócio (`DomainError`, já em pt-BR) passam;
 * o resto vira `fallback`. Reconhece pelo nome para o design system não depender de `shared/lib`.
 */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  return error instanceof Error && error.name === 'DomainError' && error.message.length > 0 ? error.message : fallback;
}

/** Primeira carga de uma lista: linhas fantasma com o formato do conteúdo. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View accessibilityLabel="Carregando" style={styles.list}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonListItem key={i} />
      ))}
    </View>
  );
}

/** Falha ao carregar (também cobre ficar sem conexão). Nada foi perdido: o usuário só tenta de novo. */
export function LoadErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <EmptyState
      tone="error"
      title="Não foi possível carregar"
      message={message ?? 'Verifique a conexão e tente de novo. Nada foi perdido.'}
      action={{ label: 'Tentar de novo', onPress: onRetry, icon: 'refresh-outline' }}
    />
  );
}

/** Aviso de rede parada: o TanStack Query pausa as consultas quando o app está sem conexão. */
export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <Banner tone="warning" icon="cloud-offline-outline" title="Sem conexão" message="Mostrando o que já foi carregado. Vamos atualizar quando a conexão voltar." />;
}

const styles = StyleSheet.create({
  list: { gap: 4 },
});
