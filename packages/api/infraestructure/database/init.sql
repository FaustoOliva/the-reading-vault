-- V. 1.5.0 - Added enriched book metadata fields for AI-assisted cataloging
-- V. 1.4.0 - Added ReaderProfiles table for Phase 4 (AI Integration - MVP)
-- V. 1.3.0 - Added filter indexes for Phase 3 (Advanced Filtering & Search)
-- Create Database if not exists
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TheReadingVault')
BEGIN
    CREATE DATABASE TheReadingVault;
END
GO

USE TheReadingVault;
GO

-- 1. Countries Table
CREATE TABLE Countries (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(40) NOT NULL UNIQUE
);

-- 2. Authors Table 
CREATE TABLE Authors (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(255) NOT NULL UNIQUE,
    nationality_id INT NULL 

    CONSTRAINT FK_Authors_Countries FOREIGN KEY (nationality_id) REFERENCES Countries(id)
);

-- 3. Reference Table for Statuses
CREATE TABLE BookStatuses (
    id INT PRIMARY KEY IDENTITY(1,1),
    internal_code NVARCHAR(50) NOT NULL UNIQUE, -- 'WISH_LIST', 'READING', etc.
    display_name NVARCHAR(100) NOT NULL,        -- 'Wish List', 'Reading'
    ui_color NVARCHAR(7) NULL                   -- HEX code for the App
);

-- 3.1 BookTypes Table (Master reference for editorial classifications)
CREATE TABLE BookTypes (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100) NOT NULL UNIQUE,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- 4. Books Table 
CREATE TABLE Books (
    id INT PRIMARY KEY IDENTITY(1,1),
    author_id INT NOT NULL,
    status_id INT NOT NULL, -- FK to BookStatuses
    book_type_id INT NULL,  -- FK to BookTypes (0..1 relationship, editorial classification)
    title NVARCHAR(255) NOT NULL,
    isbn NVARCHAR(20) NULL,
    total_pages INT NULL,
    publication_year INT NULL,
    synopsis NVARCHAR(4000) NULL,
    current_reading_cycle INT NOT NULL DEFAULT 1,
    score DECIMAL(3,1) NULL,
    comment NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_Books_Authors FOREIGN KEY (author_id) REFERENCES Authors(id),
    CONSTRAINT FK_Books_Statuses FOREIGN KEY (status_id) REFERENCES BookStatuses(id),
    CONSTRAINT FK_Books_BookTypes FOREIGN KEY (book_type_id) REFERENCES BookTypes(id) ON DELETE SET NULL,
    CONSTRAINT CHK_Score CHECK (score >= 0 AND score <= 10),
    CONSTRAINT CHK_Books_PublicationYear CHECK (publication_year IS NULL OR (publication_year >= 1000 AND publication_year <= 9999))
);

-- 4.1 Genres Table
CREATE TABLE Genres (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100) NOT NULL UNIQUE
);

-- 4.2 BookGenres Junction Table (0..N from Book to Genre)
CREATE TABLE BookGenres (
    book_id INT NOT NULL,
    genre_id INT NOT NULL,

    CONSTRAINT PK_BookGenres PRIMARY KEY (book_id, genre_id),
    CONSTRAINT FK_BookGenres_Books FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
    CONSTRAINT FK_BookGenres_Genres FOREIGN KEY (genre_id) REFERENCES Genres(id) ON DELETE CASCADE
);

-- 5. ReadingSessions Table (Optimized with Index)
CREATE TABLE ReadingSessions (
    id INT PRIMARY KEY IDENTITY(1,1),
    book_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    occurred_at DATETIME NOT NULL DEFAULT GETDATE(),
    pages_read INT NOT NULL,
    reading_cycle INT NOT NULL DEFAULT 1,
    duration INT NULL, -- Duration in minutes

    CONSTRAINT FK_Sessions_Books FOREIGN KEY (book_id) REFERENCES Books(id)
);

-- 6. Table to track state transitions (History/Audit Trail)
CREATE TABLE BookStatusHistory (
    id INT PRIMARY KEY IDENTITY(1,1),
    book_id INT NOT NULL,
    old_status_id INT NULL,
    new_status_id INT NOT NULL,
    reading_cycle INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_History_Books FOREIGN KEY (book_id) REFERENCES Books(id),
    CONSTRAINT FK_History_OldStatus FOREIGN KEY (old_status_id) REFERENCES BookStatuses(id),
    CONSTRAINT FK_History_NewStatus FOREIGN KEY (new_status_id) REFERENCES BookStatuses(id)
);
GO

-- 7. ReaderProfiles Table (AI Context - Phase 4 MVP)
CREATE TABLE ReaderProfiles (
    id INT PRIMARY KEY DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    schema_version INT NOT NULL DEFAULT 1, -- 1=MVP, 2=Complete (Phase 2)
    profile_data NVARCHAR(MAX) NOT NULL, -- JSON structure with reader statistics and preferences
    semantic_summary NVARCHAR(MAX) NULL, -- OpenAI-generated narrative summary
    last_updated DATETIME2 NOT NULL DEFAULT GETDATE(),
    last_refresh_reason NVARCHAR(100) NULL, -- 'book_completed', 'book_abandoned', 'top_authors_changed', etc.
    tokens_used INT NULL, -- Track OpenAI token usage per refresh
    
    CONSTRAINT CHK_ReaderProfiles_Singleton CHECK (id = 1)
);
GO

-- Index for performance in time-series queries
CREATE INDEX IX_StatusHistory_BookDate ON BookStatusHistory (book_id, created_at);

-- Index to optimize KPI calculations
CREATE INDEX IX_ReadingSessions_BookDate ON ReadingSessions (book_id, occurred_at) INCLUDE (pages_read, reading_cycle);

-- Index to optimize version tracking for reader profile
CREATE NONCLUSTERED INDEX IX_ReaderProfiles_Version ON ReaderProfiles(version DESC);

-- Indexes for advanced filtering and search (Phase 3)
CREATE NONCLUSTERED INDEX IX_Books_Title ON Books(title);
CREATE NONCLUSTERED INDEX IX_Books_Score ON Books(score) WHERE score IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_Books_TotalPages ON Books(total_pages) WHERE total_pages IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_Books_BookTypeId ON Books(book_type_id);
CREATE NONCLUSTERED INDEX IX_BookGenres_GenreId ON BookGenres(genre_id);
GO

-- Insert Initial Statuses
INSERT INTO BookStatuses (internal_code, display_name, ui_color) VALUES 
('WISH_LIST', 'Wish List', '#FFA500'),
('READING', 'Reading', '#007BFF'),
('PENDING_SCORE', 'Pending Score', '#F59E0B'),
('COMPLETED', 'Completed', '#28A745'),
('ABANDONED', 'Abandoned', '#DC3545');

-- Insert Predefined BookTypes
INSERT INTO BookTypes (name) VALUES 
('Novel'),
('Memoir'),
('Anthology'),
('Short-Story Collection'),
('Poetry'),
('Non-Fiction'),
('Biography'),
('Essay Collection'),
('Self-Help'),
('History');