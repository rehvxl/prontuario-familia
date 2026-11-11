import { DomainError } from '@/shared/lib';
import type { HealthRecordRepository } from '@/entities/health-record';
import { deleteRecord } from './delete-record';

const repoWith = (remove: (id: string) => Promise<void>) => ({ remove }) as unknown as HealthRecordRepository;

describe('deleteRecord', () => {
  it('remove o registro pela porta', async () => {
    const remove = jest.fn(async () => undefined);
    await deleteRecord({ records: repoWith(remove) }, 'r1');
    expect(remove).toHaveBeenCalledWith('r1');
  });

  it('exige o id do registro', async () => {
    const remove = jest.fn(async () => undefined);
    await expect(deleteRecord({ records: repoWith(remove) }, '')).rejects.toMatchObject({ code: 'record/missing-id' });
    expect(remove).not.toHaveBeenCalled();
  });

  it('troca erro técnico por mensagem em pt-BR e preserva a causa', async () => {
    const cause = new Error('fetch failed');
    const error = await deleteRecord({ records: repoWith(async () => { throw cause; }) }, 'r1').catch((e) => e);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'record/remove-failed' });
    expect(error.message).toMatch(/nada foi apagado/);
    expect(error.cause).toBe(cause);
  });

  it('mantém erros de domínio como estão', async () => {
    const domain = new DomainError('record/not-found', 'Registro não encontrado.');
    await expect(deleteRecord({ records: repoWith(async () => { throw domain; }) }, 'r1')).rejects.toBe(domain);
  });
});
