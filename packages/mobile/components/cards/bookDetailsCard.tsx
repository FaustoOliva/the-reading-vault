import { View, Text, Pressable } from "react-native";
import { BookDetails } from "@/types/book";
import { CountryFlag } from "@/components/ui/countryFlag";
import {
  Background,
  Text as TextColors,
  Border,
  Interactive,
} from "@/constants/colors";

interface BookDetailsCardProps {
  book: BookDetails["book"];
  onEdit?: () => void;
  isActionPending?: boolean;
}

export function BookDetailsCard({
  book,
  onEdit,
  isActionPending = false,
}: BookDetailsCardProps) {
  const compactDetails = [
    book.author?.name ?? "Unknown",
    book.publicationYear !== null ? String(book.publicationYear) : null,
    book.total_pages !== null
      ? `${book.total_pages.toLocaleString()} pages`
      : null,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <View
      style={{
        backgroundColor: Background.surface,
        padding: 16,
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: Border.default,
        borderCurve: "continuous",
      }}
    >
      <Text
        style={{ fontSize: 18, fontWeight: "700", color: TextColors.primary }}
      >
        Book Details
      </Text>

      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: 15, color: TextColors.primary }}>
          {compactDetails}
        </Text>

        {book.author?.nationality && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <CountryFlag
              isoCode={book.author.countryIsoCode}
              size="small"
              countryName={book.author.nationality}
            />
            <Text style={{ fontSize: 13, color: TextColors.secondary }}>
              {book.author.nationality}
            </Text>
          </View>
        )}
      </View>

      {book.isbn && (
        <Text style={{ fontSize: 12, color: TextColors.tertiary }} selectable>
          ISBN: {book.isbn}
        </Text>
      )}

      {book.bookType && (
        <Text style={{ fontSize: 13, color: TextColors.secondary }}>
          Type: {book.bookType}
        </Text>
      )}

      {book.genres && book.genres.length > 0 && (
        <Text style={{ fontSize: 13, color: TextColors.secondary }}>
          Genres: {book.genres.join(", ")}
        </Text>
      )}

      {book.synopsis && (
        <Text
          style={{ fontSize: 13, color: TextColors.secondary, lineHeight: 20 }}
        >
          {book.synopsis}
        </Text>
      )}

      {onEdit && (
        <Pressable
          onPress={onEdit}
          disabled={isActionPending}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            backgroundColor: pressed
              ? Interactive.secondary.pressed
              : Interactive.secondary.default,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: Interactive.secondary.border,
            borderCurve: "continuous",
            opacity: isActionPending ? 0.5 : 1,
          })}
        >
          <Text
            style={{
              color: Interactive.secondary.text,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Edit
          </Text>
        </Pressable>
      )}
    </View>
  );
}
