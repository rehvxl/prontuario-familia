import { exportData } from './export-data';

describe('exportData', () => {
  it('devolve o JSON com nome de arquivo pela data local', async () => {
    const content = JSON.stringify({ records: [] });
    const result = await exportData({ dataExport: { exportMyData: async () => content } }, new Date(2026, 10, 3));
    expect(result).toEqual({ fileName: 'prontuario-familia-2026-11-03.json', mimeType: 'application/json', content });
  });
  it('recusa conteúdo que não é JSON válido', async () => {
    await expect(exportData({ dataExport: { exportMyData: async () => '{quebrado' } })).rejects.toMatchObject({ code: 'export/invalid' });
  });
  it('propaga falha do gateway', async () => {
    await expect(
      exportData({ dataExport: { exportMyData: async () => { throw new Error('offline'); } } }),
    ).rejects.toThrow('offline');
  });
});
