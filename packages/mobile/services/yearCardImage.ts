/**
 * Year Card Image Service
 * Renders the downloadable 1080x1920 annual story card on the client.
 *
 * Rules:
 * - Web only: no image service, no share SDK, no new dependencies
 * - Aggregate content only (year, four figures, wordmark). No titles,
 *   authors or scores: a story card must not silently publish library contents
 * - Primary content stays inside the central safe area so Instagram Story
 *   chrome does not cover it
 * - Every number is drawn with its text label
 */

import {
  Background,
  Border,
  Interactive,
  Text as TextColors,
} from "@/constants/colors";
import type { AnnualReadingSummary } from "@/hooks/useAnnualReadingSummary";

export const YEAR_CARD_WIDTH = 1080;
export const YEAR_CARD_HEIGHT = 1920;

const FONT_STACK =
  "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface YearCardData {
  year: number;
  booksFinished: number;
  pagesRead: number;
  readingDays: number;
  averagePagesPerDay: number | null;
}

/**
 * Build the aggregate-only card payload from the annual summary
 * @param summary - Annual reading summary
 * @returns Card data with no book-level detail
 */
export function buildYearCardData(summary: AnnualReadingSummary): YearCardData {
  return {
    year: summary.year,
    booksFinished: summary.books_finished,
    pagesRead: summary.pages_read,
    readingDays: summary.reading_days,
    averagePagesPerDay: summary.average_pages_per_day,
  };
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatValue(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return numberFormatter.format(value);
}

/**
 * Draw the vertical year card and return it as a PNG data URL
 * @param data - Aggregate card data
 * @returns PNG data URL
 */
export function createYearCardDataUrl(data: YearCardData): string {
  if (typeof document === "undefined") {
    throw new Error("Year card rendering is only available on web.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = YEAR_CARD_WIDTH;
  canvas.height = YEAR_CARD_HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D context is not available.");
  }

  // Background frame
  context.fillStyle = Background.primary;
  context.fillRect(0, 0, YEAR_CARD_WIDTH, YEAR_CARD_HEIGHT);

  // Accent line
  context.fillStyle = Interactive.primary.default;
  context.fillRect(0, 0, YEAR_CARD_WIDTH, 14);

  context.textAlign = "center";
  context.textBaseline = "alphabetic";

  // Eyebrow
  context.fillStyle = TextColors.tertiary;
  context.font = `700 34px ${FONT_STACK}`;
  context.fillText("READING YEAR", YEAR_CARD_WIDTH / 2, 470);

  // Year
  context.fillStyle = TextColors.primary;
  context.font = `800 240px ${FONT_STACK}`;
  context.fillText(String(data.year), YEAR_CARD_WIDTH / 2, 660);

  // Divider
  context.fillStyle = Border.default;
  context.fillRect(YEAR_CARD_WIDTH / 2 - 200, 740, 400, 3);

  const rows = [
    {
      value: formatValue(data.booksFinished),
      label: "books finished",
    },
    {
      value: formatValue(data.pagesRead),
      label: "pages read",
    },
    {
      value: formatValue(data.readingDays),
      label: "reading days",
    },
    {
      value: formatValue(data.averagePagesPerDay),
      label: "average pages per day",
    },
  ];

  rows.forEach((row, index) => {
    const numberBaseline = 880 + index * 160;

    context.fillStyle = Interactive.primary.default;
    context.font = `800 96px ${FONT_STACK}`;
    context.fillText(row.value, YEAR_CARD_WIDTH / 2, numberBaseline);

    context.fillStyle = TextColors.secondary;
    context.font = `500 38px ${FONT_STACK}`;
    context.fillText(row.label, YEAR_CARD_WIDTH / 2, numberBaseline + 56);
  });

  // Wordmark (inside the Story bottom chrome safe area)
  context.fillStyle = TextColors.primary;
  context.font = `700 42px ${FONT_STACK}`;
  context.fillText("THE READING VAULT", YEAR_CARD_WIDTH / 2, 1620);

  return canvas.toDataURL("image/png");
}

/**
 * Trigger a browser download for the rendered card
 * @param dataUrl - PNG data URL
 * @param year - Selected year, used in the file name
 */
export function downloadYearCardPng(dataUrl: string, year: number): void {
  if (typeof document === "undefined") {
    return;
  }

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `reading-vault-${year}-year-card.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
