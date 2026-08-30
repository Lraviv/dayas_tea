/** Reusable bottom-sheet info panel -- tap the (i) next to a section
 * title, get a plain-language explanation without leaving the screen.
 * Dismiss by tapping the backdrop, the close icon, or "Got it". */

import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function InfoModal({ visible, onClose, title, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <MaterialIcons name="close" size={22} color="#8A8A8E" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>

          <Pressable style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** One icon + heading + description row, the standard building block for
 * InfoModal content. */
export function InfoRow({ icon, iconColor = "#2E7D32", heading, children }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={[rowStyles.iconWrap, { backgroundColor: `${iconColor}1A` }]}>
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={rowStyles.textWrap}>
        <Text style={rowStyles.heading}>{heading}</Text>
        <Text style={rowStyles.description}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "80%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDDDE1",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#1C1C1E" },
  body: { marginBottom: 8 },
  doneButton: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  doneButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: { flex: 1 },
  heading: { fontSize: 14, fontWeight: "700", color: "#1C1C1E", marginBottom: 3 },
  description: { fontSize: 13, color: "#5A5A60", lineHeight: 19 },
});
