import { mapAuthUser } from './supabase-mappers';

describe('mapAuthUser', () => {
  it('mapeia usuário de e-mail', () => {
    expect(mapAuthUser({ id: 'u1', email: 'ana@exemplo.com', app_metadata: { provider: 'email' }, user_metadata: {} })).toEqual({
      id: 'u1',
      email: 'ana@exemplo.com',
      displayName: null,
      provider: 'email',
    });
  });

  it('usa full_name (Apple) ou name (Google) como displayName', () => {
    expect(mapAuthUser({ id: 'u', email: null, app_metadata: { provider: 'apple' }, user_metadata: { full_name: ' Ana Silva ' } })).toMatchObject({
      displayName: 'Ana Silva',
      provider: 'apple',
      email: null,
    });
    expect(mapAuthUser({ id: 'u', email: 'a@b.c', app_metadata: { provider: 'google' }, user_metadata: { name: 'Ana' } })).toMatchObject({
      displayName: 'Ana',
      provider: 'google',
    });
  });

  it('provedor desconhecido ou ausente cai em email', () => {
    expect(mapAuthUser({ id: 'u', email: 'a@b.c', app_metadata: { provider: 'github' }, user_metadata: {} }).provider).toBe('email');
    expect(mapAuthUser({ id: 'u', email: 'a@b.c', app_metadata: {}, user_metadata: {} }).provider).toBe('email');
  });
});
