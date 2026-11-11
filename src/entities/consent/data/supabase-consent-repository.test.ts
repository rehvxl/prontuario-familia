import { createMockClient, fail, ok } from '@/shared/api/mock-client';
import { createSupabaseConsentRepository } from './supabase-consent-repository';

const row = { purpose: 'terms_and_privacy', version: '2026-11-v1', accepted_at: '2026-11-02T09:00:00Z', revoked_at: null };

describe('createSupabaseConsentRepository', () => {
  it('listMine mapeia snake_case → camelCase (mais recentes primeiro)', async () => {
    const m = createMockClient();
    m.fromQueue('consents', ok([row, { ...row, purpose: 'health_data_processing', revoked_at: '2026-11-03T00:00:00Z' }]));

    const list = await createSupabaseConsentRepository(m.client).listMine();

    expect(list).toEqual([
      { purpose: 'terms_and_privacy', version: '2026-11-v1', acceptedAt: '2026-11-02T09:00:00Z', revokedAt: null },
      { purpose: 'health_data_processing', version: '2026-11-v1', acceptedAt: '2026-11-02T09:00:00Z', revokedAt: '2026-11-03T00:00:00Z' },
    ]);
    expect(m.callsOf('from:consents')).toContainEqual(['order', ['accepted_at', { ascending: false }]]);
  });

  it('accept usa a RPC e devolve o consentimento', async () => {
    const m = createMockClient();
    m.rpcQueue('accept_consent', ok(row));

    const consent = await createSupabaseConsentRepository(m.client).accept('terms_and_privacy', '2026-11-v1');

    expect(m.raw.rpc).toHaveBeenCalledWith('accept_consent', { p_purpose: 'terms_and_privacy', p_version: '2026-11-v1' });
    expect(consent.acceptedAt).toBe(row.accepted_at);
  });

  it('revoke usa a RPC; falhas viram DomainError', async () => {
    const m = createMockClient();
    m.rpcQueue('revoke_consent', ok(null), fail({ message: 'x', code: '28000' }));
    const repo = createSupabaseConsentRepository(m.client);

    await expect(repo.revoke('health_data_processing')).resolves.toBeUndefined();
    expect(m.raw.rpc).toHaveBeenCalledWith('revoke_consent', { p_purpose: 'health_data_processing' });
    await expect(repo.revoke('health_data_processing')).rejects.toMatchObject({ code: 'consent/revoke-failed' });
  });

  it('accept sem linha devolvida é erro', async () => {
    const m = createMockClient();
    m.rpcQueue('accept_consent', ok(null));
    await expect(createSupabaseConsentRepository(m.client).accept('terms_and_privacy', 'v')).rejects.toMatchObject({
      code: 'consent/accept-failed',
    });
  });
});
