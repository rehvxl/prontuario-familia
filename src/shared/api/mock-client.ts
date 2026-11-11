// Dublê do SupabaseClient para testes unitários dos adaptadores (importar só em *.test.ts; fora do index público).
import type { SupabaseClient } from '@supabase/supabase-js';

export interface MockResult {
  data: unknown;
  error: unknown;
}

export interface RecordedCall {
  target: string; // "from:members" | "rpc:create_family"
  method: string; // select, eq, insert...
  args: unknown[];
}

export const ok = (data: unknown): MockResult => ({ data, error: null });
export const fail = (error: { message?: string; code?: string; status?: number }): MockResult => ({ data: null, error });

/** Cliente falso: cada `from(tabela)`/`rpc(fn)` consome o próximo resultado enfileirado; o encadeamento é gravado em `calls`. */
export function createMockClient() {
  const queues = new Map<string, MockResult[]>();
  const calls: RecordedCall[] = [];

  const queue = (target: string, ...results: MockResult[]) => {
    queues.set(target, [...(queues.get(target) ?? []), ...results]);
  };
  const next = (target: string): MockResult => {
    const result = queues.get(target)?.shift();
    if (!result) throw new Error(`Sem resultado enfileirado para ${target}`);
    return result;
  };

  const chain = (target: string, result: MockResult): unknown => {
    const proxy: unknown = new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') {
            return (resolve: (v: MockResult) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve(result).then(resolve, reject);
          }
          return (...args: unknown[]) => {
            calls.push({ target, method: prop, args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  };

  const storage = {
    remove: jest.fn(async (_paths: string[]): Promise<MockResult> => ok([])),
    upload: jest.fn(async (_path: string, _body: unknown, _opts?: unknown): Promise<MockResult> => ok({ path: 'x' })),
    createSignedUrl: jest.fn(async (_path: string, _ttl: number): Promise<MockResult> => ok({ signedUrl: 'https://signed' })),
  };
  const bucket = jest.fn((_name: string) => storage);

  const client = {
    from: jest.fn((table: string) => chain(`from:${table}`, next(`from:${table}`))),
    rpc: jest.fn((fn: string, args?: unknown) => {
      calls.push({ target: `rpc:${fn}`, method: 'rpc', args: [args] });
      return chain(`rpc:${fn}`, next(`rpc:${fn}`));
    }),
    storage: { from: bucket },
    auth: {
      signInWithOtp: jest.fn(),
      verifyOtp: jest.fn(),
      signInWithIdToken: jest.fn(),
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(async () => ({ error: null })),
      onAuthStateChange: jest.fn(),
    },
    functions: { invoke: jest.fn() },
  };

  return {
    client: client as unknown as SupabaseClient,
    raw: client,
    storage,
    bucket,
    calls,
    fromQueue: (table: string, ...r: MockResult[]) => queue(`from:${table}`, ...r),
    rpcQueue: (fn: string, ...r: MockResult[]) => queue(`rpc:${fn}`, ...r),
    callsOf: (target: string) => calls.filter((c) => c.target === target).map((c) => [c.method, c.args] as const),
  };
}
