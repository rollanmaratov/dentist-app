import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { space } from '@/theme';

type SectionHeaderProps = {
  title: string;
  action?: { label: string; href: Href };
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text variant="heading2" accessibilityRole="header">
        {title}
      </Text>
      {action && (
        <Link href={action.href} asChild>
          <Pressable hitSlop={8} accessibilityRole="link">
            <Text color="textBrand">{action.label}</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: space[16],
  },
});
