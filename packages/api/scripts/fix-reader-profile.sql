-- Fix corrupted reader profile data
-- Run this if you get JSON parse errors

-- Option 1: Delete corrupted profile (will be recreated on next server start)
DELETE FROM ReaderProfiles WHERE id = 1;

-- Option 2: Check current data
-- SELECT 
--   id,
--   version,
--   schema_version,
--   profile_data,
--   semantic_summary,
--   last_updated,
--   last_refresh_reason,
--   tokens_used
-- FROM ReaderProfiles;
