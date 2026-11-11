import { renderHook } from '@testing-library/react-native';
import { DependencyProvider, useDependency } from './index';

describe('DI genérico', () => {
  it('entrega a dependência registrada pela chave', async () => {
    const repo = { name: 'fake' };
    const { result } = await renderHook(() => useDependency<typeof repo>('members'), {
      wrapper: ({ children }) => <DependencyProvider dependencies={{ members: repo }}>{children}</DependencyProvider>,
    });
    expect(result.current).toBe(repo);
  });

  it('falha com mensagem clara fora do provider ou com chave ausente', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => useDependency('members'))).rejects.toThrow(/fora de um DependencyProvider/);
    await expect(
      renderHook(() => useDependency('records'), {
        wrapper: ({ children }) => <DependencyProvider dependencies={{ members: 1 }}>{children}</DependencyProvider>,
      }),
    ).rejects.toThrow(/"records" não registrada/);
    jest.restoreAllMocks();
  });
});
