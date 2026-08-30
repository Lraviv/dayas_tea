/** Step 1 + 5 of the product flow: the gallery of saved tea bags, with
 * search, category/rating filters, sorting, and Excel export. */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";
import type { SortField, Tea, TeaCategory } from "../types/tea";
import { DEFAULT_PAGE_SIZE, getPageSize, listCategories, listTeas } from "../db";
import { TeaCard } from "../components/TeaCard";
import { CategoryBadge } from "../components/CategoryBadge";

type Props = NativeStackScreenProps<RootStackParamList, "Library">;

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "createdAt", label: "Date Added" },
  { field: "name", label: "Name" },
  { field: "brand", label: "Brand" },
  { field: "rating", label: "Rating" },
  { field: "category", label: "Category" },
];

export function LibraryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [teas, setTeas] = useState<Tea[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<TeaCategory | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(searchInput), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Filters only -- limit/offset are handled separately below, since they
  // differ between "start over from page one" (refresh) and "append the
  // next page" (loadMore).
  const query = useMemo(
    () => ({
      q: debouncedQuery || undefined,
      category,
      minRating,
      sortBy,
      order,
    }),
    [debouncedQuery, category, minRating, sortBy, order]
  );

  // Loads page one and replaces whatever's currently shown. Runs whenever
  // the filters or the page-size preference change (via the effect below),
  // and once per screen focus (via refreshNonce) so edits made on the
  // form/camera screens are reflected when you come back.
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listTeas({ ...query, limit: pageSize, offset: 0 });
      setTeas(result.items);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [query, pageSize]);

  useEffect(() => {
    refresh();
    // refreshNonce is intentionally not read here, just depended on -- see
    // useFocusEffect below, which bumps it to force a fresh page-one fetch
    // on every focus even when the filters/page size haven't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshNonce]);

  // Fetches the next page and appends it, rather than replacing -- used by
  // the list's onEndReached below. A fixed limit used to mean anything
  // past it was silently unreachable; this is what actually fixes that.
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || teas.length >= total) return;
    setLoadingMore(true);
    try {
      const result = await listTeas({ ...query, limit: pageSize, offset: teas.length });
      setTeas((prev) => [...prev, ...result.items]);
    } finally {
      setLoadingMore(false);
    }
  }, [query, pageSize, teas.length, total, loading, loadingMore]);

  useFocusEffect(
    useCallback(() => {
      listCategories().then(setCategories);
      getPageSize().then(setPageSize);
      setRefreshNonce((n) => n + 1);
    }, [])
  );

  const handleOpenTea = useCallback(
    (id: string) => navigation.navigate("TeaForm", { teaId: id }),
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Tea }) => <TeaCard tea={item} onPress={handleOpenTea} />,
    [handleOpenTea]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Daya's Tea</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate("Stats")} accessibilityLabel="View statistics">
            <MaterialIcons name="bar-chart" size={24} color="#2E7D32" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Settings")} accessibilityLabel="Settings">
            <MaterialIcons name="settings" size={24} color="#2E7D32" />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <MaterialIcons name="search" size={20} color="#8A8A8E" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your collection…"
          placeholderTextColor="#A0A0A5"
          value={searchInput}
          onChangeText={setSearchInput}
        />
        <Pressable onPress={() => setShowFilters((v) => !v)} accessibilityLabel="Toggle filters">
          <MaterialIcons
            name="tune"
            size={22}
            color={category || minRating || sortBy !== "createdAt" ? "#2E7D32" : "#8A8A8E"}
          />
        </Pressable>
      </View>

      {showFilters ? (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>Category</Text>
          <View style={styles.chipRow}>
            <Pressable onPress={() => setCategory(undefined)}>
              <View style={[styles.allChip, !category && styles.allChipSelected]}>
                <Text style={[styles.allChipText, !category && styles.allChipTextSelected]}>All</Text>
              </View>
            </Pressable>
            {categories.map((c) => (
              <CategoryBadge
                key={c}
                category={c}
                selected={category === c}
                onPress={() => setCategory(category === c ? undefined : c)}
              />
            ))}
          </View>

          <Text style={styles.filterLabel}>Minimum Rating</Text>
          <View style={styles.chipRow}>
            {[1, 2, 3, 4, 5].map((r) => (
              <Pressable key={r} onPress={() => setMinRating(minRating === r ? undefined : r)}>
                <View style={[styles.ratingChip, minRating === r && styles.ratingChipSelected]}>
                  <Text style={[styles.ratingChipText, minRating === r && styles.ratingChipTextSelected]}>
                    {r}+ ★
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>Sort By</Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map((opt) => {
              const selected = sortBy === opt.field;
              return (
                <Pressable
                  key={opt.field}
                  onPress={() => {
                    if (selected) {
                      setOrder((o) => (o === "asc" ? "desc" : "asc"));
                    } else {
                      setSortBy(opt.field);
                      setOrder("desc");
                    }
                  }}
                >
                  <View style={[styles.sortChip, selected && styles.sortChipSelected]}>
                    <Text style={[styles.sortChipText, selected && styles.sortChipTextSelected]}>
                      {opt.label} {selected ? (order === "asc" ? "↑" : "↓") : ""}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {loading && teas.length === 0 ? (
        <ActivityIndicator style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={teas}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={refresh}
          renderItem={renderItem}
          // Perf tuning for a list that can hold hundreds of rows (see the
          // "large list is slow to update" warning): render a small first
          // batch, keep the off-screen window small, and (Android) drop
          // native views for rows scrolled out of sight instead of just
          // hiding them.
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footerLoading} /> : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="local-cafe" size={40} color="#C7C7CC" />
              <Text style={styles.emptyText}>
                {total === 0 && !debouncedQuery && !category && !minRating
                  ? "No teas yet — tap + to add your first one."
                  : "No teas match your search or filters."}
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: 28 + insets.bottom }]}
        onPress={() => navigation.navigate("Camera")}
        accessibilityLabel="Add a tea"
      >
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F5F0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 30, height: 30 },
  title: { fontSize: 24, fontWeight: "700", color: "#1C1C1E" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1C1C1E" },
  filterPanel: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A8A8E",
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  allChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#E8E8EC",
  },
  allChipSelected: { backgroundColor: "#3A3A3C" },
  allChipText: { fontSize: 12, fontWeight: "600", color: "#5A5A66" },
  allChipTextSelected: { color: "#FFFFFF" },
  ratingChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F3E9C9",
  },
  ratingChipSelected: { backgroundColor: "#D4A017" },
  ratingChipText: { fontSize: 12, fontWeight: "600", color: "#8A6D1E" },
  ratingChipTextSelected: { color: "#FFFFFF" },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#E3E9F6",
  },
  sortChipSelected: { backgroundColor: "#2E5CA6" },
  sortChipText: { fontSize: 12, fontWeight: "600", color: "#2E5CA6" },
  sortChipTextSelected: { color: "#FFFFFF" },
  listContent: { padding: 10, paddingBottom: 100, flexGrow: 1 },
  loadingIndicator: { marginTop: 40 },
  footerLoading: { marginVertical: 16 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyText: { textAlign: "center", color: "#8A8A8E", fontSize: 14 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
