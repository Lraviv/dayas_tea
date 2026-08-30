/** App-level settings: manage the category list, and back up or restore
 * the whole collection. Reached from the gear icon on the Library
 * screen. Kept separate from Statistics, which is read-only. */

import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";
import { exportBackup, restoreFromBackupZip } from "../data/backup";
import { exportTeasToXlsx } from "../data/exportXlsx";
import { InfoModal, InfoRow } from "../components/InfoModal";
import { PAGE_SIZE_ALL, PAGE_SIZE_OPTIONS, getPageSize, setPageSize } from "../db";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [pageSize, setPageSizeState] = useState<number>(PAGE_SIZE_ALL);
  const [pageSizeLoaded, setPageSizeLoaded] = useState(false);

  useEffect(() => {
    getPageSize().then((size) => {
      setPageSizeState(size);
      setPageSizeLoaded(true);
    });
  }, []);

  async function handlePageSizeChange(size: number) {
    setPageSizeState(size);
    await setPageSize(size);
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      // Always the whole collection here -- unlike the old library-header
      // button, Settings has no notion of "whatever you're currently
      // filtering", so this matches Backup Collection's same all-of-it scope.
      await exportTeasToXlsx();
    } catch (err) {
      Alert.alert("Export failed", String(err));
    } finally {
      setExporting(false);
    }
  }

  async function handleBackup() {
    if (backingUp) return;
    setBackingUp(true);
    try {
      await exportBackup();
    } catch (err) {
      Alert.alert("Backup failed", String(err));
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore() {
    if (restoring) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/zip", "application/x-zip-compressed"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const fileUri = result.assets[0].uri;

    Alert.alert(
      "Restore from backup?",
      "This replaces your entire current collection with the one in this backup. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setRestoring(true);
            try {
              const { imported } = await restoreFromBackupZip(fileUri);
              Alert.alert("Restore complete", `Restored ${imported} tea${imported === 1 ? "" : "s"}.`);
            } catch (err) {
              Alert.alert("Restore failed", String(err));
            } finally {
              setRestoring(false);
            }
          },
        },
      ]
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        <Text style={styles.sectionTitle}>Categories</Text>
        <Pressable style={styles.row} onPress={() => navigation.navigate("Categories")}>
          <MaterialIcons name="sell" size={20} color="#2E7D32" />
          <Text style={styles.rowText}>Manage Categories</Text>
          <MaterialIcons name="chevron-right" size={20} color="#8A8A8E" />
        </Pressable>

        <Text style={styles.sectionTitle}>Export</Text>
        <Pressable style={styles.row} onPress={handleExport} disabled={exporting}>
          <MaterialIcons name="ios-share" size={20} color="#2E7D32" />
          <Text style={styles.rowText}>Export to Excel</Text>
          {exporting ? <ActivityIndicator /> : <MaterialIcons name="chevron-right" size={20} color="#8A8A8E" />}
        </Pressable>

        <Text style={styles.sectionTitle}>Library</Text>
        <View style={styles.card}>
          <Text style={styles.pageSizeLabel}>Teas loaded at a time</Text>
          <View style={styles.chipRow}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <Pressable key={size} onPress={() => handlePageSizeChange(size)} disabled={!pageSizeLoaded}>
                <View style={[styles.sizeChip, pageSize === size && styles.sizeChipSelected]}>
                  <Text style={[styles.sizeChipText, pageSize === size && styles.sizeChipTextSelected]}>
                    {size}
                  </Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => handlePageSizeChange(PAGE_SIZE_ALL)} disabled={!pageSizeLoaded}>
              <View style={[styles.sizeChip, pageSize === PAGE_SIZE_ALL && styles.sizeChipSelected]}>
                <Text style={[styles.sizeChipText, pageSize === PAGE_SIZE_ALL && styles.sizeChipTextSelected]}>
                  All
                </Text>
              </View>
            </Pressable>
          </View>
          <Text style={styles.pageSizeHint}>
            More teas load automatically as you scroll. A smaller number keeps scrolling fast on a
            large, heavily-photographed collection.
          </Text>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Backup & Restore</Text>
          <Pressable onPress={() => setInfoVisible(true)} hitSlop={10} accessibilityLabel="About Backup & Restore">
            <MaterialIcons name="info-outline" size={18} color="#8A8A8E" />
          </Pressable>
        </View>
        <View style={[styles.card]}>
          <Pressable style={[styles.row, styles.cardRow]} onPress={handleBackup} disabled={backingUp}>
            <MaterialIcons name="cloud-upload" size={20} color="#2E7D32" />
            <Text style={styles.rowText}>Backup Collection</Text>
            {backingUp ? <ActivityIndicator /> : <MaterialIcons name="chevron-right" size={20} color="#8A8A8E" />}
          </Pressable>
          <Pressable style={[styles.row, styles.cardRow]} onPress={handleRestore} disabled={restoring}>
            <MaterialIcons name="cloud-download" size={20} color="#C62828" />
            <Text style={[styles.rowText, styles.restoreRowText]}>Restore from Backup</Text>
            {restoring ? <ActivityIndicator /> : <MaterialIcons name="chevron-right" size={20} color="#8A8A8E" />}
          </Pressable>
        </View>
      </ScrollView>

      <InfoModal visible={infoVisible} onClose={() => setInfoVisible(false)} title="Backup & Restore">
        <InfoRow icon="cloud-upload" heading="Backup Collection">
          Saves everything in your collection -- every tea, its rating, and its photo -- into one
          file. Save that file somewhere safe, like Google Drive, so it's not just sitting on this
          phone.
        </InfoRow>
        <InfoRow icon="cloud-download" iconColor="#C62828" heading="Restore from Backup">
          Loads a saved backup file back in. This completely replaces whatever is currently in the
          app with what's in that file, so only use it to bring back a real backup -- not to add a
          few extra teas.
        </InfoRow>
        <InfoRow icon="tips-and-updates" iconColor="#A15C1E" heading="A good habit">
          Back up every so often, and especially right before switching to a new phone -- this app
          has no account or server, so this file is the only copy that isn't stuck on this one
          device.
        </InfoRow>
      </InfoModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F5F0" },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8A8A8E",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 22,
  },
  rowText: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1C1C1E" },
  restoreRowText: { color: "#C62828" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    padding: 14,
    gap: 12,
  },
  cardRow: { marginBottom: 0 },
  pageSizeLabel: { fontSize: 13, fontWeight: "600", color: "#1C1C1E" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#E3E9F6",
  },
  sizeChipSelected: { backgroundColor: "#2E5CA6" },
  sizeChipText: { fontSize: 13, fontWeight: "600", color: "#2E5CA6" },
  sizeChipTextSelected: { color: "#FFFFFF" },
  pageSizeHint: { fontSize: 12, color: "#8A8A8E", lineHeight: 17 },
});
