import { Author } from "../entities/Author";

/**
 * Author Repository Interface
 * 
 * Defines operations for author persistence following Clean Architecture.
 * Implementations should handle database-specific logic.
 */
export interface IAuthorRepository {
  /**
   * Find an author by exact name match.
   * @param name - Author name to search for
   * @returns Author entity or null if not found
   */
  findByName(name: string): Promise<Author | null>;

  /**
   * Create a new author.
   * @param author - Author entity to persist
   * @returns Inserted author ID
   */
  create(author: Author): Promise<number>;
}
