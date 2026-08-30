/** Manage the category list -- add your own, or remove ones you don't
 * use. Reached from the Statistics screen. Deleting a category that's
 * still in use reassigns those teas to "Other" rather than leaving them
 * pointing at nothing; "Other" itself is the permanent fallback and
 * can't be deleted. */

import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";

import { addCategory, deleteCategory, getCategoryUsageCounts, listCategories } from "../db";
import { FALLBACK_CATEGORY } from "../types/tea";

export function CategoriesScreen() {
  const [categories, setCategories] = useState<string[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [names, counts] = await Promise.all([listCategories(), getCategoryUsageCounts()]);
      setCategories(names);
      setUsage(counts);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      await addCategory(trimmed);
      setNewName("");
      await refresh();
    } catch (err) {
      Alert.alert("Couldn't add category", String(err));
    } finally {
      setAdding(false);
    }
  }

  function handleDelete(name: string) {
    const count = usage[name] ?? 0;
    const message =
      count > 0
        ? `${count} tea${count === 1 ? "" : "s"} using "${name}" will be moved to "${FALLBACK_CATEGORY}".`
        : `"${name}" isn't used by any teas yet.`;
    Alert.alert(`Delete "${name}"?`, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCategory(name);
            await refresh();
          } catch (err) {
            Alert.alert("Couldn't delete category", String(err));
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          placeholder="New category name"
          placeholderTextColor="#A0A0A5"
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, (!newName.trim() || adding) && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!newName.trim() || adding}
          accessibilityLabel="Add category"
        >
          {adding ? <ActivityIndicator color="#FFFFFF" /> : <MaterialIcons name="add" size={22} color="#FFFFFF" />}
        </Pressable>
      </View>

      {loading && categories.length === 0 ? (
        <ActivityIndicator style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isFallback = item === FALLBACK_CATEGORY;
            const count = usage[item] ?? 0;
            return (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{item}</Text>
                  <Text style={styles.rowCount}>
                    {count} tea{count === 1 ? "" : "s"}
                  </Text>
                </View>
                {isFallback ? (
                  <Text style={styles.defaultLabel}>Default</Text>
                ) : (
                  <Pressable
                    onPress={() => handleDelete(item)}
                    accessibilityLabel={`Delete ${item}`}
                    hitSlop={8}
                  >
                    <MaterialIcons name="delete-outline" size={22} color="#C62828" />
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F5F0" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDDDE1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1C1C1E",
    backgroundColor: "#FFFFFF",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: { opacity: 0.5 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  loadingIndicator: { marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  rowText: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  rowName: { fontSize: 15, fontWeight: "600", color: "#1C1C1E" },
  rowCount: { fontSize: 12, color: "#8A8A8E" },
  defaultLabel: { fontSize: 12, color: "#B5B5BA", fontWeight: "600" },
});
