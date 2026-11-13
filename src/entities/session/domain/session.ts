export type AuthProvider = 'email' | 'apple' | 'google';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  provider: AuthProvider;
}

export type Unsubscribe = () => void;

/** Porta de autenticação. Implementações: Supabase Auth (data/) e modo demonstração local. */
export interface AuthGateway {
  /** Envia um código de 6 dígitos para o e-mail (login sem senha; cria a conta se não existir). */
  sendEmailOtp(email: string): Promise<void>;
  verifyEmailOtp(email: string, code: string): Promise<AuthUser>;
  /** iOS: fluxo nativo (expo-apple-authentication) + signInWithIdToken. Lança `auth/cancelled` se o usuário cancelar. */
  signInWithApple(): Promise<AuthUser>;
  /** OAuth Google via navegador do sistema (PKCE, redirect `prontuariofamilia://auth/callback`). */
  signInWithGoogle(): Promise<AuthUser>;
  /** Quais provedores sociais estão disponíveis neste dispositivo/ambiente. */
  availableProviders(): Promise<AuthProvider[]>;
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthStateChange(listener: (user: AuthUser | null) => void): Unsubscribe;
  signOut(): Promise<void>;
  /** Exclusão definitiva da conta e de todos os dados do titular (LGPD art. 18, VI). */
  deleteAccount(): Promise<void>;
}

/** Exportação dos dados do titular (LGPD art. 18, II e V). */
export interface DataExportGateway {
  /**
   * JSON do titular. No servidor: `format_version: 3`, com `emergency_cards` no nível de cima
   * (sem `created_by`). No modo demonstração a coleção sai como `emergencyCards`.
   */
  exportMyData(): Promise<string>;
}
