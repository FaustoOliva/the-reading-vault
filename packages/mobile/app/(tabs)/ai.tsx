/**
 * AI Recommendations Screen
 * Displays AI-powered book recommendations
 *
 * Features:
 * - Generate recommendations button
 * - Loading states
 * - Error handling (empty vault, insufficient data, OpenAI errors)
 * - Recommendation cards with "Add to Vault" action
 * - Regenerate recommendations
 *
 * Rules:
 * - Use ScrollView for simple layouts
 * - Use contentInsetAdjustmentBehavior for safe areas
 * - Handle all error codes from API
 * - Navigation to create-book with pre-filled data
 *
 * Phase: MVP (5.1 - AI Recommendations)
 */

import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useGenerateRecommendations } from "@/hooks/useAIRecommendations";
import { RecommendationCard } from "@/components/cards/recommendationCard";
import {
  Background,
  Text as TextColors,
  Interactive,
  Feedback,
  Border,
} from "@/constants/colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ApiError } from "@/services/api";
import type { BookRecommendation } from "@/types/ai";

export default function AIScreen() {
  const router = useRouter();
  const generateRecommendations = useGenerateRecommendations();

  /**
   * Handle generate button press
   */
  const handleGenerate = () => {
    generateRecommendations.mutate();
  };

  /**
   * Handle add to vault
   */
  const handleAddToVault = (recommendation: BookRecommendation) => {
    try {
      // Pre-fill create-book form with recommendation data
      // Encode params to handle special characters safely
      router.push({
        pathname: "/(tabs)/create-book",
        params: {
          prefillTitle: encodeURIComponent(recommendation.title || ""),
          prefillAuthor: encodeURIComponent(recommendation.author || ""),
          prefillSynopsis: encodeURIComponent(recommendation.synopsis || ""),
        },
      });
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback: navigate without params if encoding fails
      router.push("/(tabs)/create-book");
    }
  };

  /**
   * Get error message based on error code
   */
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) {
      switch (error.code) {
        case "EMPTY_VAULT":
          return "You need to add some books to your vault first before getting recommendations.";
        case "INSUFFICIENT_DATA":
          return "Your reader profile is not ready yet. Complete or abandon more books to unlock recommendations.";
        case "READER_PROFILE_MINIMUM_NOT_MET":
          return "Recommendations will be available once you complete or abandon at least 5 books.";
        case "OPENAI_RATE_LIMIT":
          return "Too many requests. Please wait a moment and try again.";
        case "OPENAI_TIMEOUT":
          return "The request took too long. Please check your connection and try again.";
        case "OPENAI_UNAVAILABLE":
          return "AI service is temporarily unavailable. Please try again later.";
        default:
          return error.message || "Failed to generate recommendations.";
      }
    }
    return "An unexpected error occurred. Please try again.";
  };

  /**
   * Get error action based on error code
   */
  const getErrorAction = (error: unknown) => {
    if (
      error instanceof ApiError &&
      (error.code === "EMPTY_VAULT" ||
        error.code === "INSUFFICIENT_DATA" ||
        error.code === "READER_PROFILE_MINIMUM_NOT_MET")
    ) {
      return {
        label: "Add a Book",
        onPress: () => router.push("/(tabs)/create-book"),
      };
    }
    return {
      label: "Try Again",
      onPress: handleGenerate,
    };
  };

  const recommendations = generateRecommendations.data?.data?.recommendations;

  /**
   * Render initial state (no recommendations yet)
   */
  if (!generateRecommendations.data && !generateRecommendations.error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Background.primary,
          padding: 16,
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <IconSymbol
          name="sparkles"
          size={64}
          color={Interactive.primary.default}
        />
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: TextColors.primary,
            textAlign: "center",
          }}
        >
          AI-Powered Recommendations
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: TextColors.secondary,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          Get personalized book suggestions based on your reading profile and
          preferences.
        </Text>

        <Pressable
          onPress={handleGenerate}
          disabled={generateRecommendations.isPending}
          style={({ pressed }) => ({
            backgroundColor: pressed
              ? Interactive.primary.hover
              : Interactive.primary.default,
            padding: 16,
            borderRadius: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 16,
            opacity: generateRecommendations.isPending ? 0.6 : 1,
          })}
        >
          {generateRecommendations.isPending ? (
            <ActivityIndicator size="small" color={TextColors.inverse} />
          ) : (
            <IconSymbol name="sparkles" size={24} color={TextColors.inverse} />
          )}
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: TextColors.inverse,
            }}
          >
            {generateRecommendations.isPending
              ? "Generating..."
              : "Generate Recommendations"}
          </Text>
        </Pressable>

        {generateRecommendations.isPending && (
          <Text
            style={{
              fontSize: 14,
              color: TextColors.tertiary,
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Analyzing your reading profile...
          </Text>
        )}
      </View>
    );
  }

  /**
   * Render error state
   */
  if (generateRecommendations.error) {
    const errorAction = getErrorAction(generateRecommendations.error);

    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: Background.primary }}
        contentContainerStyle={{
          padding: 16,
          justifyContent: "center",
          minHeight: "100%",
        }}
      >
        <View
          style={{
            padding: 20,
            backgroundColor: Feedback.error.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Feedback.error.border,
            gap: 16,
            borderCurve: "continuous",
          }}
        >
          <View style={{ alignItems: "center", gap: 12 }}>
            <IconSymbol
              name="exclamationmark.triangle.fill"
              size={48}
              color={Feedback.error.text}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: Feedback.error.text,
                textAlign: "center",
              }}
            >
              Unable to Generate Recommendations
            </Text>
          </View>

          <Text
            style={{
              fontSize: 15,
              color: Feedback.error.text,
              textAlign: "center",
              lineHeight: 22,
            }}
          >
            {getErrorMessage(generateRecommendations.error)}
          </Text>

          <Pressable
            onPress={errorAction.onPress}
            style={({ pressed }) => ({
              backgroundColor: pressed
                ? Feedback.error.text
                : Feedback.error.border,
              padding: 14,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 8,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: TextColors.inverse,
              }}
            >
              {errorAction.label}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  /**
   * Render recommendations
   */
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Background.primary }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* Header */}
      <View style={{ gap: 8 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: TextColors.primary,
          }}
        >
          Your Recommendations
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: TextColors.secondary,
          }}
        >
          {recommendations?.length || 0} personalized suggestions based on your
          reading profile
        </Text>
      </View>

      {/* Regenerate Button */}
      <Pressable
        onPress={handleGenerate}
        disabled={generateRecommendations.isPending}
        style={({ pressed }) => ({
          backgroundColor: pressed ? Background.elevated : Background.surface,
          padding: 14,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: Border.default,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: generateRecommendations.isPending ? 0.6 : 1,
        })}
      >
        {generateRecommendations.isPending ? (
          <ActivityIndicator size="small" color={Interactive.primary.default} />
        ) : (
          <IconSymbol
            name="arrow.clockwise"
            size={20}
            color={TextColors.primary}
          />
        )}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: TextColors.primary,
          }}
        >
          {generateRecommendations.isPending
            ? "Generating New Suggestions..."
            : "Get Different Recommendations"}
        </Text>
      </Pressable>

      {/* Recommendation Cards */}
      {recommendations?.map((recommendation, index) => (
        <RecommendationCard
          key={`${recommendation.title}-${index}`}
          recommendation={recommendation}
          onAddToVault={() => handleAddToVault(recommendation)}
          isLoading={false}
        />
      ))}

      {/* Metadata */}
      {generateRecommendations.data?.data && (
        <View
          style={{
            padding: 12,
            backgroundColor: Background.surface,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: Border.default,
            gap: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: TextColors.tertiary,
            }}
          >
            Generated:{" "}
            {new Date(
              generateRecommendations.data.data.generatedAt,
            ).toLocaleString()}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: TextColors.tertiary,
            }}
          >
            Mode: {generateRecommendations.data.data.inputMode} • Tokens used:{" "}
            {generateRecommendations.data.data.tokensUsed}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
