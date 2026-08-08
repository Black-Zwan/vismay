import React from 'react';
import type { TextStyle } from 'react-native';

import { passageSegments } from '@/src/core/passage';
import { useAccentColor } from '@/src/ui/AccentColor';
import { Text, type TextPropsExtended } from '@/src/ui/Text';
import { fonts } from '@/src/ui/tokens';

interface PassageTextProps extends Omit<TextPropsExtended, 'children'> {
  text: string;
  lensLabel: string;
  cardName: string;
  accentHex?: string;
  onCardPress?: () => void;
  dropCap?: boolean;
}

export function PassageText({
  text,
  lensLabel,
  cardName,
  accentHex,
  onCardPress,
  dropCap = false,
  ...textProps
}: PassageTextProps) {
  const segments = passageSegments(text, lensLabel, cardName);
  const currentAccent = useAccentColor();

  return (
    <Text {...textProps}>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          if (dropCap && index === 0 && segment.text.length > 0) {
            return (
              <React.Fragment key="drop-cap">
                <Text style={dropCapStyle}>{segment.text[0]}</Text>
                {segment.text.slice(1)}
              </React.Fragment>
            );
          }
          return segment.text;
        }

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
  fontFamily: fonts.semibold,
  textDecorationLine: 'underline',
  textDecorationStyle: 'dotted',
};

const dropCapStyle: TextStyle = {
  fontFamily: fonts.semibold,
  fontSize: 32,
  lineHeight: 30,
};
