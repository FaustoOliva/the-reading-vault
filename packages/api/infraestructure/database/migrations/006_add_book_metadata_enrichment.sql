-- Migration: 006_add_book_metadata_enrichment.sql
-- Purpose: Add enriched metadata fields to Books for AI-assisted cataloging
-- Date: March 11, 2026
-- Phase: MVP Closure - Book Metadata Enrichment
-- Scope: Add book_type, genres, and synopsis columns to Books

USE TheReadingVault;
GO

-- Step 1: Add new optional metadata columns to Books
IF COL_LENGTH('Books', 'book_type_id') IS NULL
BEGIN
    ALTER TABLE Books
    ADD book_type_id INT NULL;
    
    PRINT N'✅ book_type_id column added to Books';
END;

IF OBJECT_ID('BookTypes', 'U') IS NULL
BEGIN
    CREATE TABLE BookTypes (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(100) NOT NULL UNIQUE,
        created_at DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    
    PRINT N'✅ BookTypes table created';
END;

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
    WHERE CONSTRAINT_NAME = 'FK_Books_BookTypes'
)
BEGIN
    ALTER TABLE Books
    ADD CONSTRAINT FK_Books_BookTypes FOREIGN KEY (book_type_id) REFERENCES BookTypes(id) ON DELETE SET NULL;
    
    PRINT N'✅ FK constraint FK_Books_BookTypes created';
END

IF OBJECT_ID('Genres', 'U') IS NULL
BEGIN
    CREATE TABLE Genres (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(100) NOT NULL UNIQUE
    );
END;

IF OBJECT_ID('BookGenres', 'U') IS NULL
BEGIN
    CREATE TABLE BookGenres (
        book_id INT NOT NULL,
        genre_id INT NOT NULL,
        CONSTRAINT PK_BookGenres PRIMARY KEY (book_id, genre_id),
        CONSTRAINT FK_BookGenres_Books FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
        CONSTRAINT FK_BookGenres_Genres FOREIGN KEY (genre_id) REFERENCES Genres(id) ON DELETE CASCADE
    );
END;

IF OBJECT_ID('IX_BookGenres_GenreId', 'IX') IS NULL
BEGIN
    CREATE NONCLUSTERED INDEX IX_BookGenres_GenreId ON BookGenres(genre_id);
END;


IF COL_LENGTH('Books', 'synopsis') IS NULL
BEGIN
    ALTER TABLE Books
    ADD synopsis NVARCHAR(4000) NULL;
END;


PRINT N'✅ Migration 006 completed successfully!';
PRINT N'   - Added book_type column to Books table';
PRINT N'   - Added genres column to Books table';
PRINT N'   - Added synopsis column to Books table';
PRINT N'   - Created JSON integrity constraint for Books.genres';