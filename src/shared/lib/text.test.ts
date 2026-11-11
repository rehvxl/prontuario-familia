import { collapseSpaces, normalizeSearchText } from './text';

it('normaliza acentos, caixa e espaços para a busca', () => {
  expect(normalizeSearchText('  Cardiologísta   JOÃO ')).toBe('cardiologista joao');
});
it('colapsa espaços sem tirar acentos', () => {
  expect(collapseSpaces('  Maria   da  Conceição ')).toBe('Maria da Conceição');
});
