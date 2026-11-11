import { createContext, createElement, useContext, type ReactNode } from 'react';

/**
 * Injeção de dependências genérica (React Context).
 *
 * `shared` não conhece entities, então não sabe os tipos das portas. Cada slice declara um hook tipado
 * (`useMemberRepository = () => useDependency<MemberRepository>(DEPENDENCY_KEYS.members)`) e a camada
 * `application` registra as implementações concretas num único `DependencyProvider`. Testes registram fakes.
 */
export const DEPENDENCY_KEYS = {
  auth: 'auth',
  families: 'families',
  members: 'members',
  records: 'records',
  storage: 'storage',
  consents: 'consents',
  dataExport: 'dataExport',
} as const;

export type DependencyKey = (typeof DEPENDENCY_KEYS)[keyof typeof DEPENDENCY_KEYS];
export type DependencyMap = Readonly<Record<string, unknown>>;

const DependencyContext = createContext<DependencyMap | null>(null);

export function DependencyProvider({ dependencies, children }: { dependencies: DependencyMap; children?: ReactNode }) {
  return createElement(DependencyContext.Provider, { value: dependencies }, children);
}

/** Resolve uma dependência registrada. Lança erro de programação se faltar provider ou chave. */
export function useDependency<T>(key: string): T {
  const map = useContext(DependencyContext);
  if (map === null) throw new Error(`useDependency("${key}") usado fora de um DependencyProvider.`);
  if (!(key in map)) throw new Error(`Dependência "${key}" não registrada no DependencyProvider.`);
  return map[key] as T;
}
