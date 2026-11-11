import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { ThemeProvider, type ThemePreference } from './theme';

/** Renderiza com o ThemeProvider (sem safe area). Para testes de componentes de UI. */
export function renderWithTheme(ui: ReactElement, scheme: ThemePreference = 'light') {
  return render(
    <ThemeProvider scheme={scheme} reducedMotion>
      {ui}
    </ThemeProvider>,
  );
}
