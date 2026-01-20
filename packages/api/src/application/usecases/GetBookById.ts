import { IBookRepository } from "../../domain/repositories/IBookRepository";
import { BookNotFoundException } from "../../domain/exceptions/BookNotFoundException";
import { KPICalculator } from "../utils/KPICalculator";

export interface BookDetailOutput {
  id: number;
  title: string;
  author_name: string;
  isbn: string | null;
  total_pages: number | null;
  status: string;
  ui_color: string;
  current_reading_cycle: number;
  score: number | null;
  comment: string | null;
  kpis: {
    velocity_current_cycle: number;
    velocity_7_day: number;
    velocity_30_day: number;
    estimated_completion_date: string | null;
    reading_streak: number;
    total_sessions_in_cycle: number;
    pages_read_in_cycle: number;
    remaining_pages: number | null;
  };
}

/**
 * GetBookById Use Case
 * 
 * Fetches complete book details including:
 * - Basic book information (title, author, isbn, etc.)
 * - Current status and cycle information
 * - Comprehensive KPI calculations for the current reading cycle
 * 
 * KPI Engine calculates:
 * - velocity_current_cycle: Total pages in cycle / Days elapsed (Day 0 = 1)
 * - estimated_completion_date: Based on current velocity and remaining pages
 * - reading_streak: Consecutive days with at least one session
 * - total_sessions_in_cycle: Count of all sessions in current cycle
 */
export class GetBookByIdUseCase {
  constructor(private bookRepo: IBookRepository) {}

  async execute(bookId: number): Promise<BookDetailOutput> {
    // Fetch book entity
    const book = await this.bookRepo.findById(bookId);

    if (!book) {
      throw new BookNotFoundException(bookId);
    }

    const currentCycle = book.current_cycle ?? 1;

    // Calculate all KPIs for current reading cycle
    const [
      velocityCurrentCycle,
      velocity7Day,
      velocity30Day,
      readingStreak,
      totalSessions,
      pagesReadInCycle,
    ] = await Promise.all([
      KPICalculator.calculateCurrentCycleVelocity(bookId, currentCycle),
      KPICalculator.calculate7DayVelocity(bookId, currentCycle),
      KPICalculator.calculate30DayVelocity(bookId, currentCycle),
      KPICalculator.calculateReadingStreak(bookId, currentCycle),
      KPICalculator.getTotalSessionsInCycle(bookId, currentCycle),
      this.bookRepo.getTotalPagesRead(bookId, currentCycle),
    ]);

    // Calculate remaining pages and estimated completion
    const remainingPages = book.total_pages
      ? Math.max(0, book.total_pages - pagesReadInCycle)
      : null;

    const estimatedCompletionDate =
      remainingPages !== null && remainingPages > 0
        ? KPICalculator.calculateEstimatedCompletionDate(
            remainingPages,
            velocityCurrentCycle
          )
        : null;

    return {
      id: book.id!,
      title: book.title,
      author_name: book.author_name ?? "Unknown Author",
      isbn: book.isbn ?? null,
      total_pages: book.total_pages ?? null,
      status: book.status_name ?? "Unknown",
      ui_color: book.ui_color ?? "#000000",
      current_reading_cycle: currentCycle,
      score: book.score ?? null,
      comment: book.comment ?? null,
      kpis: {
        velocity_current_cycle: velocityCurrentCycle,
        velocity_7_day: velocity7Day,
        velocity_30_day: velocity30Day,
        estimated_completion_date: estimatedCompletionDate
          ? estimatedCompletionDate.toISOString().split("T")[0]
          : null,
        reading_streak: readingStreak,
        total_sessions_in_cycle: totalSessions,
        pages_read_in_cycle: pagesReadInCycle,
        remaining_pages: remainingPages,
      },
    };
  }
}

export default GetBookByIdUseCase;
