export interface IReadingSessionRepository {
  addReadingSession(
    bookId: number,
    pagesRead: number,
    occurredAt: Date | null,
    readingCycle: number,
    tx?: any,
  ): Promise<number>;
}

export default IReadingSessionRepository;
