/**
 * SkeletonBookDetail Component
 * Loading placeholder for book detail screen
 *
 * Rules:
 * - Match general layout of BookDetailHero + cards
 * - Use subtle opacity for skeleton elements
 * - Simple rectangular shapes
 */

import { View, ScrollView, StyleSheet } from "react-native";
import { Background, Border } from "@/constants/colors";

export function SkeletonBookDetail() {
  return (
    <ScrollView
      style={{ backgroundColor: Background.primary }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* Hero section skeleton */}
      <View style={styles.card}>
        <View style={styles.badge} />
        <View style={styles.titleLarge} />
        <View style={styles.subtitle} />
        <View style={styles.actionsRow}>
          <View style={styles.button} />
          <View style={styles.button} />
        </View>
      </View>

      {/* Progress card skeleton */}
      <View style={styles.card}>
        <View style={styles.header} />
        <View style={styles.bar} />
        <View style={styles.statsGrid}>
          <View style={styles.gridItem} />
          <View style={styles.gridItem} />
          <View style={styles.gridItem} />
        </View>
      </View>

      {/* Cycles card skeleton */}
      <View style={styles.card}>
        <View style={styles.header} />
        <View style={styles.cycleItem} />
        <View style={styles.cycleItem} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Background.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Border.default,
    padding: 16,
    gap: 12,
  },
  badge: {
    width: 90,
    height: 24,
    backgroundColor: Border.default,
    borderRadius: 6,
    opacity: 0.5,
  },
  titleLarge: {
    width: "90%",
    height: 24,
    backgroundColor: Border.default,
    borderRadius: 4,
    opacity: 0.5,
  },
  subtitle: {
    width: "70%",
    height: 18,
    backgroundColor: Border.default,
    borderRadius: 4,
    opacity: 0.5,
  },
  header: {
    width: "50%",
    height: 20,
    backgroundColor: Border.default,
    borderRadius: 4,
    opacity: 0.5,
  },
  bar: {
    width: "100%",
    height: 12,
    backgroundColor: Border.default,
    borderRadius: 6,
    opacity: 0.5,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    height: 44,
    backgroundColor: Border.default,
    borderRadius: 8,
    opacity: 0.5,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  gridItem: {
    flex: 1,
    height: 60,
    backgroundColor: Border.default,
    borderRadius: 8,
    opacity: 0.5,
  },
  cycleItem: {
    width: "100%",
    height: 80,
    backgroundColor: Border.default,
    borderRadius: 8,
    opacity: 0.5,
  },
});
