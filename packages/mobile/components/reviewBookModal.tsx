/**
 * Review Book Modal
 * Modal for reviewing PENDING_SCORE books (mark as COMPLETED or ABANDONED)
 * 
 * Design Rules:
 * - Score is mandatory (0-10 scale with 0.5 increments)
 * - Comment is optional
 * - Smart action button: Complete if all pages read, otherwise Abandon only
 * - Uses accessible colors from @/constants/colors
 */

import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useReviewBook } from '@/hooks/useBooks';
import { BookStatus } from '@/types/book';
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
  Feedback,
} from '@/constants/colors';

interface ReviewBookModalProps {
  visible: boolean;
  onClose: () => void;
  bookId: number;
  bookTitle: string;
  totalPages: number | null;
  pagesReadInCycle: number;
}

export function ReviewBookModal({
  visible,
  onClose,
  bookId,
  bookTitle,
  totalPages,
  pagesReadInCycle,
}: ReviewBookModalProps) {
  const [score, setScore] = useState<number>(7);
  const [comment, setComment] = useState<string>('');
  const reviewMutation = useReviewBook();

  // Determine if book is fully read
  const isFullyRead = totalPages !== null && pagesReadInCycle >= totalPages;

  // Determine target status based on pages read
  const targetStatus = isFullyRead ? BookStatus.COMPLETED : BookStatus.ABANDONED;

  const handleReview = () => {
    reviewMutation.mutate(
      {
        id: bookId,
        data: {
          targetStatus,
          score,
          comment: comment.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          // Reset form and close
          setScore(7);
          setComment('');
          onClose();
        },
      }
    );
  };

  // Format score display
  const formatScore = (value: number) => {
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  };

  // Get score color based on value
  const getScoreColor = () => {
    if (score >= 8) return '#10B981'; // green-500
    if (score >= 6) return '#F59E0B'; // amber-500
    if (score >= 4) return '#F97316'; // orange-500
    return '#EF4444'; // red-500
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
            Review Book
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: TextColors.secondary,
            }}
            numberOfLines={2}
          >
            {bookTitle}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Reading Status Info */}
          <View
            style={{
              backgroundColor: isFullyRead ? Feedback.success.background : Feedback.warning.background,
              padding: 16,
              borderRadius: 8,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: isFullyRead ? Feedback.success.border : Feedback.warning.border,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: isFullyRead ? Feedback.success.text : Feedback.warning.text,
                marginBottom: 4,
              }}
            >
              {isFullyRead ? '✅ All pages read' : '📖 Partially read'}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: isFullyRead ? Feedback.success.text : Feedback.warning.text,
              }}
            >
              {totalPages 
                ? `${pagesReadInCycle} of ${totalPages} pages (${Math.round((pagesReadInCycle / totalPages) * 100)}%)`
                : `${pagesReadInCycle} pages read`}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: isFullyRead ? Feedback.success.text : Feedback.warning.text,
                marginTop: 8,
              }}
            >
              {isFullyRead 
                ? 'Book will be marked as COMPLETED' 
                : 'Book will be marked as ABANDONED'}
            </Text>
          </View>

          {/* Score Input */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: TextColors.primary,
              }}
            >
              Score (required) *
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: TextColors.secondary,
                marginTop: -6,
              }}
            >
              Tap buttons or type to rate from 0 to 10 (0.5 increments)
            </Text>

            {/* Score Display */}
            <View
              style={{
                backgroundColor: Background.surface,
                borderRadius: 12,
                borderCurve: 'continuous',
                padding: 20,
                alignItems: 'center',
                borderWidth: 2,
                borderColor: getScoreColor(),
              }}
            >
              <Text
                style={{
                  fontSize: 56,
                  fontWeight: '700',
                  color: getScoreColor(),
                }}
              >
                {formatScore(score)}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: TextColors.secondary,
                  marginTop: 4,
                }}
              >
                out of 10
              </Text>
            </View>

            {/* Quick Score Buttons */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
              }}
            >
              {[0, 2.5, 5, 7.5, 10].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setScore(value)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    backgroundColor:
                      score === value
                        ? Interactive.primary.default
                        : pressed
                        ? Interactive.secondary.pressed
                        : Interactive.secondary.default,
                    borderRadius: 8,
                    borderCurve: 'continuous',
                    borderWidth: 1,
                    borderColor:
                      score === value
                        ? Interactive.primary.default
                        : Border.default,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color:
                        score === value
                          ? Interactive.primary.text
                          : TextColors.primary,
                    }}
                  >
                    {formatScore(value)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Fine-tune Buttons */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                justifyContent: 'center',
              }}
            >
              <Pressable
                onPress={() => setScore(Math.max(0, score - 0.5))}
                disabled={score === 0}
                style={({ pressed }) => ({
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  backgroundColor: score === 0
                    ? Interactive.primary.disabled
                    : pressed
                    ? Interactive.secondary.pressed
                    : Interactive.secondary.default,
                  borderRadius: 8,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: Border.default,
                })}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: score === 0 ? TextColors.disabled : TextColors.primary,
                  }}
                >
                  - 0.5
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => setScore(Math.min(10, score + 0.5))}
                disabled={score === 10}
                style={({ pressed }) => ({
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  backgroundColor: score === 10
                    ? Interactive.primary.disabled
                    : pressed
                    ? Interactive.secondary.pressed
                    : Interactive.secondary.default,
                  borderRadius: 8,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: Border.default,
                })}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: score === 10 ? TextColors.disabled : TextColors.primary,
                  }}
                >
                  + 0.5
                </Text>
              </Pressable>
            </View>
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
              Comment (optional)
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
          {/* Primary Action Button */}
          <Pressable
            onPress={handleReview}
            disabled={reviewMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: reviewMutation.isPending
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
            {reviewMutation.isPending ? (
              <ActivityIndicator color={Interactive.primary.text} />
            ) : null}
            <Text
              style={{
                color: Interactive.primary.text,
                fontSize: 16,
                fontWeight: '600',
              }}
            >
              {isFullyRead ? '✅ Mark as Completed' : '🚫 Mark as Abandoned'}
            </Text>
          </Pressable>

          {/* Cancel */}
          <Pressable
            onPress={onClose}
            disabled={reviewMutation.isPending}
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
