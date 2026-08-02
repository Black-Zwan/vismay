// template
import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/src/ui/Text';
import { colors, spacing } from '@/src/ui/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text variant="title">This screen doesn&apos;t exist.</Text>

        <Link href="/" style={styles.link}>
          <Text variant="label" muted>Return home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
});
