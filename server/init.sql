CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  filepath VARCHAR(500) NOT NULL,
  mimetype VARCHAR(100),
  size BIGINT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exif_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_images_filename ON images(filename);
CREATE INDEX IF NOT EXISTS idx_images_uploaded_at ON images(uploaded_at);