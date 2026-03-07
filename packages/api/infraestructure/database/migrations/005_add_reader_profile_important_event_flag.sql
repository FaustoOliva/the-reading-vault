-- Migration: 005_add_reader_profile_important_event_flag.sql
-- Purpose: Add pending important event marker to ReaderProfiles
-- Date: March 7, 2026

ALTER TABLE ReaderProfiles
ADD important_event_pending BIT NOT NULL
    CONSTRAINT DF_ReaderProfiles_ImportantEventPending DEFAULT 0;
