/** One tea in the library grid. Tap opens the form in edit mode. */

import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";

import type { Tea } from "../types/tea";
import { CategoryBadge } from "./CategoryBadge";
import { RatingStars } from "./RatingStars";
import { rtlTextStyle } from "../utils/rtl";

interface Props {
  tea: Tea;
  // Takes the tea's id rather than being pre-bound to it, so LibraryScreen
  // can pass one stable function reference for every row instead of a
  // fresh closure per card -- that, plus memo() below, is what lets
  // FlatList skip re-rendering cards that haven't actually changed (see
  // the "large list is slow to update" warning this replaced).
  onPress: (id: string) => void;
}

function TeaCardBase({ tea, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={() => onPress(tea.id)} accessibilityRole="button">
      <View style={styles.imageWrap}>
        {tea.imageUri ? (
          // expo-image instead of RN's core Image: it decodes/caches off
          // the JS thread and downsamples to the rendered size, which
          // matters a lot once this grid is full of real (multi-MB)
          // camera photos rather than the catalog's placeholder icons --
          // recyclingKey keeps a fast-scrolling list from flashing the
          // previous row's photo while the real one loads in.
          <Image
            source={{ uri: tea.imageUri }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            recyclingKey={tea.id}
          />
        ) : (
          <View style={styles.placeholder}>
            <MaterialIcons name="local-cafe" size={32} color="#B5A48A" />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {tea.name}
        </Text>
        {tea.nameHe ? (
          <Text style={[styles.nameHe, rtlTextStyle]} numberOfLines={1}>
            {tea.nameHe}
          </Text>
        ) : null}
        {tea.brand ? (
          <Text style={styles.brand} numberOfLines={1}>
            {tea.brand}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <CategoryBadge category={tea.category} />
          <RatingStars rating={tea.rating} size={14} />
        </View>
      </View>
    </Pressable>
  );
}

export const TeaCard = memo(TeaCardBase);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: "#F2EFE9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 10,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  nameHe: {
    fontSize: 13,
    color: "#3A3A3C",
  },
  brand: {
    fontSize: 12,
    color: "#6B6B70",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
});
