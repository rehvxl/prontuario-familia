const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const script = path.join(__dirname, 'no-store-demo.mjs');

function run(root) {
  return spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
}

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-store-demo-'));
  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), contents);
  }
  return dir;
}

const outputOf = (result) => `${result.stdout}\n${result.stderr}`;

describe('check:store-demo', () => {
  it('falha se o perfil preview define EXPO_PUBLIC_DEMO_MODE=1', () => {
    const dir = fixture({
      'eas.json': JSON.stringify({
        build: { preview: { env: { EXPO_PUBLIC_DEMO_MODE: '1' } }, production: {} },
      }),
    });
    const result = run(dir);
    expect(result.status).not.toBe(0);
    expect(outputOf(result)).toMatch(/eas\.json build\.preview/);
  });

  it('falha se o perfil production define EXPO_PUBLIC_DEMO_MODE=1', () => {
    const dir = fixture({
      'eas.json': JSON.stringify({
        build: { production: { env: { EXPO_PUBLIC_DEMO_MODE: 1 } } },
      }),
    });
    const result = run(dir);
    expect(result.status).not.toBe(0);
    expect(outputOf(result)).toMatch(/eas\.json build\.production/);
  });

  it('falha se a string EXPO_PUBLIC_DEMO_MODE=1 aparece no app.json', () => {
    const dir = fixture({
      'app.json': JSON.stringify({ expo: { name: 'EXPO_PUBLIC_DEMO_MODE=1' } }),
    });
    const result = run(dir);
    expect(result.status).not.toBe(0);
    expect(outputOf(result)).toMatch(/app\.json/);
  });

  it('falha se app.config.ts atribui EXPO_PUBLIC_DEMO_MODE a 1', () => {
    const dir = fixture({
      'app.config.ts': "export default { extra: { EXPO_PUBLIC_DEMO_MODE: '1' } };\n",
    });
    const result = run(dir);
    expect(result.status).not.toBe(0);
    expect(outputOf(result)).toMatch(/app\.config\.ts/);
  });

  it('aceita o demo só no perfil development e EXPO_PUBLIC_DEMO_MODE=0 na loja', () => {
    const dir = fixture({
      'eas.json': JSON.stringify({
        build: {
          development: { env: { EXPO_PUBLIC_DEMO_MODE: '1' } },
          preview: { env: { EXPO_PUBLIC_DEMO_MODE: '0' } },
          production: {},
        },
      }),
      'app.json': JSON.stringify({ expo: { name: 'Prontuário da Família' } }),
      'app.config.ts': '// EXPO_PUBLIC_DEMO_MODE fica desligado no build de loja.\n',
    });
    const result = run(dir);
    expect(outputOf(result)).toMatch(/sem EXPO_PUBLIC_DEMO_MODE=1/);
    expect(result.status).toBe(0);
  });

  it('falha se o eas.json não é JSON válido', () => {
    const dir = fixture({ 'eas.json': '{ isto não é json' });
    const result = run(dir);
    expect(result.status).not.toBe(0);
    expect(outputOf(result)).toMatch(/não é JSON válido/);
  });

  it('aceita o eas.json e o app.json deste repositório', () => {
    const result = run(path.resolve(__dirname, '..'));
    expect(outputOf(result)).toMatch(/sem EXPO_PUBLIC_DEMO_MODE=1/);
    expect(result.status).toBe(0);
  });
});
