-- PostgreSQL initialization script for Voyis Image Editor

-- Create database and user (handled by environment variables in docker-compose.yml)

-- Create tables
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  mimetype VARCHAR(100),
  size BIGINT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exif_data JSONB
);

CREATE TABLE IF NOT EXISTS stats (
  id SERIAL PRIMARY KEY,
  total_files INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  corrupted_files INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_images_filename ON images(filename);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_images_mimetype ON images(mimetype);

-- Insert initial stats record
INSERT INTO stats (id, total_files, total_size, corrupted_files)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions (handled by docker-compose environment)
-- GRANT ALL PRIVILEGES ON DATABASE voyis_db TO voyis_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO voyis_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO voyis_user;