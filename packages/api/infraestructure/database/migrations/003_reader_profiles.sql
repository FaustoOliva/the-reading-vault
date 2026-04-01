-- Migration: 003_reader_profiles.sql
-- Purpose: Create ReaderProfiles table for AI context and recommendations
-- Date: February 22, 2026
-- Phase: 4 - AI Integration (MVP)

-- Create ReaderProfiles table as singleton (only one profile per system)
-- Stores both structured profile data (JSON) and semantic summary (LLM-generated text)
CREATE TABLE ReaderProfiles (
    id INT PRIMARY KEY DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    schema_version INT NOT NULL DEFAULT 1, -- 1=MVP, 2=Complete (Phase 2)
    profile_data NVARCHAR(MAX) NOT NULL, -- JSON structure with reader statistics and preferences
    semantic_summary NVARCHAR(MAX) NULL, -- OpenAI-generated narrative summary
    last_updated DATETIME2 NOT NULL DEFAULT GETDATE(),
    last_refresh_reason NVARCHAR(100) NULL, -- 'book_completed', 'book_abandoned', 'top_authors_changed', 'stale_profile', 'manual'
    tokens_used INT NULL, -- Track OpenAI token usage per refresh
    
    CONSTRAINT CHK_ReaderProfiles_Singleton CHECK (id = 1)
);

-- Index to optimize version tracking and profile retrieval
CREATE NONCLUSTERED INDEX IX_ReaderProfiles_Version 
ON ReaderProfiles(version DESC);

-- Note: Profile is a singleton (single reader system)
-- Note: schema_version enables evolutionary upgrade from MVP to Complete profile
-- Note: Graceful degradation: semantic_summary can be NULL if OpenAI unavailable
