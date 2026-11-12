import { Platform } from 'react-native';

/**
 * Apresentação das rotas de formulário (registro, pessoa, resultado, dose, medicamento, sinal vital).
 * iOS: `formSheet` nativo com detents e alça; o corpo usa `<Screen presentation="sheet">` (DESIGN_SYSTEM §13.1/§13.2).
 * Android: `modal` com cabeçalho (título + `SheetCloseButton`). O `formSheet` do Android é uma bottom sheet
 * sem cabeçalho e deixa a tela de trás na árvore do TalkBack.
 */
export function sheetScreenOptions(os: typeof Platform.OS = Platform.OS) {
  if (os === 'android') return { presentation: 'modal' as const, headerShown: true };
  return { presentation: 'formSheet' as const, sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true, headerTransparent: false };
}
