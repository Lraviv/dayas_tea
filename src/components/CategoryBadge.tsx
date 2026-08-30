/** Small colored pill for a tea's category. Also used as a filter chip
 * in the library's filter bar (pass `selected`/`onPress` for that). */

import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { TeaCategory } from "../types/tea";

const CATEGORY_COLORS: Record<TeaCategory, { bg: string; fg: string }> = {
  Green: { bg: "#E3F2E1", fg: "#2E7D32" },
  Black: { bg: "#E8E4E1", fg: "#4A3B2A" },
  White: { bg: "#F5F5F0", fg: "#8A8A70" },
  Oolong: { bg: "#F3E5D0", fg: "#A15C1E" },
  Herbal: { bg: "#F0E6F6", fg: "#7B4397" },
  "Pu-erh": { bg: "#E9DCCB", fg: "#6B4226" },
  Rooibos: { bg: "#FBE3D6", fg: "#C1440E" },
  Chai: { bg: "#FBEAD2", fg: "#B5651D" },
  Other: { bg: "#E8E8EC", fg: "#5A5A66" },
};

interface Props {
  category: TeaCategory;
  selected?: boolean;
  onPress?: () => void;
}

function CategoryBadgeBase({ category, selected, onPress }: Props) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
  const interactive = !!onPress;

  const content = (
    <View
      style={[
        styles.badge,
        { backgroundColor: selected ? colors.fg : colors.bg },
        interactive && selected && styles.selectedBorder,
      ]}
    >
      <Text style={[styles.text, { color: selected ? "#FFFFFF" : colors.fg }]}>{category}</Text>
    </View>
  );

  if (!interactive) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Filter by ${category}`}>
      {content}
    </Pressable>
  );
}

export const CategoryBadge = memo(CategoryBadgeBase);

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  selectedBorder: {
    borderWidth: 1,
    borderColor: "#00000022",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
