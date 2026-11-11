import type { SupabaseClient } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { backendError, errorCode, errorMessage } from '@/shared/api';
import { env } from '@/shared/config';
import { DomainError } from '@/shared/lib';
import type { AuthGateway, AuthProvider, AuthUser } from '../domain/session';
import { mapAuthUser } from './supabase-mappers';

/** Deve estar em `additional_redirect_urls` do Supabase (supabase/config.toml e painel do projeto). */
const CALLBACK_PATH = 'auth/callback';

const cancelled = () => new DomainError('auth/cancelled', 'Login cancelado.');

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/** Parâmetros do retorno do OAuth (`?code=` no PKCE; erros podem vir na query ou no fragmento). */
function readCallbackParams(url: string): URLSearchParams {
  const params = new URLSearchParams(url.split('#')[1] ?? '');
  const query = url.split('#')[0]?.split('?')[1];
  if (query) new URLSearchParams(query).forEach((v, k) => params.set(k, v));
  return params;
}

export function createSupabaseAuthGateway(client: SupabaseClient): AuthGateway {
  async function signInWithAppleNative(): Promise<AuthUser> {
    // O nonce "cru" vai para o Supabase; o hash SHA-256 vai para a Apple (que o embute no identity token).
    const rawNonce = toHex(Crypto.getRandomBytes(32));
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw cancelled();
      throw backendError('auth/apple-failed', 'Não foi possível entrar com a Apple. Tente novamente.', e);
    }
    if (!credential.identityToken) {
      throw backendError('auth/apple-failed', 'Não foi possível entrar com a Apple. Tente novamente.');
    }

    const { data, error } = await client.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error || !data.user) {
      throw backendError('auth/apple-failed', 'Não foi possível entrar com a Apple. Tente novamente.', error);
    }

    // A Apple só entrega o nome na PRIMEIRA autorização: guardamos nos metadados do usuário.
    const { givenName, familyName } = credential.fullName ?? {};
    const fullName = [givenName, familyName].filter(Boolean).join(' ').trim();
    if (fullName && !data.user.user_metadata?.full_name) {
      const updated = await client.auth.updateUser({ data: { full_name: fullName } });
      if (updated.data.user) return mapAuthUser(updated.data.user);
    }
    return mapAuthUser(data.user);
  }

  async function signInWithGoogleBrowser(): Promise<AuthUser> {
    const redirectTo = Linking.createURL(CALLBACK_PATH);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) {
      throw backendError('auth/google-failed', 'Não foi possível entrar com o Google. Tente novamente.', error);
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') throw cancelled(); // cancel | dismiss | locked

    const params = readCallbackParams(result.url);
    if (params.get('error')) {
      // "access_denied" = usuário recusou na tela do Google.
      if (params.get('error') === 'access_denied') throw cancelled();
      throw backendError('auth/google-failed', 'Não foi possível entrar com o Google. Tente novamente.', params.get('error_description'));
    }
    const code = params.get('code');
    if (!code) throw backendError('auth/google-failed', 'Não foi possível entrar com o Google. Tente novamente.');

    const exchanged = await client.auth.exchangeCodeForSession(code);
    if (exchanged.error || !exchanged.data.user) {
      throw backendError('auth/google-failed', 'Não foi possível entrar com o Google. Tente novamente.', exchanged.error);
    }
    return mapAuthUser(exchanged.data.user);
  }

  return {
    async sendEmailOtp(email) {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (!error) return;
      if (error.status === 429 || errorCode(error) === 'over_email_send_rate_limit') {
        throw backendError('auth/rate-limited', 'Muitas tentativas. Aguarde um instante e peça um novo código.', error);
      }
      throw backendError('auth/otp-send-failed', 'Não foi possível enviar o código. Confira o e-mail e tente novamente.', error);
    },

    async verifyEmailOtp(email, code) {
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code.trim(),
        type: 'email',
      });
      if (error || !data.user) {
        const invalid = errorCode(error) === 'otp_expired' || /expired|invalid/i.test(errorMessage(error));
        throw backendError(
          invalid ? 'auth/invalid-code' : 'auth/verify-failed',
          invalid ? 'Código inválido ou expirado. Peça um novo código.' : 'Não foi possível validar o código. Tente novamente.',
          error,
        );
      }
      return mapAuthUser(data.user);
    },

    signInWithApple: signInWithAppleNative,
    signInWithGoogle: signInWithGoogleBrowser,

    async availableProviders() {
      const providers: AuthProvider[] = [];
      if (Platform.OS === 'ios') {
        try {
          if (await AppleAuthentication.isAvailableAsync()) providers.push('apple');
        } catch {
          // módulo nativo indisponível (ex.: web): sem Apple
        }
      }
      if (env.googleAuthEnabled) providers.push('google');
      return providers;
    },

    async getCurrentUser() {
      // getSession lê o armazenamento local (funciona offline); a RLS valida o token a cada requisição.
      const { data } = await client.auth.getSession();
      return data.session ? mapAuthUser(data.session.user) : null;
    },

    onAuthStateChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(session ? mapAuthUser(session.user) : null);
      });
      return () => data.subscription.unsubscribe();
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw backendError('auth/sign-out-failed', 'Não foi possível sair. Tente novamente.', error);
    },

    async deleteAccount() {
      const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
      if (error) {
        throw backendError('account/delete-failed', 'Não foi possível excluir a conta agora. Nada foi perdido; tente novamente.', error);
      }
      // O usuário já não existe no servidor: limpa a sessão local (erros aqui não importam).
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    },
  };
}
