-- MarFaNet Database Initialization Script
-- This script creates the necessary database extensions and initial configuration

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for password hashing and encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create admin user if not exists (will be updated by application)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_user WHERE usename = 'marfanet_admin'
    ) THEN
        CREATE USER marfanet_admin WITH CREATEDB;
        GRANT ALL PRIVILEGES ON DATABASE marfanet_db TO marfanet_admin;
    END IF;
END
$$;

-- Set timezone to UTC for consistency
SET timezone = 'UTC';

-- Configure some performance settings for the database
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();

-- Log initialization completion
INSERT INTO pg_stat_statements_info VALUES ('Database initialized for MarFaNet', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;