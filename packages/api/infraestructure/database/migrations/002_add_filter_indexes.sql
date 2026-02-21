-- Migration: 002_add_filter_indexes.sql
-- Purpose: Add indexes to optimize advanced filtering and search operations
-- Date: February 21, 2026
-- Phase: 3 - Advanced Filtering & Search

-- Enable ability to search books by title efficiently
-- LIKE queries will benefit from this index on title column
CREATE NONCLUSTERED INDEX IX_Books_Title 
ON Books(title);

-- Optimize filtering by score/rating
-- WHERE score >= X or score BETWEEN X AND Y queries will use this index
-- Partial index (WHERE score IS NOT NULL) to exclude unrated books
CREATE NONCLUSTERED INDEX IX_Books_Score 
ON Books(score) 
WHERE score IS NOT NULL;

-- Optimize filtering by total pages
-- WHERE total_pages >= X or total_pages BETWEEN X AND Y queries will use this index
-- Partial index (WHERE total_pages IS NOT NULL) to exclude books with unknown page count
CREATE NONCLUSTERED INDEX IX_Books_TotalPages 
ON Books(total_pages) 
WHERE total_pages IS NOT NULL;

-- Note: Country filtering will use existing FK_Books_Authors -> FK_Authors_Countries path
-- Note: Date filtering will use BookStatusHistory.created_at (already indexed via PK)
-- Note: Author filtering already has FK_Books_Authors index
