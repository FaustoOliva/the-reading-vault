export interface IBookStatusHistoryRepository {
  /**
   * Record a status transition.
   *
   * @param bookId - Book identifier
   * @param oldStatusId - Previous status ID (null for new books)
   * @param newStatusId - New status ID
   * @param readingCycle - Current reading cycle
   * @param reason - Trigger reason (e.g., "USER_LOG_SESSION", "COMPLETED_AUTO_TRANSITION")
   * @param tx - Optional transaction context
   */
  recordTransition(
    bookId: number,
    oldStatusId: number | null,
    newStatusId: number,
    readingCycle: number,
    reason: string,
    tx?: any,
  ): Promise<number>;
}

export default IBookStatusHistoryRepository;
