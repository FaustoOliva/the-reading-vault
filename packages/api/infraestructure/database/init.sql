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

-- 4. Books Table 
CREATE TABLE Books (
    id INT PRIMARY KEY IDENTITY(1,1),
    author_id INT NOT NULL,
    status_id INT NOT NULL, -- FK to BookStatuses
    title NVARCHAR(255) NOT NULL,
    isbn NVARCHAR(20) NULL,
    total_pages INT NULL,
    current_reading_cycle INT NOT NULL DEFAULT 1,
    score DECIMAL(3,1) NULL,
    comment NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_Books_Authors FOREIGN KEY (author_id) REFERENCES Authors(id),
    CONSTRAINT FK_Books_Statuses FOREIGN KEY (status_id) REFERENCES BookStatuses(id),
    CONSTRAINT CHK_Score CHECK (score >= 0 AND score <= 10)
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

-- Index for performance in time-series queries
CREATE INDEX IX_StatusHistory_BookDate ON BookStatusHistory (book_id, created_at);

-- Index to optimize KPI calculations
CREATE INDEX IX_ReadingSessions_BookDate ON ReadingSessions (book_id, occurred_at) INCLUDE (pages_read, reading_cycle);

-- Indexes for advanced filtering and search (Phase 3)
CREATE NONCLUSTERED INDEX IX_Books_Title ON Books(title);
CREATE NONCLUSTERED INDEX IX_Books_Score ON Books(score) WHERE score IS NOT NULL;
CREATE NONCLUSTERED INDEX IX_Books_TotalPages ON Books(total_pages) WHERE total_pages IS NOT NULL;
GO

-- Insert Initial Statuses
INSERT INTO BookStatuses (internal_code, display_name, ui_color) VALUES 
('WISH_LIST', 'Wish List', '#FFA500'),
('READING', 'Reading', '#007BFF'),
('PENDING_SCORE', 'Pending Score', '#F59E0B'),
('COMPLETED', 'Completed', '#28A745'),
('ABANDONED', 'Abandoned', '#DC3545');