import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Pressable,
  TextInput,
} from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  useGenerateRecommendations,
  useGenerateFavoriteAuthorRecommendations,
} from "@/hooks/useAIRecommendations";
import { useAuthorSynergy, useBookSynergy } from "@/hooks/useAISynergy";
import { RecommendationCard } from "@/components/cards/recommendationCard";
import { AISynergyCard } from "@/components/cards/aiSynergyCard";
import {
  Background,
  Text as TextColors,
  Interactive,
  Feedback,
  Border,
} from "@/constants/colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ApiError, api } from "@/services/api";
import type { BookRecommendation } from "@/types/ai";

const AI_MODE = {
  GENERAL: "general",
  FAVORITE_AUTHORS: "favoriteAuthors",
  SYNERGY: "synergy",
} as const;

const SYNERGY_TARGET = {
  BOOK: "book",
  AUTHOR: "author",
} as const;

const MODE_CONFIG = {
  [AI_MODE.GENERAL]: {
    label: "General",
    icon: "sparkles",
    description: "Balanced picks based on your overall profile.",
  },
  [AI_MODE.FAVORITE_AUTHORS]: {
    label: "Favorite Authors",
    icon: "person.3.fill",
    description: "Recommendations restricted to your top authors.",
  },
  [AI_MODE.SYNERGY]: {
    label: "Synergy",
    icon: "chart.xyaxis.line",
    description: "Analyze fit for one book or author.",
  },
} as const;

export default function AIScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<(typeof AI_MODE)[keyof typeof AI_MODE]>(
    AI_MODE.GENERAL,
  );

  const [synergyTarget, setSynergyTarget] = useState<
    (typeof SYNERGY_TARGET)[keyof typeof SYNERGY_TARGET]
  >(SYNERGY_TARGET.BOOK);
  const [synergyInput, setSynergyInput] = useState("");
  const [synergySelectedBookId, setSynergySelectedBookId] = useState<
    number | null
  >(null);
  const [synergySelectedAuthorId, setSynergySelectedAuthorId] = useState<
    number | null
  >(null);
  const [synergySelectionLabel, setSynergySelectionLabel] = useState("");
  const [synergyResolveError, setSynergyResolveError] = useState("");
  const [isResolvingSynergy, setIsResolvingSynergy] = useState(false);

  const generateRecommendations = useGenerateRecommendations();
  const generateFavoriteAuthorRecommendations =
    useGenerateFavoriteAuthorRecommendations();

  const activeRecommendationMutation = useMemo(
    () =>
      mode === AI_MODE.FAVORITE_AUTHORS
        ? generateFavoriteAuthorRecommendations
        : generateRecommendations,
    [mode, generateRecommendations, generateFavoriteAuthorRecommendations],
  );

  const bookSynergyQuery = useBookSynergy(
    synergySelectedBookId || 0,
    mode === AI_MODE.SYNERGY &&
      synergyTarget === SYNERGY_TARGET.BOOK &&
      !!synergySelectedBookId,
  );

  const authorSynergyQuery = useAuthorSynergy(
    synergySelectedAuthorId || 0,
    mode === AI_MODE.SYNERGY &&
      synergyTarget === SYNERGY_TARGET.AUTHOR &&
      !!synergySelectedAuthorId,
  );

  const activeSynergyQuery =
    synergyTarget === SYNERGY_TARGET.BOOK
      ? bookSynergyQuery
      : authorSynergyQuery;

  const recommendations =
    activeRecommendationMutation.data?.data?.recommendations;

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const resetSynergySelection = () => {
    setSynergySelectedBookId(null);
    setSynergySelectedAuthorId(null);
    setSynergySelectionLabel("");
  };

  const handleGenerateRecommendations = () => {
    if (mode === AI_MODE.FAVORITE_AUTHORS) {
      generateFavoriteAuthorRecommendations.mutate(3);
      return;
    }

    generateRecommendations.mutate();
  };

  const handleAddToVault = (recommendation: BookRecommendation) => {
    try {
      router.push({
        pathname: "/(tabs)/create-book",
        params: {
          prefillTitle: encodeURIComponent(recommendation.title || ""),
          prefillAuthor: encodeURIComponent(recommendation.author || ""),
          prefillSynopsis: encodeURIComponent(recommendation.synopsis || ""),
        },
      });
    } catch {
      router.push("/(tabs)/create-book");
    }
  };

  const getApiErrorMessage = (error: unknown): string => {
    if (error instanceof ApiError) {
      switch (error.code) {
        case "EMPTY_VAULT":
          return "You need to add some books to your vault first.";
        case "INSUFFICIENT_DATA":
          return "Your reader profile is not ready yet.";
        case "READER_PROFILE_MINIMUM_NOT_MET":
          return "At least 5 completed or abandoned books are required.";
        case "OPENAI_RATE_LIMIT":
          return "Too many requests. Please wait and try again.";
        case "OPENAI_TIMEOUT":
          return "The request timed out. Please try again.";
        case "OPENAI_UNAVAILABLE":
          return "AI service is temporarily unavailable.";
        default:
          return error.message || "Request failed.";
      }
    }

    return "An unexpected error occurred.";
  };

  const handleAnalyzeSynergy = async () => {
    const input = synergyInput.trim();

    if (!input) {
      setSynergyResolveError("Enter a book title or author name first.");
      return;
    }

    setSynergyResolveError("");
    setIsResolvingSynergy(true);

    try {
      if (synergyTarget === SYNERGY_TARGET.BOOK) {
        const response = await api.get<{
          success: boolean;
          data: { id: number; title: string }[];
        }>(
          `/api/books?titleSearch=${encodeURIComponent(input)}&page=1&limit=50`,
        );

        const match = response.data.find(
          (book) => normalize(book.title) === normalize(input),
        );

        if (!match) {
          resetSynergySelection();
          setSynergyResolveError(
            "Book not found. Please type the exact title from your vault.",
          );
          return;
        }

        const wasSameSelection = synergySelectedBookId === match.id;

        setSynergySelectedBookId(match.id);
        setSynergySelectedAuthorId(null);
        setSynergySelectionLabel(match.title);

        if (wasSameSelection) {
          await bookSynergyQuery.refetch();
        }
      } else {
        const response = await api.get<{
          success: boolean;
          data: { id: number; name: string }[];
        }>(`/api/authors?nameLike=${encodeURIComponent(input)}`);

        const match = response.data.find(
          (author) => normalize(author.name) === normalize(input),
        );

        if (!match) {
          resetSynergySelection();
          setSynergyResolveError(
            "Author not found. Please type the exact author name from your vault.",
          );
          return;
        }

        const wasSameSelection = synergySelectedAuthorId === match.id;

        setSynergySelectedAuthorId(match.id);
        setSynergySelectedBookId(null);
        setSynergySelectionLabel(match.name);

        if (wasSameSelection) {
          await authorSynergyQuery.refetch();
        }
      }
    } catch (error) {
      resetSynergySelection();
      setSynergyResolveError(getApiErrorMessage(error));
    } finally {
      setIsResolvingSynergy(false);
    }
  };

  const renderModeButton = (value: (typeof AI_MODE)[keyof typeof AI_MODE]) => {
    const config = MODE_CONFIG[value];

    return (
      <Pressable
        key={value}
        onPress={() => setMode(value)}
        style={({ pressed }) => ({
          minWidth: 160,
          flex: 1,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor:
            mode === value ? Interactive.primary.default : Border.default,
          backgroundColor:
            mode === value
              ? Feedback.info.background
              : pressed
                ? Background.elevated
                : Background.surface,
          gap: 8,
          borderCurve: "continuous",
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <IconSymbol
            name={config.icon}
            size={16}
            color={
              mode === value
                ? Interactive.primary.default
                : TextColors.secondary
            }
          />
          <Text
            style={{
              color:
                mode === value
                  ? Interactive.primary.default
                  : TextColors.primary,
              fontWeight: "700",
              fontSize: 13,
            }}
          >
            {config.label}
          </Text>
        </View>

        <Text
          style={{
            color: TextColors.secondary,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {config.description}
        </Text>
      </Pressable>
    );
  };

  const showRecommendationEmptyState =
    !activeRecommendationMutation.isPending &&
    !activeRecommendationMutation.error &&
    (!recommendations || recommendations.length === 0);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: Background.primary }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          backgroundColor: Background.surface,
          borderWidth: 1,
          borderColor: Border.default,
          borderRadius: 16,
          padding: 16,
          gap: 10,
          borderCurve: "continuous",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <IconSymbol
            name="wand.and.stars"
            size={20}
            color={Interactive.primary.default}
          />
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: TextColors.primary,
            }}
          >
            AI Workspace
          </Text>
        </View>

        <Text
          style={{
            fontSize: 14,
            lineHeight: 21,
            color: TextColors.secondary,
          }}
        >
          Use recommendation modes for discovery, or run a synergy check to
          understand how a specific book or author matches your profile.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: Background.surface,
          borderWidth: 1,
          borderColor: Border.default,
          borderRadius: 16,
          padding: 12,
          gap: 10,
          borderCurve: "continuous",
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: TextColors.secondary,
          }}
        >
          Select mode
        </Text>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {renderModeButton(AI_MODE.GENERAL)}
          {renderModeButton(AI_MODE.FAVORITE_AUTHORS)}
          {renderModeButton(AI_MODE.SYNERGY)}
        </View>
      </View>

      {mode !== AI_MODE.SYNERGY && (
        <>
          <View
            style={{
              backgroundColor: Feedback.info.background,
              borderWidth: 1,
              borderColor: Feedback.info.border,
              borderRadius: 12,
              padding: 12,
              gap: 6,
            }}
          >
            <Text
              style={{
                color: Feedback.info.text,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {mode === AI_MODE.FAVORITE_AUTHORS
                ? "Favorite Authors mode"
                : "General mode"}
            </Text>
            <Text style={{ color: TextColors.secondary, fontSize: 13 }}>
              {mode === AI_MODE.FAVORITE_AUTHORS
                ? "Results are filtered to books written by authors already strong in your profile."
                : "Results combine your reading pace, genres, and historical ratings."}
            </Text>
          </View>

          <Pressable
            onPress={handleGenerateRecommendations}
            disabled={activeRecommendationMutation.isPending}
            style={({ pressed }) => ({
              backgroundColor: pressed
                ? Interactive.primary.hover
                : Interactive.primary.default,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: activeRecommendationMutation.isPending ? 0.6 : 1,
              borderCurve: "continuous",
            })}
          >
            {activeRecommendationMutation.isPending ? (
              <ActivityIndicator size="small" color={TextColors.inverse} />
            ) : (
              <IconSymbol
                name="sparkles"
                size={20}
                color={TextColors.inverse}
              />
            )}
            <Text
              style={{
                color: TextColors.inverse,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              {mode === AI_MODE.FAVORITE_AUTHORS
                ? "Generate Favorite Author Picks"
                : "Generate Recommendations"}
            </Text>
          </Pressable>

          {activeRecommendationMutation.error && (
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: Feedback.error.background,
                borderWidth: 1,
                borderColor: Feedback.error.border,
                gap: 8,
              }}
            >
              <Text
                style={{
                  color: Feedback.error.text,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Recommendation request failed
              </Text>
              <Text selectable style={{ color: Feedback.error.text }}>
                {getApiErrorMessage(activeRecommendationMutation.error)}
              </Text>
            </View>
          )}

          {showRecommendationEmptyState && (
            <View
              style={{
                padding: 14,
                borderWidth: 1,
                borderColor: Border.default,
                backgroundColor: Background.surface,
                borderRadius: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: TextColors.primary, fontWeight: "700" }}>
                Ready when you are
              </Text>
              <Text style={{ color: TextColors.secondary, fontSize: 13 }}>
                Tap the button above to generate AI picks and add the best ones
                to your vault.
              </Text>
            </View>
          )}

          {recommendations?.map((recommendation, index) => (
            <RecommendationCard
              key={`${recommendation.title}-${index}`}
              recommendation={recommendation}
              onAddToVault={() => handleAddToVault(recommendation)}
              isLoading={false}
            />
          ))}

          {activeRecommendationMutation.data?.data && (
            <View
              style={{
                padding: 12,
                backgroundColor: Background.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: Border.default,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: TextColors.tertiary }}>
                Generated:{" "}
                {new Date(
                  activeRecommendationMutation.data.data.generatedAt,
                ).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: TextColors.tertiary }}>
                Mode: {activeRecommendationMutation.data.data.inputMode} •
                Tokens used: {activeRecommendationMutation.data.data.tokensUsed}
              </Text>
            </View>
          )}
        </>
      )}

      {mode === AI_MODE.SYNERGY && (
        <View style={{ gap: 12 }}>
          <View
            style={{
              backgroundColor: Feedback.info.background,
              borderWidth: 1,
              borderColor: Feedback.info.border,
              borderRadius: 12,
              padding: 12,
              gap: 6,
            }}
          >
            <Text
              style={{
                color: Feedback.info.text,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              Synergy analysis mode
            </Text>
            <Text style={{ color: TextColors.secondary, fontSize: 13 }}>
              Choose a target, type an exact name from your vault, then run
              analysis.
            </Text>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: TextColors.primary,
            }}
          >
            Analyze Synergy
          </Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => {
                setSynergyTarget(SYNERGY_TARGET.BOOK);
                setSynergyInput("");
                setSynergyResolveError("");
                resetSynergySelection();
              }}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor:
                  synergyTarget === SYNERGY_TARGET.BOOK
                    ? Interactive.primary.default
                    : Border.default,
                backgroundColor:
                  synergyTarget === SYNERGY_TARGET.BOOK
                    ? Feedback.info.background
                    : pressed
                      ? Background.elevated
                      : Background.surface,
                alignItems: "center",
                borderCurve: "continuous",
              })}
            >
              <Text
                style={{
                  color:
                    synergyTarget === SYNERGY_TARGET.BOOK
                      ? Interactive.primary.default
                      : TextColors.primary,
                  fontWeight: "600",
                }}
              >
                Book
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setSynergyTarget(SYNERGY_TARGET.AUTHOR);
                setSynergyInput("");
                setSynergyResolveError("");
                resetSynergySelection();
              }}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor:
                  synergyTarget === SYNERGY_TARGET.AUTHOR
                    ? Interactive.primary.default
                    : Border.default,
                backgroundColor:
                  synergyTarget === SYNERGY_TARGET.AUTHOR
                    ? Feedback.info.background
                    : pressed
                      ? Background.elevated
                      : Background.surface,
                alignItems: "center",
                borderCurve: "continuous",
              })}
            >
              <Text
                style={{
                  color:
                    synergyTarget === SYNERGY_TARGET.AUTHOR
                      ? Interactive.primary.default
                      : TextColors.primary,
                  fontWeight: "600",
                }}
              >
                Author
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              backgroundColor: Background.surface,
              borderWidth: 1,
              borderColor: Border.default,
              borderRadius: 12,
              padding: 12,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 14, color: TextColors.secondary }}>
              {synergyTarget === SYNERGY_TARGET.BOOK
                ? "Step 1: Type the exact title from your vault"
                : "Step 1: Type the exact author name from your vault"}
            </Text>
            <TextInput
              value={synergyInput}
              onChangeText={(value) => {
                setSynergyInput(value);
                setSynergyResolveError("");
              }}
              placeholder={
                synergyTarget === SYNERGY_TARGET.BOOK
                  ? "e.g., Don Quijote de la Mancha"
                  : "e.g., Gabriel Garcia Marquez"
              }
              placeholderTextColor={TextColors.tertiary}
              autoCapitalize="words"
              style={{
                height: 50,
                borderWidth: 1.5,
                borderColor: synergyResolveError
                  ? Feedback.error.border
                  : Border.default,
                borderRadius: 12,
                borderCurve: "continuous",
                paddingHorizontal: 14,
                backgroundColor: Background.surface,
                color: TextColors.primary,
              }}
            />

            <Text style={{ color: TextColors.tertiary, fontSize: 12 }}>
              Step 2: Tap Analyze Synergy to generate profile fit signals.
            </Text>
          </View>

          <Pressable
            onPress={handleAnalyzeSynergy}
            disabled={isResolvingSynergy}
            style={({ pressed }) => ({
              backgroundColor: pressed
                ? Interactive.primary.hover
                : Interactive.primary.default,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 12,
              alignItems: "center",
              opacity: isResolvingSynergy ? 0.6 : 1,
              borderCurve: "continuous",
            })}
          >
            {isResolvingSynergy ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator size="small" color={TextColors.inverse} />
                <Text
                  style={{
                    color: TextColors.inverse,
                    fontWeight: "600",
                    fontSize: 16,
                  }}
                >
                  Analyzing...
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  color: TextColors.inverse,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                Analyze Synergy
              </Text>
            )}
          </Pressable>

          {synergyResolveError ? (
            <View
              style={{
                borderRadius: 10,
                borderWidth: 1,
                borderColor: Feedback.error.border,
                backgroundColor: Feedback.error.background,
                padding: 12,
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: Feedback.error.text,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Could not resolve input
              </Text>
              <Text
                selectable
                style={{ color: Feedback.error.text, fontSize: 13 }}
              >
                {synergyResolveError}
              </Text>
            </View>
          ) : null}

          {synergySelectionLabel ? (
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: Feedback.info.border,
                backgroundColor: Feedback.info.background,
                alignSelf: "flex-start",
                paddingVertical: 6,
                paddingHorizontal: 12,
              }}
            >
              <Text
                style={{
                  color: Feedback.info.text,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                Selected: {synergySelectionLabel}
              </Text>
            </View>
          ) : null}

          {activeSynergyQuery.isLoading && (
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: Background.surface,
                borderWidth: 1,
                borderColor: Border.default,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ActivityIndicator size="small" color={TextColors.secondary} />
              <Text style={{ color: TextColors.secondary }}>
                Generating synergy analysis...
              </Text>
            </View>
          )}

          {activeSynergyQuery.error && (
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: Feedback.error.background,
                borderWidth: 1,
                borderColor: Feedback.error.border,
                gap: 8,
              }}
            >
              <Text
                style={{
                  color: Feedback.error.text,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Synergy request failed
              </Text>
              <Text selectable style={{ color: Feedback.error.text }}>
                {getApiErrorMessage(activeSynergyQuery.error)}
              </Text>
            </View>
          )}

          {synergyTarget === SYNERGY_TARGET.BOOK &&
            bookSynergyQuery.data?.data?.compatibility && (
              <AISynergyCard
                title="Book-to-Profile Fit"
                subtitle={synergySelectionLabel}
                compatibility={bookSynergyQuery.data.data.compatibility}
              />
            )}

          {synergyTarget === SYNERGY_TARGET.AUTHOR &&
            authorSynergyQuery.data?.data?.compatibility && (
              <AISynergyCard
                title="Author-to-Profile Fit"
                subtitle={synergySelectionLabel}
                compatibility={authorSynergyQuery.data.data.compatibility}
              />
            )}
        </View>
      )}
    </ScrollView>
  );
}
