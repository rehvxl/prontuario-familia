import { createContext, useContext } from 'react';

/** Recuo lateral que o `Screen` (ou a `Leaf`) aplica ao conteúdo (margem + safe area). 0 fora deles. */
export const ScreenInsetContext = createContext(0);
/** Para componentes que sangram até a borda (ChipGroup, carrosséis): compensam este recuo com margem negativa. */
export const useScreenHorizontalInset = () => useContext(ScreenInsetContext);
