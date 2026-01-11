import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * MIGRATION SCRIPT: YAML to SQL
 * Follows Clean Architecture and Type Safety standards.
 * Outputs a .sql file for manual review.
 */

interface RawBook {
  titulo: string;
  autor: string;
  puntaje: number | string | null;
  comentario: string;
}

interface YamlData {
  libros: RawBook[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../Libros.yaml');
const OUTPUT_FILE = path.join(__dirname, '../packages/api/database/migration_data.sql');

// Helper to escape single quotes in SQL strings
const escapeSql = (str: string | null) => str ? str.replace(/'/g, "''") : 'NULL';

// Business Logic to map YAML comments/scores to Database Statuses
const mapStatus = (book: RawBook): string => {
  const comment = (book.comentario ?? '').toLowerCase();
  if (comment.includes('no lo termine') || comment.includes('abandonado')) {
    return 'ABANDONED';
  }
  if (book.puntaje !== null && book.puntaje !== 'null') {
    return 'COMPLETED';
  }
  return 'WISH_LIST'; // Default fallback
};

function generateSql() {
  try {
    const fileContents = fs.readFileSync(INPUT_FILE, 'utf8');
    const data = yaml.load(fileContents) as YamlData;

    let sqlOutput = `-- Migration Data Generated on ${new Date().toISOString()}\n`;
    sqlOutput += `USE TheReadingVault;\nGO\n\n`;

    // 1. Extract Unique Authors
    const authors = Array.from(new Set(data.libros.map(b => b.autor)));
    
    sqlOutput += `-- INSERTING AUTHORS\n`;
    authors.forEach(author => {
      sqlOutput += `IF NOT EXISTS (SELECT 1 FROM Authors WHERE name = '${escapeSql(author)}') 
      INSERT INTO Authors (name, nationality) VALUES ('${escapeSql(author)}', NULL);\n`;
    });

    sqlOutput += `\n-- INSERTING BOOKS AND INITIAL HISTORY\n`;

    data.libros.forEach(book => {
      const statusCode = mapStatus(book);
      const score = (book.puntaje === 'null' || book.puntaje === null) ? 'NULL' : book.puntaje;

      // SQL Logic: Find Author ID, Find Status ID, Insert Book, then Log History
      sqlOutput += `
      BEGIN
        DECLARE @AuthorId INT = (SELECT id FROM Authors WHERE name = '${escapeSql(book.autor)}');
        DECLARE @StatusId INT = (SELECT id FROM BookStatuses WHERE internal_code = '${statusCode}');
        
        INSERT INTO Books (author_id, status_id, title, score, comment)
        VALUES (@AuthorId, @StatusId, '${escapeSql(book.titulo)}', ${score}, '${escapeSql(book.comentario)}');
        
        DECLARE @BookId INT = SCOPE_IDENTITY();
        
        -- Initial history entry
        INSERT INTO BookStatusHistory (book_id, old_status_id, new_status_id)
        VALUES (@BookId, NULL, @StatusId);
      END
      GO\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, sqlOutput);
    console.log(`✅ Success! Migration SQL generated at: ${OUTPUT_FILE}`);
    console.log(`🚀 Next step: Review the file and execute it in SQL Server.`);

  } catch (e) {
    console.error(`❌ Error generating migration SQL: ${e}`);
  }
}

generateSql();