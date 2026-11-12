import Add from '@expo/material-symbols/add.xml';
import Edit from '@expo/material-symbols/edit.xml';
import MoreVert from '@expo/material-symbols/more_vert.xml';
import { Platform } from 'react-native';

/**
 * Ícones para `Stack.Toolbar.Button`/`Stack.Toolbar.Menu`: SF Symbol no iOS e asset XML do Material Symbols
 * no Android (o Android não aceita nome de SF Symbol e avisa no Metro). `more` é o menu de mais ações:
 * reticências no iOS, os três pontos verticais da top app bar do Material no Android.
 */
export const TOOLBAR_ICONS = {
  add: Platform.OS === 'android' ? Add : 'plus',
  edit: Platform.OS === 'android' ? Edit : 'pencil',
  more: Platform.OS === 'android' ? MoreVert : 'ellipsis',
} as const;
