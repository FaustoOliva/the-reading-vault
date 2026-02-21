/**
 * Edit Book Modal
 * Modal for editing book metadata (title, totalPages, score, comment)
 * Does not change book status
 * 
 * Design Rules:
 * - All fields are optional (partial updates)
 * - Score range: 0-10
 * - Uses accessible colors from @/constants/colors
 */

import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useUpdateBook } from '@/hooks/useBooks';
import { Book } from '@/types/book';
import { editBookSchema, getZodErrors } from '@/types/schemas';
import { showToast } from '@/components/ui/toast';
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
  Feedback,
} from '@/constants/colors';

interface EditBookModalProps {
  visible: boolean;
  onClose: () => void;
  book: Book;
}

export function EditBookModal({ visible, onClose, book }: EditBookModalProps) {
  const [title, setTitle] = useState<string>(book.title);
  const [totalPages, setTotalPages] = useState<string>(
    book.totalPages?.toString() || ''
  );
  const [score, setScore] = useState<string>(book.score?.toString() || '');
  const [comment, setComment] = useState<string>(book.comment || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useUpdateBook();

  // Reset form when book changes
  useEffect(() => {
    setTitle(book.title);
    setTotalPages(book.totalPages?.toString() || '');
    setScore(book.score?.toString() || '');
    setComment(book.comment || '');
    setErrors({});
  }, [book, visible]);

  const validate = (): boolean => {
    const result = editBookSchema.safeParse({
      title,
      totalPages,
      score,
      comment,
    });

    if (!result.success) {
      setErrors(getZodErrors(result.error));
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const updates: {
      title?: string;
      totalPages?: number;
      score?: number;
      comment?: string;
    } = {};

    // Only include changed fields
    if (title.trim() !== book.title) {
      updates.title = title.trim();
    }

    const totalPagesNum = totalPages ? Number(totalPages) : null;
    if (totalPagesNum !== book.totalPages) {
      updates.totalPages = totalPagesNum || undefined;
    }

    const scoreNum = score ? Number(score) : null;
    if (scoreNum !== book.score) {
      updates.score = scoreNum || undefined;
    }

    if (comment.trim() !== (book.comment || '')) {
      updates.comment = comment.trim() || undefined;
    }

    // Check if anything changed
    if (Object.keys(updates).length === 0) {
      showToast.info('No changes', 'No fields were modified');
      return;
    }

    updateMutation.mutate(
      {
        id: book.id,
        data: updates,
      },
      {
        onSuccess: () => {
          showToast.success('Book updated', 'Changes saved successfully');
          onClose();
        },
        onError: (error: any) => {
          showToast.error(
            'Update failed',
            error?.message || 'Failed to update book'
          );
        },
      }
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: Background.primary }}>
        {/* Header */}
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: Border.default,
            backgroundColor: Background.surface,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: TextColors.primary,
              marginBottom: 4,
            }}
          >
            Edit Book
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: TextColors.secondary,
            }}
          >
            Update book metadata (status remains unchanged)
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Field */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: TextColors.primary,
              }}
            >
              Title *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.title ? Feedback.error.border : Border.default,
                borderRadius: 8,
                borderCurve: 'continuous',
                padding: 12,
                fontSize: 16,
                backgroundColor: Background.surface,
                color: TextColors.primary,
              }}
              placeholder="Enter book title"
              placeholderTextColor={TextColors.tertiary}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: '' }));
                }
              }}
            />
            {errors.title ? (
              <Text
                style={{
                  fontSize: 14,
                  color: Feedback.error.text,
                }}
              >
                {errors.title}
              </Text>
            ) : null}
          </View>

          {/* Total Pages Field */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: TextColors.primary,
              }}
            >
              Total Pages
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.totalPages
                  ? Feedback.error.border
                  : Border.default,
                borderRadius: 8,
                borderCurve: 'continuous',
                padding: 12,
                fontSize: 16,
                backgroundColor: Background.surface,
                color: TextColors.primary,
              }}
              placeholder="e.g. 350"
              placeholderTextColor={TextColors.tertiary}
              value={totalPages}
              onChangeText={(text) => {
                setTotalPages(text);
                if (errors.totalPages) {
                  setErrors((prev) => ({ ...prev, totalPages: '' }));
                }
              }}
              keyboardType="number-pad"
            />
            {errors.totalPages ? (
              <Text
                style={{
                  fontSize: 14,
                  color: Feedback.error.text,
                }}
              >
                {errors.totalPages}
              </Text>
            ) : null}
          </View>

          {/* Score Field */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: TextColors.primary,
              }}
            >
              Score (0-10)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: errors.score ? Feedback.error.border : Border.default,
                borderRadius: 8,
                borderCurve: 'continuous',
                padding: 12,
                fontSize: 16,
                backgroundColor: Background.surface,
                color: TextColors.primary,
              }}
              placeholder="e.g. 8"
              placeholderTextColor={TextColors.tertiary}
              value={score}
              onChangeText={(text) => {
                setScore(text);
                if (errors.score) {
                  setErrors((prev) => ({ ...prev, score: '' }));
                }
              }}
              keyboardType="number-pad"
            />
            {errors.score ? (
              <Text
                style={{
                  fontSize: 14,
                  color: Feedback.error.text,
                }}
              >
                {errors.score}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize: 13,
                color: TextColors.tertiary,
              }}
            >
              Rate from 0 (poor) to 10 (excellent)
            </Text>
          </View>

          {/* Comment Field */}
          <View style={{ gap: 6 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: TextColors.primary,
              }}
            >
              Comment
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: Border.default,
                borderRadius: 8,
                borderCurve: 'continuous',
                padding: 12,
                fontSize: 16,
                backgroundColor: Background.surface,
                color: TextColors.primary,
                minHeight: 100,
                textAlignVertical: 'top',
              }}
              placeholder="Add your thoughts about this book..."
              placeholderTextColor={TextColors.tertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
            />
            <Text
              style={{
                fontSize: 13,
                color: TextColors.tertiary,
                textAlign: 'right',
              }}
            >
              {comment.length}/500
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View
          style={{
            padding: 16,
            gap: 12,
            borderTopWidth: 1,
            borderTopColor: Border.default,
            backgroundColor: Background.surface,
          }}
        >
          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={updateMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: updateMutation.isPending
                ? Interactive.primary.disabled
                : pressed
                ? Interactive.primary.pressed
                : Interactive.primary.default,
              padding: 16,
              borderRadius: 8,
              borderCurve: 'continuous',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            })}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color={Interactive.primary.text} />
            ) : null}
            <Text
              style={{
                color: Interactive.primary.text,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              Save Changes
            </Text>
          </Pressable>

          {/* Cancel */}
          <Pressable
            onPress={onClose}
            disabled={updateMutation.isPending}
            style={({ pressed }) => ({
              padding: 12,
              alignItems: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: TextColors.secondary,
                fontSize: 15,
                fontWeight: '500',
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
