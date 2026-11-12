import appJson from '../../app.json';
import { darkColors, lightColors } from '@/shared/ui/tokens/colors';

type SplashOptions = { image: string; backgroundColor: string; dark: { image: string; backgroundColor: string } };

const plugin = (appJson.expo.plugins as unknown[]).find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, SplashOptions] | undefined;

describe('splash (expo-splash-screen)', () => {
  it('está configurada como plugin do app.json', () => {
    expect(plugin).toBeDefined();
  });

  it('usa os fundos claro/escuro do design system (sem flash branco ao abrir no escuro)', () => {
    expect(plugin![1].backgroundColor).toBe(lightColors.background);
    expect(plugin![1].dark.backgroundColor).toBe(darkColors.background);
  });

  it('as imagens configuradas existem em assets/', () => {
    // `require` de arquivo inexistente falha: garante que o plugin não aponta para o vazio.
    expect(plugin![1].image).toBe('./assets/splash-icon.png');
    expect(plugin![1].dark.image).toBe('./assets/splash-icon.png');
    expect(() => require('../../assets/splash-icon.png')).not.toThrow();
  });
});
