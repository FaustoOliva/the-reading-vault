-- The Reading Vault - PostgreSQL Schema
-- V. 1.4.0 - Converted from SQL Server to PostgreSQL
-- V. 1.3.0 - Added filter indexes for Phase 3 (Advanced Filtering & Search)
-- V. 1.2.0 - Added ReaderProfiles table for Phase 4 (AI Integration - MVP)

-- 1. Countries Table
CREATE TABLE IF NOT EXISTS Countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(40) NOT NULL UNIQUE
);

-- 2. Authors Table 
CREATE TABLE IF NOT EXISTS Authors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    nationality_id INT NULL,
    CONSTRAINT FK_Authors_Countries FOREIGN KEY (nationality_id) REFERENCES Countries(id) ON DELETE SET NULL
);

-- 3. Reference Table for Statuses
CREATE TABLE IF NOT EXISTS BookStatuses (
    id SERIAL PRIMARY KEY,
    internal_code VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    ui_color VARCHAR(7) NULL
);

-- 4. Books Table 
CREATE TABLE IF NOT EXISTS Books (
    id SERIAL PRIMARY KEY,
    author_id INT NOT NULL,
    status_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) NULL,
    total_pages INT NULL,
    current_reading_cycle INT NOT NULL DEFAULT 1,
    score DECIMAL(3,1) NULL,
    comment TEXT NULL,
    
    CONSTRAINT FK_Books_Authors FOREIGN KEY (author_id) REFERENCES Authors(id) ON DELETE CASCADE,
    CONSTRAINT FK_Books_Statuses FOREIGN KEY (status_id) REFERENCES BookStatuses(id) ON DELETE RESTRICT,
    CONSTRAINT CHK_Score CHECK (score >= 0 AND score <= 10)
);

-- 5. ReadingSessions Table
CREATE TABLE IF NOT EXISTS ReadingSessions (
    id SERIAL PRIMARY KEY,
    book_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
    pages_read INT NOT NULL,
    reading_cycle INT NOT NULL DEFAULT 1,
    duration INT NULL,
    
    CONSTRAINT FK_Sessions_Books FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE
);

-- 6. BookStatusHistory Table (History/Audit Trail)
CREATE TABLE IF NOT EXISTS BookStatusHistory (
    id SERIAL PRIMARY KEY,
    book_id INT NOT NULL,
    old_status_id INT NULL,
    new_status_id INT NOT NULL,
    reading_cycle INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT FK_History_Books FOREIGN KEY (book_id) REFERENCES Books(id) ON DELETE CASCADE,
    CONSTRAINT FK_History_OldStatus FOREIGN KEY (old_status_id) REFERENCES BookStatuses(id) ON DELETE SET NULL,
    CONSTRAINT FK_History_NewStatus FOREIGN KEY (new_status_id) REFERENCES BookStatuses(id) ON DELETE RESTRICT
);

-- 7. ReaderProfiles Table (AI Context - Phase 4 MVP)
CREATE TABLE IF NOT EXISTS ReaderProfiles (
    id INT PRIMARY KEY DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    schema_version INT NOT NULL DEFAULT 1,
    profile_data TEXT NOT NULL,
    semantic_summary TEXT NULL,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    last_refresh_reason VARCHAR(100) NULL,
    tokens_used INT NULL,
    
    CONSTRAINT CHK_ReaderProfiles_Singleton CHECK (id = 1)
);

-- === INDEXES ===

-- Index for performance in time-series queries
CREATE INDEX IF NOT EXISTS IX_StatusHistory_BookDate ON BookStatusHistory (book_id, created_at);

-- Index to optimize KPI calculations
CREATE INDEX IF NOT EXISTS IX_ReadingSessions_BookDate ON ReadingSessions (book_id, occurred_at);

-- Index to optimize version tracking for reader profile
CREATE INDEX IF NOT EXISTS IX_ReaderProfiles_Version ON ReaderProfiles(version DESC);

-- Indexes for advanced filtering and search (Phase 3)
CREATE INDEX IF NOT EXISTS IX_Books_Title ON Books(title);
CREATE INDEX IF NOT EXISTS IX_Books_Score ON Books(score) WHERE score IS NOT NULL;
CREATE INDEX IF NOT EXISTS IX_Books_TotalPages ON Books(total_pages) WHERE total_pages IS NOT NULL;

-- === INITIAL DATA ===

-- Insert Initial Statuses (only if not exists)
INSERT INTO BookStatuses (internal_code, display_name, ui_color) 
VALUES 
    ('WISH_LIST', 'Wish List', '#FFA500'),
    ('READING', 'Reading', '#007BFF'),
    ('PENDING_SCORE', 'Pending Score', '#F59E0B'),
    ('COMPLETED', 'Completed', '#28A745'),
    ('ABANDONED', 'Abandoned', '#DC3545')
ON CONFLICT (internal_code) DO NOTHING;
