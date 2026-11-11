import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { screenTitleProps, useTheme } from '..';

export type ScreenTitleProps = ComponentProps<typeof Stack.Title>;

/**
 * Título da tela declarado dentro da própria tela. Use no lugar de `Stack.Title` do expo-router:
 * o `Stack.Title` reescreve `headerTitleStyle`/`headerLargeTitleStyle` e apaga as cores de
 * `headerTitleColors`, então o título volta a herdar o tint azul de `headerTintColor`.
 *
 * Fica em `@/shared/ui/navigation` (fora do índice principal) para o resto do DS não depender do expo-router.
 *
 * ```tsx
 * import { LargeTitle } from '@/shared/ui/navigation';
 * <LargeTitle>{family.name}</LargeTitle>
 * ```
 */
export function ScreenTitle(props: ScreenTitleProps) {
  const theme = useTheme();
  return <Stack.Title {...screenTitleProps(theme, props)} />;
}

/** Atalho para `<ScreenTitle large>`: título grande do iOS (no Android vira título normal). */
export function LargeTitle(props: Omit<ScreenTitleProps, 'large'>) {
  return <ScreenTitle {...props} large />;
}
