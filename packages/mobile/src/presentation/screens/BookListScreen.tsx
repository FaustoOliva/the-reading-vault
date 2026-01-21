import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import useBooks from "../../application/hooks/useBooks";
import BookCard from "../components/BookCard";
import { Book } from "../../domain/entities/Book";

const BookListScreen: React.FC = () => {
  const { books, loading, error, refresh } = useBooks();

  const renderItem = ({ item }: { item: Book }) => <BookCard book={item} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {loading && books.length === 0 ? (
          <ActivityIndicator size="large" />
        ) : error ? (
          <Text style={styles.error}>Error: {error}</Text>
        ) : (
          <FlatList
            data={books}
            keyExtractor={(b) => String(b.id)}
            renderItem={renderItem}
            contentContainerStyle={
              books.length === 0 ? styles.emptyContainer : undefined
            }
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refresh} />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No books available.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4f6f8" },
  container: { flex: 1, paddingTop: 12 },
  error: { color: "#a00", textAlign: "center", marginTop: 12 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { color: "#666" },
});

export default BookListScreen;
