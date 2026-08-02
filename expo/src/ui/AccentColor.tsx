import React, { createContext, useContext, type PropsWithChildren } from 'react';

import { colors } from '@/src/ui/tokens';

const AccentColorContext = createContext<string>(colors.text);

interface AccentColorProviderProps extends PropsWithChildren {
  value?: string;
}

export function AccentColorProvider({ value, children }: AccentColorProviderProps) {
  return (
    <AccentColorContext.Provider value={value ?? colors.text}>
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor(): string {
  return useContext(AccentColorContext);
}
