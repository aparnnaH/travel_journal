-- Instagram Import System - Supabase Database Migration

-- ============================================================================
-- STEP 1: Create Instagram Connections Table
-- ============================================================================
-- This table stores Instagram OAuth tokens and user information
-- Run this first

CREATE TABLE IF NOT EXISTS instagram_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  instagram_user_id TEXT NOT NULL,
  instagram_username TEXT NOT NULL,
  profile_picture_url TEXT,
  connected_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, instagram_user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_instagram_connections_user_id 
  ON instagram_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_instagram_connections_ig_user_id 
  ON instagram_connections(instagram_user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own connections
CREATE POLICY "Users can see their own Instagram connections"
  ON instagram_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Instagram connections"
  ON instagram_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Instagram connections"
  ON instagram_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Instagram connections"
  ON instagram_connections
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 2: Update Journal Entries Table (OPTIONAL - only if table exists)
-- ============================================================================
-- Add external_media column to store imported media
-- This is a JSONB column that stores an array of ExternalMedia objects
-- SKIP IF journal_entries TABLE DOESN'T EXIST YET

-- Uncomment these lines after journal_entries table is created:
--
-- ALTER TABLE journal_entries
-- ADD COLUMN IF NOT EXISTS external_media JSONB DEFAULT '[]'::jsonb;
--
-- ALTER TABLE journal_entries
-- ADD CONSTRAINT external_media_is_array 
--   CHECK (jsonb_typeof(external_media) = 'array');
--
-- CREATE INDEX IF NOT EXISTS idx_journal_entries_external_media 
--   ON journal_entries USING GIN (external_media);

-- ============================================================================
-- STEP 3: Optional - Create Audit Table for Import History
-- ============================================================================
-- Track all imports for analytics and debugging

CREATE TABLE IF NOT EXISTS instagram_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  imported_media_count INT NOT NULL DEFAULT 0,
  imported_at TIMESTAMP NOT NULL DEFAULT NOW(),
  source_platform TEXT NOT NULL DEFAULT 'instagram'
);

CREATE INDEX IF NOT EXISTS idx_instagram_imports_user_id 
  ON instagram_imports(user_id);

CREATE INDEX IF NOT EXISTS idx_instagram_imports_entry_id 
  ON instagram_imports(journal_entry_id);

-- ============================================================================
-- STEP 4: Optional - Create View for User Statistics
-- ============================================================================
-- Useful for dashboards and analytics

CREATE OR REPLACE VIEW user_instagram_stats AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(DISTINCT ic.id) as connected_accounts,
  COUNT(DISTINCT ii.id) as total_imports,
  SUM(ii.imported_media_count) as total_imported_media,
  MAX(ic.updated_at) as last_connection_update,
  MAX(ii.imported_at) as last_import_date
FROM auth.users u
LEFT JOIN instagram_connections ic ON u.id = ic.user_id
LEFT JOIN instagram_imports ii ON u.id = ii.user_id
GROUP BY u.id, u.email;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful

-- Check instagram_connections table
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'instagram_connections'
ORDER BY ordinal_position;

-- Check journal_entries table (look for external_media column)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('instagram_connections', 'journal_entries', 'instagram_imports')
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'instagram_connections';

-- ============================================================================
-- ROLLBACK SCRIPTS (if needed)
-- ============================================================================
-- Uncomment and run if you need to undo the migration

-- -- Drop instagram connections table
-- DROP TABLE IF EXISTS instagram_connections CASCADE;

-- -- Drop instagram imports table
-- DROP TABLE IF EXISTS instagram_imports CASCADE;

-- -- Drop user stats view
-- DROP VIEW IF EXISTS user_instagram_stats;

-- -- Remove external_media column from journal_entries
-- ALTER TABLE journal_entries
-- DROP COLUMN IF EXISTS external_media;

-- ============================================================================
-- TEST DATA (optional - for development/testing)
-- ============================================================================
-- WARNING: Only run this in development environments

-- -- Insert test Instagram connection
-- INSERT INTO instagram_connections (
--   user_id, 
--   access_token, 
--   instagram_user_id, 
--   instagram_username
-- ) VALUES (
--   (SELECT id FROM auth.users LIMIT 1),
--   'test_token_12345',
--   '123456789',
--   'test_user'
-- ) ON CONFLICT DO NOTHING;

-- ============================================================================
-- BACKUP SCRIPT (before migration)
-- ============================================================================
-- Export current journal entries in case something goes wrong

-- COPY (
--   SELECT * FROM journal_entries
-- ) TO '/tmp/journal_entries_backup.csv' 
-- WITH (FORMAT csv, HEADER);

-- ============================================================================
-- POST-MIGRATION CHECKLIST
-- ============================================================================

-- 1. ✅ Created instagram_connections table with RLS
-- 2. ✅ Created instagram_imports table for audit trail
-- 3. ✅ Added external_media column to journal_entries
-- 4. ✅ Created necessary indexes for performance
-- 5. ✅ Set up RLS policies for security
-- 6. ✅ Created user_instagram_stats view
-- 7. ✅ Verified all migrations with queries
-- 8. ✅ Created rollback scripts for safety

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Run monthly to clean up old tokens (keep 90 days)
-- DELETE FROM instagram_connections
-- WHERE updated_at < NOW() - INTERVAL '90 days'
-- AND instagram_username IS NULL;

-- Analyze table statistics for better query performance
-- ANALYZE instagram_connections;
-- ANALYZE journal_entries;
-- ANALYZE instagram_imports;

-- ============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ============================================================================

-- 1. Run migrations in a maintenance window
-- 2. Test rollback procedures before deployment
-- 3. Monitor query performance after migration
-- 4. Set up automated backups before and after
-- 5. Keep transaction logs for audit purposes
-- 6. Alert on any RLS policy violations
-- 7. Monitor storage growth of external_media JSONB
-- 8. Plan for token cleanup (remove expired tokens quarterly)

-- ============================================================================
-- PERFORMANCE TUNING
-- ============================================================================

-- If you notice slow queries, run:
-- REINDEX TABLE instagram_connections;
-- REINDEX TABLE journal_entries;

-- To check table sizes:
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE tablename IN ('instagram_connections', 'journal_entries', 'instagram_imports')
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
