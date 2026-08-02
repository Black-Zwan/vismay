import React from 'react';
import type { TextStyle } from 'react-native';

import { passageSegments } from '@/src/core/passage';
import { Text, type TextPropsExtended } from '@/src/ui/Text';
import { colors } from '@/src/ui/tokens';

interface PassageTextProps extends Omit<TextPropsExtended, 'children'> {
  text: string;
  lensLabel: string;
  cardName: string;
  onCardPress?: () => void;
}

export function PassageText({
  text,
  lensLabel,
  cardName,
  onCardPress,
  ...textProps
}: PassageTextProps) {
  const segments = passageSegments(text, lensLabel, cardName);

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
            style={chipStyle}
          >
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
}

const chipStyle: TextStyle = {
  color: colors.accent,
  backgroundColor: colors.line,
  borderRadius: 4,
  fontWeight: '600',
};
