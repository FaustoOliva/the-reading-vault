/**
 * Create Book Screen
 * Form for adding new books to the library
 *
 * Rules:
 * - Client-side validation before submission
 * - Uses FormInput, FormPicker, and InputWithSuggestions components
 * - Accessible colors and design
 * - Form state managed with useState
 * - Server state (mutation) with React Query
 * - Initial status can be selected (defaults to WISH_LIST)
 *
 * Features:
 * - Input authors with inline suggestions (no dropdowns)
 * - Nationality field only visible when creating NEW author
 * - Input countries with inline suggestions
 * - Choose initial status (WISH_LIST, READING, COMPLETED, ABANDONED)
 * - API handles author/country creation automatically
 *
 * UX Behavior:
 * - When typing a new author name: nationality field appears
 * - When selecting existing author: nationality field hides (author already has nationality)
 * - Suggestions appear as pills below the input (no floating dropdowns)
 * - User can tap suggestion or continue typing to create new entry
 *
 * API Contract:
 * - title (required)
 * - author.name (required)
 * - author.nationality (optional, only for new authors)
 * - isbn (optional)
 * - totalPages (optional)
 * - status (optional, defaults to WISH_LIST)
 */

import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCreateBook } from "@/hooks/useBooks";
import { useAuthors } from "@/hooks/useAuthors";
import { useCountries } from "@/hooks/useCountries";
import { FormInput } from "@/components/forms/formInput";
import { InputWithSuggestions } from "@/components/forms/inputWithSuggestions";
import { CustomDropdown } from "@/components/forms/customDropdown";
import { showToast } from "@/components/ui/toast";
import { BookStatus } from "@/types/book";
import { BOOK_STATUS_LABELS } from "@/constants/bookStatus";
import { createBookSchema, getZodErrors } from "@/types/schemas";
import {
  Interactive,
  Background,
  Text as TextColors,
} from "@/constants/colors";

export default function CreateBookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefillTitle?: string;
    prefillAuthor?: string;
  }>();
  const { mutate: createBook, isPending } = useCreateBook();
  const { data: authors, isLoading: isLoadingAuthors } = useAuthors();
  const { data: countries, isLoading: isLoadingCountries } = useCountries();

  // Form state
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [countryName, setCountryName] = useState("");
  const [isbn, setIsbn] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [publicationYear, setPublicationYear] = useState("");
  const [status, setStatus] = useState<BookStatus>(BookStatus.WISH_LIST);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form when coming from AI recommendations
  useEffect(() => {
    if (params.prefillTitle) {
      try {
        const decodedTitle = decodeURIComponent(params.prefillTitle);
        setTitle(decodedTitle);
      } catch (error) {
        console.error("Error decoding title:", error);
        setTitle(params.prefillTitle); // Fallback to raw value
      }
    }
    if (params.prefillAuthor) {
      try {
        const decodedAuthor = decodeURIComponent(params.prefillAuthor);
        setAuthorName(decodedAuthor);
      } catch (error) {
        console.error("Error decoding author:", error);
        setAuthorName(params.prefillAuthor); // Fallback to raw value
      }
    }
  }, [params.prefillTitle, params.prefillAuthor]);

  // Transform authors and countries to simple string arrays
  const authorSuggestions = authors?.map((a) => a.name) || [];
  const countrySuggestions = countries?.map((c) => c.name) || [];

  // Check if the current author name matches an existing author
  const existingAuthor = useMemo(() => {
    if (!authorName.trim()) return null;
    return authors?.find(
      (a) => a.name.toLowerCase() === authorName.trim().toLowerCase(),
    );
  }, [authors, authorName]);

  // Only show nationality field when creating a new author
  const isCreatingNewAuthor = !existingAuthor;

  /**
   * Validate form before submission using Zod schema
   * Returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const result = createBookSchema.safeParse({
      title,
      authorName,
      countryName,
      isbn,
      totalPages,
      publicationYear,
      status,
    });

    if (!result.success) {
      setErrors(getZodErrors(result.error));
      return false;
    }

    setErrors({});
    return true;
  };

  /**
   * Check if form is valid for submission
   * Returns true if all required fields are filled
   */
  const isFormValid = (): boolean => {
    return title.trim().length > 0 && authorName.trim().length > 0;
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
      publicationYear: publicationYear ? Number(publicationYear) : undefined,
      status: status,
      author: {
        name: authorName.trim(),
        // Only include nationality if creating a new author
        nationality:
          isCreatingNewAuthor && countryName.trim()
            ? countryName.trim()
            : undefined,
      },
    };

    createBook(bookData, {
      onSuccess: () => {
        showToast.success("Book created", "Added to your library");

        // Reset form
        setTitle("");
        setAuthorName("");
        setCountryName("");
        setIsbn("");
        setTotalPages("");
        setPublicationYear("");
        setStatus(BookStatus.WISH_LIST);
        setErrors({});

        // Navigate to books list
        router.push("/(tabs)");
      },
      onError: (error) => {
        showToast.error(
          "Failed to create book",
          error instanceof Error ? error.message : "Please try again",
        );
      },
    });
  };

  // Show loading state while fetching authors/countries
  if (isLoadingAuthors || isLoadingCountries) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: Background.primary,
        }}
      >
        <ActivityIndicator size="large" color={Interactive.primary.default} />
        <Text style={{ marginTop: 12, color: TextColors.secondary }}>
          Loading form...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{
        flex: 1,
        backgroundColor: Background.primary,
      }}
      contentContainerStyle={{
        padding: 16,
        gap: 20,
      }}
    >
      {/* Header */}
      <View style={{ gap: 4, marginBottom: 8 }}>
        <Text
          style={{ fontSize: 28, fontWeight: "700", color: TextColors.primary }}
        >
          Add New Book
        </Text>
        <Text
          style={{ fontSize: 14, color: TextColors.secondary, lineHeight: 20 }}
        >
          Expand your library by adding a new book. Select from existing authors
          or create new ones.
        </Text>
      </View>
      <FormInput
        label="Title *"
        value={title}
        onChangeText={setTitle}
        placeholder="Enter book title"
        error={errors.title}
        autoCapitalize="words"
        accessibilityLabel="Book title, required"
        accessibilityHint="Enter the title of the book"
      />

      <InputWithSuggestions
        label="Author *"
        value={authorName}
        onChangeText={setAuthorName}
        suggestions={authorSuggestions}
        placeholder="Type author name..."
        error={errors.authorName}
        autoCapitalize="words"
        accessibilityLabel="Author name, required"
        accessibilityHint="Type an author name. Select from suggestions or create new."
      />

      {isCreatingNewAuthor && authorName.trim() && (
        <InputWithSuggestions
          label="Author Nationality (Optional)"
          value={countryName}
          onChangeText={setCountryName}
          suggestions={countrySuggestions}
          placeholder="Type country name..."
          autoCapitalize="words"
          accessibilityLabel="Author nationality, optional"
          accessibilityHint="Only shown when creating a new author. Type a country name or select from suggestions."
        />
      )}

      <CustomDropdown
        label="Initial Status"
        value={status}
        onValueChange={setStatus}
        options={[
          {
            label: BOOK_STATUS_LABELS[BookStatus.WISH_LIST],
            value: BookStatus.WISH_LIST,
          },
          {
            label: BOOK_STATUS_LABELS[BookStatus.READING],
            value: BookStatus.READING,
          },
          {
            label: BOOK_STATUS_LABELS[BookStatus.COMPLETED],
            value: BookStatus.COMPLETED,
          },
          {
            label: BOOK_STATUS_LABELS[BookStatus.ABANDONED],
            value: BookStatus.ABANDONED,
          },
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
        accessibilityLabel="ISBN, optional"
        accessibilityHint="Enter the book's ISBN number if available"
      />

      <FormInput
        label="Total Pages"
        value={totalPages}
        onChangeText={setTotalPages}
        placeholder="Enter total pages (optional)"
        keyboardType="numeric"
        error={errors.totalPages}
        accessibilityLabel="Total pages, optional"
        accessibilityHint="Enter the total number of pages in the book"
      />

      <FormInput
        label="Publication Year"
        value={publicationYear}
        onChangeText={setPublicationYear}
        placeholder="e.g. 2020 (optional)"
        keyboardType="numeric"
        error={errors.publicationYear}
        accessibilityLabel="Publication year, optional"
        accessibilityHint="Enter the year the book was published"
      />

      <Pressable
        onPress={handleSubmit}
        disabled={!isFormValid() || isPending}
        accessibilityRole="button"
        accessibilityLabel="Create book"
        accessibilityHint="Creates a new book with the entered information"
        accessibilityState={{
          disabled: !isFormValid() || isPending,
          busy: isPending,
        }}
        style={({ pressed }) => ({
          backgroundColor:
            !isFormValid() || isPending
              ? Interactive.primary.disabled
              : pressed
                ? Interactive.primary.pressed
                : Interactive.primary.default,
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 12,
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 12,
          minHeight: 56,
          opacity: !isFormValid() || isPending ? 0.7 : 1,
        })}
      >
        {isPending ? (
          <ActivityIndicator size="small" color={Interactive.primary.text} />
        ) : (
          <Text
            style={{
              color: Interactive.primary.text,
              fontSize: 17,
              fontWeight: "600",
            }}
          >
            Create Book
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
