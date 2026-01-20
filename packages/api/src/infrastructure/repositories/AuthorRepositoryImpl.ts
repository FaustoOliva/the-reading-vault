import { IAuthorRepository } from "../../domain/repositories/IAuthorRepository";
import { Author } from "../../domain/entities/Author";
import DatabaseConfig from "../database/DatabaseConfig";

/**
 * Author Repository Implementation
 * 
 * Handles SQL Server persistence for Author entities.
 * Implements deduplication logic for author management.
 */
export class AuthorRepositoryImpl implements IAuthorRepository {
  async findByName(name: string): Promise<Author | null> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("name", name)
      .query(`SELECT id, name, nationality FROM Authors WHERE name = @name`);

    if (!result.recordset || result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return new Author({
      id: row.id,
      name: row.name,
      nationality: row.nationality,
    });
  }

  async create(author: Author): Promise<number> {
    const pool = await DatabaseConfig.getPool();
    const result = await pool
      .request()
      .input("name", author.name)
      .input("nationality", author.nationality ?? null)
      .query(
        `INSERT INTO Authors (name, nationality) 
         OUTPUT INSERTED.id 
         VALUES (@name, @nationality)`
      );

    if (!result.recordset || result.recordset.length === 0) {
      throw new Error("Failed to create author");
    }

    return result.recordset[0].id;
  }
}

export default AuthorRepositoryImpl;
