export interface IReadingSessionRepository {
  addReadingSession(bookId: number, pagesRead: number): Promise<number>;
}

export default IReadingSessionRepository;
