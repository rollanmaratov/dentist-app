import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SPECIALTIES, type Specialty } from '@/data/constants';
import { colors, radius, shadow } from '@/theme';

type Props = {
  value: Specialty | null;
  onChange: (value: Specialty) => void;
};

/**
 * "Dropdown" (Figma 217:1678): 236×53 field, list of 53pt rows that overlays the
 * content below (max 4 rows visible, then scrolls).
 */
export function SpecialtyDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.field}
        accessibilityRole="button"
        accessibilityLabel={value ? `Specialization: ${value}` : 'Choose a specialist'}
        accessibilityState={{ expanded: open }}>
        <Text style={!value && { color: colors.textMuted }}>{value ?? 'Choose a specialist'}</Text>
        <SymbolView
          name={open ? 'chevron.up' : 'chevron.down'}
          size={17}
          weight="semibold"
          tintColor={colors.textBrand}
        />
      </Pressable>

      {open && (
        <View style={styles.list}>
          <ScrollView bounces={false} nestedScrollEnabled style={styles.listScroll}>
            {SPECIALTIES.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  onChange(s);
                  setOpen(false);
                }}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: s === value }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.bgCanvas }]}>
                <Text color={s === value ? 'textBrand' : 'textPrimary'}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const ROW = 53;

const styles = StyleSheet.create({
  // Above the date picker so the open list can overlap it.
  wrapper: { width: 236, zIndex: 10 },
  field: {
    height: ROW,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: colors.bgSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 19,
    paddingRight: 23,
  },
  list: {
    position: 'absolute',
    top: ROW + 8,
    left: 0,
    right: 0,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundColor: colors.bgSurface,
    boxShadow: shadow.subtle,
  },
  listScroll: { maxHeight: ROW * 4, borderRadius: radius.xl, overflow: 'hidden' },
  option: {
    height: ROW,
    justifyContent: 'center',
    paddingLeft: 19,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
});
