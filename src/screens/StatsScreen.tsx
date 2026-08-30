/** Statistics screen: headline numbers plus a category and brand
 * breakdown of the whole collection. Read-only -- category management
 * and backup/restore live on the Settings screen instead. */

import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getBrandBreakdown,
  getCategoryBreakdown,
  getCollectionStats,
  type CollectionStats,
  type NamedCount,
} from "../db";
import { CategoryBadge } from "../components/CategoryBadge";

function BreakdownBar({ item, maxCount }: { item: NamedCount; maxCount: number }) {
  const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 4) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {item.name}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${width}%` }]} />
      </View>
      <Text style={styles.barCount}>{item.count}</Text>
    </View>
  );
}

export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [byCategory, setByCategory] = useState<NamedCount[]>([]);
  const [byBrand, setByBrand] = useState<NamedCount[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [collectionStats, categories, brands] = await Promise.all([
        getCollectionStats(),
        getCategoryBreakdown(),
        getBrandBreakdown(),
      ]);
      setStats(collectionStats);
      setByCategory(categories);
      setByBrand(brands);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const total = stats?.total ?? 0;
  const maxCategoryCount = byCategory[0]?.count ?? 0;
  const maxBrandCount = byBrand[0]?.count ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.headline}>
        <Text style={styles.headlineNumber}>{total}</Text>
        <Text style={styles.headlineLabel}>teas in your collection</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{stats?.rated ?? 0}</Text>
          <Text style={styles.summaryLabel}>Rated</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>
            {stats?.averageRating != null ? stats.averageRating.toFixed(1) : "—"}
          </Text>
          <Text style={styles.summaryLabel}>Avg ★</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{stats?.withPhoto ?? 0}</Text>
          <Text style={styles.summaryLabel}>Photographed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>By Category</Text>
      <View style={styles.card}>
        {byCategory.length === 0 ? (
          <Text style={styles.emptyText}>No teas yet.</Text>
        ) : (
          byCategory.map((item) => (
            <View key={item.name} style={styles.categoryRow}>
              <CategoryBadge category={item.name} />
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.max((item.count / maxCategoryCount) * 100, 4)}%` }]} />
              </View>
              <Text style={styles.barCount}>{item.count}</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>By Brand</Text>
      <View style={styles.card}>
        {byBrand.length === 0 ? (
          <Text style={styles.emptyText}>No teas yet.</Text>
        ) : (
          byBrand.map((item) => <BreakdownBar key={item.name} item={item} maxCount={maxBrandCount} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F5F0" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F5F0" },
  content: { padding: 16 },
  headline: { alignItems: "center", marginTop: 8, marginBottom: 20 },
  headlineNumber: { fontSize: 48, fontWeight: "800", color: "#2E7D32" },
  headlineLabel: { fontSize: 14, color: "#6B6B70", marginTop: 2 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    paddingVertical: 14,
    alignItems: "center",
  },
  summaryNumber: { fontSize: 20, fontWeight: "700", color: "#1C1C1E" },
  summaryLabel: { fontSize: 12, color: "#8A8A8E", marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8A8A8E",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    padding: 14,
    marginBottom: 22,
    gap: 12,
  },
  emptyText: { color: "#8A8A8E", fontSize: 13 },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barLabel: { width: 90, fontSize: 13, color: "#1C1C1E" },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EDEDF0",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#2E7D32",
  },
  barCount: { width: 28, textAlign: "right", fontSize: 12, fontWeight: "600", color: "#5A5A60" },
});
