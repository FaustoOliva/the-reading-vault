/**
 * Create Book Screen
 * Form for adding new books to the library
 * 
 * Rules:
 * - Client-side validation before submission
 * - Uses FormInput, FormPicker, and SearchableSelect components
 * - Accessible colors and design
 * - Form state managed with useState
 * - Server state (mutation) with React Query
 * - Initial status can be selected (defaults to WISH_LIST)
 * 
 * Features:
 * - Select from existing authors or create new
 * - Nationality field only visible when creating NEW author
 * - Select from existing countries or create new
 * - Choose initial status (WISH_LIST, READING, COMPLETED, ABANDONED)
 * - API handles author/country creation automatically
 * 
 * UX Behavior:
 * - When typing a new author name: nationality field appears
 * - When selecting existing author: nationality field hides (author already has nationality)
 * - Prevents accidentally changing existing author's nationality
 * 
 * API Contract:
 * - title (required)
 * - author.name (required)
 * - author.nationality (optional, only for new authors)
 * - isbn (optional)
 * - totalPages (optional)
 * - status (optional, defaults to WISH_LIST)
 */

import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateBook } from '@/hooks/useBooks';
import { useAuthors } from '@/hooks/useAuthors';
import { useCountries } from '@/hooks/useCountries';
import { FormInput } from '@/components/formInput';
import { FormPicker } from '@/components/formPicker';
import { SearchableSelect } from '@/components/searchableSelect';
import { BookStatus } from '@/types/book';
import { BOOK_STATUS_LABELS } from '@/constants/bookStatus';
import { Interactive, Background, Text as TextColors } from '@/constants/colors';

export default function CreateBookScreen() {
  const router = useRouter();
  const { mutate: createBook, isPending } = useCreateBook();
  const { data: authors, isLoading: isLoadingAuthors } = useAuthors();
  const { data: countries, isLoading: isLoadingCountries } = useCountries();
  
  // Form state
  const [title, setTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [countryName, setCountryName] = useState('');
  const [isbn, setIsbn] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [status, setStatus] = useState<BookStatus>(BookStatus.WISH_LIST);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Transform authors and countries to SearchableSelect format
  const authorItems = authors?.map(a => ({ id: a.id, name: a.name })) || [];
  const countryItems = countries?.map(c => ({ id: c.id, name: c.name })) || [];

  // Check if the current author name matches an existing author
  const existingAuthor = useMemo(() => {
    if (!authorName.trim()) return null;
    return authors?.find(a => a.name.toLowerCase() === authorName.trim().toLowerCase());
  }, [authors, authorName]);

  // Only show nationality field when creating a new author
  const isCreatingNewAuthor = !existingAuthor;

  // Handle author selection from dropdown
  const handleAuthorSelect = (author: { id: number; name: string }) => {
    setAuthorName(author.name);
    // Clear nationality when selecting an existing author
    setCountryName('');
  };

  /**
   * Validate form before submission
   * Returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Validate author
    if (!authorName.trim()) {
      newErrors.authorName = 'Author name is required';
    }

    if (totalPages && (isNaN(Number(totalPages)) || Number(totalPages) <= 0)) {
      newErrors.totalPages = 'Must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   * Validates, sends to API, and handles success/error
   */
  const handleSubmit = () => {
    if (!validateForm()) return;

    const bookData = {
      title: title.trim(),
      isbn: isbn.trim() || undefined,
      totalPages: totalPages ? Number(totalPages) : undefined,
      status: status,
      author: {
        name: authorName.trim(),
        // Only include nationality if creating a new author
        nationality: isCreatingNewAuthor && countryName.trim() ? countryName.trim() : undefined,
      },
    };

    createBook(bookData, {
      onSuccess: () => {
        Alert.alert('Success', 'Book created successfully');
        
        // Reset form
        setTitle('');
        setAuthorName('');
        setCountryName('');
        setIsbn('');
        setTotalPages('');
        setStatus(BookStatus.WISH_LIST);
        setErrors({});
        
        // Navigate to books list
        router.push('/(tabs)');
      },
      onError: (error) => {
        Alert.alert(
          'Error', 
          error instanceof Error ? error.message : 'Failed to create book'
        );
      },
    });
  };

  // Show loading state while fetching authors/countries
  if (isLoadingAuthors || isLoadingCountries) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Background.primary }}>
        <ActivityIndicator size="large" color={Interactive.primary.default} />
        <Text style={{ marginTop: 12, color: TextColors.secondary }}>Loading form...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ 
        flex: 1, 
        backgroundColor: Background.primary 
      }}
      contentContainerStyle={{ 
        padding: 16, 
        gap: 16 
      }}
    >
      <FormInput
        label="Title *"
        value={title}
        onChangeText={setTitle}
        placeholder="Enter book title"
        error={errors.title}
        autoCapitalize="words"
        accessibilityLabel="Book title"
        accessibilityHint="Required field. Enter the title of the book"
      />

      <SearchableSelect
        label="Author *"
        value={authorName}
        onChangeText={setAuthorName}
        onSelectItem={handleAuthorSelect}
        items={authorItems}
        placeholder="Search or create author..."
        error={errors.authorName}
        createLabel="Create author"
        zIndex={3}
      />

      {isCreatingNewAuthor && authorName.trim() && (
        <SearchableSelect
          label="Author Nationality (Optional)"
          value={countryName}
          onChangeText={setCountryName}
          items={countryItems}
          placeholder="Search or create country..."
          createLabel="Create country"
          zIndex={2}
        />
      )}

      <FormPicker
        label="Initial Status"
        value={status}
        onValueChange={setStatus}
        options={[
          { label: BOOK_STATUS_LABELS[BookStatus.WISH_LIST], value: BookStatus.WISH_LIST },
          { label: BOOK_STATUS_LABELS[BookStatus.READING], value: BookStatus.READING },
          { label: BOOK_STATUS_LABELS[BookStatus.COMPLETED], value: BookStatus.COMPLETED },
          { label: BOOK_STATUS_LABELS[BookStatus.ABANDONED], value: BookStatus.ABANDONED },
        ]}
        accessibilityLabel="Initial book status"
        accessibilityHint="Select the starting status for this book. Defaults to Wish List"
      />

      <FormInput
        label="ISBN"
        value={isbn}
        onChangeText={setIsbn}
        placeholder="Enter ISBN (optional)"
        error={errors.isbn}
      />

      <FormInput
        label="Total Pages"
        value={totalPages}
        onChangeText={setTotalPages}
        placeholder="Enter total pages (optional)"
        keyboardType="numeric"
        error={errors.totalPages}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={isPending}
        accessibilityRole="button"
        accessibilityLabel="Create book"
        accessibilityHint="Creates a new book with the entered information"
        accessibilityState={{ disabled: isPending, busy: isPending }}
        style={({ pressed }) => ({
          backgroundColor: isPending || pressed 
            ? Interactive.primary.pressed 
            : Interactive.primary.default,
          padding: 16,
          borderRadius: 12,
          borderCurve: 'continuous',
          alignItems: 'center',
          marginTop: 8,
          opacity: isPending ? 0.7 : 1,
        })}
      >
        <Text 
          style={{ 
            color: Interactive.primary.text, 
            fontSize: 17, 
            fontWeight: '600' 
          }}
        >
          {isPending ? 'Creating...' : 'Create Book'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
