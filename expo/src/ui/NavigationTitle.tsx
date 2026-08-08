import React from 'react';

import { Text } from '@/src/ui/Text';

export function NavigationTitle({ children }: { children: string }) {
  return <Text variant="label" style={{ fontSize: 14, letterSpacing: 4 }}>{children}</Text>;
}
