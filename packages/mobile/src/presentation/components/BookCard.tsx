import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Book } from '../../domain/entities/Book';

type Props = {
  book: Book;
};

const BookCard: React.FC<Props> = ({ book }) => {
  const scoreText = book.score === null || book.score === undefined ? '—' : String(book.score);
  const color = book.ui_color || '#d0d7de';

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: color }]} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{book.title}</Text>
        <Text style={styles.author}>{book.author_name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.status}>{book.status_name}</Text>
          <Text style={styles.score}>{scoreText}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 12,
    marginVertical: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  indicator: {
    width: 6,
    height: '100%',
    borderRadius: 3,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b0b0b',
  },
  author: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  status: {
    fontSize: 12,
    color: '#6b7280',
  },
  score: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default BookCard;
