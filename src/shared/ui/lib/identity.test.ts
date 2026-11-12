import { categoricalIndexFor, registerPersonHues } from './identity';

describe('registerPersonHues', () => {
  afterEach(() => registerPersonHues([]));

  it('não repete cor entre até 7 pessoas, na ordem de cadastro', () => {
    const ids = Array.from({ length: 7 }, (_, i) => `pessoa-${i}`);
    registerPersonHues(ids);
    expect(new Set(ids.map(categoricalIndexFor)).size).toBe(7);
  });

  it('a ordem de cadastro escolhe o matiz, igual em qualquer aparelho (ids diferentes, mesma família)', () => {
    registerPersonHues(['ana-ios', 'carlos-ios']);
    const ios = [categoricalIndexFor('ana-ios'), categoricalIndexFor('carlos-ios')];
    registerPersonHues(['ana-android', 'carlos-android']);
    expect([categoricalIndexFor('ana-android'), categoricalIndexFor('carlos-android')]).toEqual(ios);
    expect(ios).toEqual([0, 1]);
  });

  it('id fora do registro continua no hash estável', () => {
    registerPersonHues(['x']);
    expect(categoricalIndexFor('fora')).toBe(categoricalIndexFor('fora'));
  });
});
