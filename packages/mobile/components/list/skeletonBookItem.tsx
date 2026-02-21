/**
 * SkeletonBookItem Component
 * Loading placeholder for book list items
 * 
 * Rules:
 * - Match dimensions of actual BookListItem
 * - Use subtle animation (pulse effect)
 * - Use accessible colors from constants
 * - Simple rectangular shapes
 */

import { View, StyleSheet } from 'react-native';
import { Background, Border } from '@/constants/colors';

export function SkeletonBookItem() {
  return (
    <View style={styles.container}>
      {/* Book status badge skeleton */}
      <View style={styles.badge} />
      
      {/* Title skeleton */}
      <View style={styles.title} />
      
      {/* Author skeleton */}
      <View style={styles.author} />
      
      {/* Stats row skeleton */}
      <View style={styles.statsRow}>
        <View style={styles.stat} />
        <View style={styles.stat} />
        <View style={styles.stat} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Background.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Border.default,
    padding: 16,
    gap: 10,
  },
  badge: {
    width: 80,
    height: 22,
    backgroundColor: Border.default,
    borderRadius: 6,
    opacity: 0.5,
  },
  title: {
    width: '85%',
    height: 20,
    backgroundColor: Border.default,
    borderRadius: 4,
    opacity: 0.5,
  },
  author: {
    width: '60%',
    height: 16,
    backgroundColor: Border.default,
    borderRadius: 4,
    opacity: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  stat: {
    width: 60,
    height: 14,
    backgroundColor: Border.default,
    borderRadius: 4,
    opacity: 0.5,
  },
});
