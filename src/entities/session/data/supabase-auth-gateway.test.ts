import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { createMockClient } from '@/shared/api/mock-client';
import { env } from '@/shared/config';
import { createSupabaseAuthGateway } from './supabase-auth-gateway';
import { createSupabaseDataExportGateway } from './supabase-data-export-gateway';

jest.mock('@/shared/config', () => ({ env: { googleAuthEnabled: false } }));
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(32).fill(1)),
  digestStringAsync: jest.fn(async (_alg: string, data: string) => `sha256(${data})`),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));
jest.mock('expo-linking', () => ({ createURL: jest.fn((p: string) => `prontuariofamilia://${p}`) }));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));

const apple = AppleAuthentication as jest.Mocked<typeof AppleAuthentication>;
const browser = WebBrowser as jest.Mocked<typeof WebBrowser>;

const supaUser = (provider = 'email', meta: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'ana@exemplo.com',
  app_metadata: { provider },
  user_metadata: meta,
});

describe('createSupabaseAuthGateway', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (env as { googleAuthEnabled: boolean }).googleAuthEnabled = false;
  });

  describe('e-mail OTP', () => {
    it('sendEmailOtp normaliza o e-mail e permite criar conta', async () => {
      const m = createMockClient();
      m.raw.auth.signInWithOtp.mockResolvedValue({ error: null });

      await createSupabaseAuthGateway(m.client).sendEmailOtp('  Ana@Exemplo.com ');

      expect(m.raw.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'ana@exemplo.com', options: { shouldCreateUser: true } });
    });

    it('sendEmailOtp distingue limite de envio e falha genérica', async () => {
      const m = createMockClient();
      const gw = createSupabaseAuthGateway(m.client);
      m.raw.auth.signInWithOtp
        .mockResolvedValueOnce({ error: { status: 429, code: 'over_email_send_rate_limit', message: 'x' } })
        .mockResolvedValueOnce({ error: { status: 500, message: 'smtp' } });

      await expect(gw.sendEmailOtp('a@b.co')).rejects.toMatchObject({ code: 'auth/rate-limited' });
      await expect(gw.sendEmailOtp('a@b.co')).rejects.toMatchObject({ code: 'auth/otp-send-failed' });
    });

    it('verifyEmailOtp usa type "email" e devolve o AuthUser', async () => {
      const m = createMockClient();
      m.raw.auth.verifyOtp.mockResolvedValue({ data: { user: supaUser() }, error: null });

      const user = await createSupabaseAuthGateway(m.client).verifyEmailOtp('Ana@Exemplo.com', ' 123456 ');

      expect(m.raw.auth.verifyOtp).toHaveBeenCalledWith({ email: 'ana@exemplo.com', token: '123456', type: 'email' });
      expect(user).toEqual({ id: 'u1', email: 'ana@exemplo.com', displayName: null, provider: 'email' });
    });

    it('verifyEmailOtp com código errado/expirado → auth/invalid-code', async () => {
      const m = createMockClient();
      m.raw.auth.verifyOtp.mockResolvedValue({ data: { user: null }, error: { code: 'otp_expired', message: 'Token has expired or is invalid' } });

      await expect(createSupabaseAuthGateway(m.client).verifyEmailOtp('a@b.co', '000000')).rejects.toMatchObject({
        code: 'auth/invalid-code',
      });
    });
  });

  describe('Apple', () => {
    const credential = { identityToken: 'apple-jwt', fullName: { givenName: 'Ana', familyName: 'Silva' } };

    it('envia o nonce com hash à Apple e o nonce cru ao Supabase', async () => {
      apple.signInAsync.mockResolvedValue(credential as never);
      const m = createMockClient();
      m.raw.auth.signInWithIdToken.mockResolvedValue({ data: { user: supaUser('apple', { full_name: 'Ana Silva' }) }, error: null });

      const user = await createSupabaseAuthGateway(m.client).signInWithApple();

      const raw = '01'.repeat(32);
      expect(apple.signInAsync).toHaveBeenCalledWith(expect.objectContaining({ nonce: `sha256(${raw})` }));
      expect(m.raw.auth.signInWithIdToken).toHaveBeenCalledWith({ provider: 'apple', token: 'apple-jwt', nonce: raw });
      expect(user).toMatchObject({ provider: 'apple', displayName: 'Ana Silva' });
    });

    it('guarda o nome da primeira autorização nos metadados', async () => {
      apple.signInAsync.mockResolvedValue(credential as never);
      const m = createMockClient();
      m.raw.auth.signInWithIdToken.mockResolvedValue({ data: { user: supaUser('apple') }, error: null });
      m.raw.auth.updateUser.mockResolvedValue({ data: { user: supaUser('apple', { full_name: 'Ana Silva' }) }, error: null });

      const user = await createSupabaseAuthGateway(m.client).signInWithApple();

      expect(m.raw.auth.updateUser).toHaveBeenCalledWith({ data: { full_name: 'Ana Silva' } });
      expect(user.displayName).toBe('Ana Silva');
    });

    it('cancelamento do usuário → DomainError auth/cancelled', async () => {
      apple.signInAsync.mockRejectedValue(Object.assign(new Error('cancel'), { code: 'ERR_REQUEST_CANCELED' }));
      const m = createMockClient();

      await expect(createSupabaseAuthGateway(m.client).signInWithApple()).rejects.toMatchObject({ name: 'DomainError', code: 'auth/cancelled' });
      expect(m.raw.auth.signInWithIdToken).not.toHaveBeenCalled();
    });

    it('sem identityToken ou erro do Supabase → auth/apple-failed', async () => {
      const m = createMockClient();
      const gw = createSupabaseAuthGateway(m.client);

      apple.signInAsync.mockResolvedValueOnce({ identityToken: null } as never);
      await expect(gw.signInWithApple()).rejects.toMatchObject({ code: 'auth/apple-failed' });

      apple.signInAsync.mockResolvedValueOnce(credential as never);
      m.raw.auth.signInWithIdToken.mockResolvedValueOnce({ data: { user: null }, error: { message: 'nonce mismatch' } });
      await expect(gw.signInWithApple()).rejects.toMatchObject({ code: 'auth/apple-failed' });
    });
  });

  describe('Google', () => {
    const redirectTo = 'prontuariofamilia://auth/callback';

    it('PKCE: abre o navegador sem redirecionar e troca o code pela sessão', async () => {
      const m = createMockClient();
      m.raw.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/auth' }, error: null });
      browser.openAuthSessionAsync.mockResolvedValue({ type: 'success', url: `${redirectTo}?code=abc123` });
      m.raw.auth.exchangeCodeForSession.mockResolvedValue({ data: { user: supaUser('google', { name: 'Ana' }) }, error: null });

      const user = await createSupabaseAuthGateway(m.client).signInWithGoogle();

      expect(m.raw.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      expect(browser.openAuthSessionAsync).toHaveBeenCalledWith('https://accounts.google.com/auth', redirectTo);
      expect(m.raw.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
      expect(user).toMatchObject({ provider: 'google', displayName: 'Ana' });
    });

    it.each(['cancel', 'dismiss'] as const)('navegador fechado (%s) → auth/cancelled', async (type) => {
      const m = createMockClient();
      m.raw.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://x' }, error: null });
      browser.openAuthSessionAsync.mockResolvedValue({ type } as never);

      await expect(createSupabaseAuthGateway(m.client).signInWithGoogle()).rejects.toMatchObject({ code: 'auth/cancelled' });
      expect(m.raw.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    });

    it('acesso negado na tela do Google → auth/cancelled; outro erro → auth/google-failed', async () => {
      const m = createMockClient();
      const gw = createSupabaseAuthGateway(m.client);
      m.raw.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://x' }, error: null });

      browser.openAuthSessionAsync.mockResolvedValueOnce({ type: 'success', url: `${redirectTo}?error=access_denied` });
      await expect(gw.signInWithGoogle()).rejects.toMatchObject({ code: 'auth/cancelled' });

      browser.openAuthSessionAsync.mockResolvedValueOnce({ type: 'success', url: `${redirectTo}#error=server_error&error_description=boom` });
      await expect(gw.signInWithGoogle()).rejects.toMatchObject({ code: 'auth/google-failed' });

      browser.openAuthSessionAsync.mockResolvedValueOnce({ type: 'success', url: redirectTo });
      await expect(gw.signInWithGoogle()).rejects.toMatchObject({ code: 'auth/google-failed' });
    });
  });

  describe('availableProviders', () => {
    const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

    it('iOS com Apple disponível + Google habilitado', async () => {
      setOS('ios');
      (env as { googleAuthEnabled: boolean }).googleAuthEnabled = true;
      apple.isAvailableAsync.mockResolvedValue(true);
      expect(await createSupabaseAuthGateway(createMockClient().client).availableProviders()).toEqual(['apple', 'google']);
    });

    it('iOS sem Apple disponível e Google desligado → vazio', async () => {
      setOS('ios');
      apple.isAvailableAsync.mockResolvedValue(false);
      expect(await createSupabaseAuthGateway(createMockClient().client).availableProviders()).toEqual([]);
    });

    it('Android nunca oferece Apple', async () => {
      setOS('android');
      (env as { googleAuthEnabled: boolean }).googleAuthEnabled = true;
      apple.isAvailableAsync.mockResolvedValue(true);
      expect(await createSupabaseAuthGateway(createMockClient().client).availableProviders()).toEqual(['google']);
      expect(apple.isAvailableAsync).not.toHaveBeenCalled();
    });
  });

  describe('sessão', () => {
    it('getCurrentUser lê a sessão local; null sem sessão', async () => {
      const m = createMockClient();
      const gw = createSupabaseAuthGateway(m.client);
      m.raw.auth.getSession.mockResolvedValueOnce({ data: { session: { user: supaUser() } } }).mockResolvedValueOnce({ data: { session: null } });

      expect(await gw.getCurrentUser()).toMatchObject({ id: 'u1' });
      expect(await gw.getCurrentUser()).toBeNull();
    });

    it('onAuthStateChange converte a sessão e devolve o unsubscribe', () => {
      const m = createMockClient();
      const unsubscribe = jest.fn();
      let handler: (e: string, s: unknown) => void = () => undefined;
      m.raw.auth.onAuthStateChange.mockImplementation((h: typeof handler) => {
        handler = h;
        return { data: { subscription: { unsubscribe } } };
      });
      const listener = jest.fn();

      const off = createSupabaseAuthGateway(m.client).onAuthStateChange(listener);
      handler('SIGNED_IN', { user: supaUser() });
      handler('SIGNED_OUT', null);
      off();

      expect(listener).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'u1' }));
      expect(listener).toHaveBeenNthCalledWith(2, null);
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('signOut encerra só a sessão local', async () => {
      const m = createMockClient();
      await createSupabaseAuthGateway(m.client).signOut();
      expect(m.raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });
  });

  describe('deleteAccount', () => {
    it('chama a Edge Function delete-account e limpa a sessão local', async () => {
      const m = createMockClient();
      m.raw.functions.invoke.mockResolvedValue({ data: { deleted: true }, error: null });

      await createSupabaseAuthGateway(m.client).deleteAccount();

      expect(m.raw.functions.invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
      expect(m.raw.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('se a função falhar, mantém a sessão e avisa que nada foi perdido', async () => {
      const m = createMockClient();
      m.raw.functions.invoke.mockResolvedValue({ data: null, error: { message: 'Edge Function returned a non-2xx status code' } });

      await expect(createSupabaseAuthGateway(m.client).deleteAccount()).rejects.toMatchObject({
        code: 'account/delete-failed',
        message: expect.stringContaining('Nada foi perdido'),
      });
      expect(m.raw.auth.signOut).not.toHaveBeenCalled();
    });
  });
});

describe('createSupabaseDataExportGateway', () => {
  it('devolve o JSON da Edge Function como texto', async () => {
    const m = createMockClient();
    m.raw.functions.invoke.mockResolvedValue({ data: { format_version: 1, members: [] }, error: null });

    const json = await createSupabaseDataExportGateway(m.client).exportMyData();

    expect(m.raw.functions.invoke).toHaveBeenCalledWith('export-my-data', { method: 'POST' });
    expect(JSON.parse(json)).toEqual({ format_version: 1, members: [] });
  });

  it('aceita resposta já em texto e traduz erros', async () => {
    const m = createMockClient();
    const gw = createSupabaseDataExportGateway(m.client);
    m.raw.functions.invoke
      .mockResolvedValueOnce({ data: '{"a":1}', error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    expect(await gw.exportMyData()).toBe('{"a":1}');
    await expect(gw.exportMyData()).rejects.toMatchObject({ code: 'export/failed' });
  });
});
