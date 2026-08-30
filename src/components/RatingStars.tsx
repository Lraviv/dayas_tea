/** 1-5 star rating. Read-only (for cards) or interactive (for the form) --
 * pass `onChange` to make it tappable, omit it for a static display. */

import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface Props {
  rating: number | null;
  onChange?: (rating: number) => void;
  size?: number;
  color?: string;
}

function RatingStarsBase({ rating, onChange, size = 20, color = "#D4A017" }: Props) {
  const value = rating ?? 0;
  const interactive = !!onChange;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const icon = (
          <MaterialIcons
            name={filled ? "star" : "star-outline"}
            size={size}
            color={filled ? color : "#C7C7CC"}
          />
        );
        if (!interactive) {
          return <View key={star}>{icon}</View>;
        }
        return (
          <Pressable
            key={star}
            onPress={() => onChange?.(star)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

export const RatingStars = memo(RatingStarsBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 2,
  },
});
