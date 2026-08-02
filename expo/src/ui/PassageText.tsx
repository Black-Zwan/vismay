import React from 'react';
import type { TextStyle } from 'react-native';

import { passageSegments } from '@/src/core/passage';
import { useAccentColor } from '@/src/ui/AccentColor';
import { Text, type TextPropsExtended } from '@/src/ui/Text';
import { colors, fonts } from '@/src/ui/tokens';

interface PassageTextProps extends Omit<TextPropsExtended, 'children'> {
  text: string;
  lensLabel: string;
  cardName: string;
  accentHex?: string;
  onCardPress?: () => void;
}

export function PassageText({
  text,
  lensLabel,
  cardName,
  accentHex,
  onCardPress,
  ...textProps
}: PassageTextProps) {
  const segments = passageSegments(text, lensLabel, cardName);
  const currentAccent = useAccentColor();

  return (
    <Text {...textProps}>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') return segment.text;

        const isCard = segment.kind === 'card';
        return (
          <Text
            key={`${segment.kind}-${index}`}
            accessibilityRole={isCard && onCardPress ? 'button' : undefined}
            onPress={isCard ? onCardPress : undefined}
            style={[chipStyle, { color: accentHex ?? currentAccent }]}
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
}

const chipStyle: TextStyle = {
  backgroundColor: colors.line,
  borderRadius: 4,
  fontFamily: fonts.semibold,
};
