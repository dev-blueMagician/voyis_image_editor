const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const exifr = require('exifr');
const FolderConfigManager = require('./folderConfig');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'voyis_db',
  user: process.env.DB_USER || 'voyis_user',
  password: process.env.DB_PASSWORD || 'voyis_pass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection and create tables
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.message);
    return;
  }
  console.log('Connected to PostgreSQL database.');

  // Create tables
  const createTablesQuery = `
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

    -- Insert initial stats row if not exists
    INSERT INTO stats (id, total_files, total_size, corrupted_files)
    VALUES (1, 0, 0, 0)
    ON CONFLICT (id) DO NOTHING;
  `;

  client.query(createTablesQuery, (err) => {
    release();
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('Database tables created/verified.');
    }
  });
});

// Initialize folder config manager
const folderConfigManager = new FolderConfigManager();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads', {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// Routes
app.post('/upload', upload.array('images'), async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const results = [];
  let corrupted = 0;

  for (const file of files) {
    try {
      // Verify it's an image
      if (!file.mimetype.startsWith('image/')) {
        corrupted++;
        continue;
      }

      // Extract EXIF data (optional)
      let exifData = null;
      try {
        exifData = await exifr.parse(file.path);
      } catch (exifError) {
        console.log('EXIF extraction failed for', file.originalname, exifError.message);
      }

      // Store relative URL in database
      const relativePath = `/uploads/${file.filename}`;

      const query = `
        INSERT INTO images (filename, filepath, mimetype, size, exif_data)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const values = [file.originalname, relativePath, file.mimetype, file.size, exifData];

      const result = await pool.query(query, values);

      results.push({
        id: result.rows[0].id,
        filename: file.originalname,
        filepath: relativePath,
        mimetype: file.mimetype,
        size: file.size,
        uploaded_at: new Date().toISOString(),
        exif_data: exifData,
      });
    } catch (err) {
      console.error('Error processing file', file.originalname, err);
      corrupted++;
    }
  }

  // Update stats
  const uploadedSize = results.reduce((sum, img) => sum + img.size, 0);
  await pool.query(
    `UPDATE stats SET total_files = total_files + $1, total_size = total_size + $2, corrupted_files = corrupted_files + $3, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    [results.length, uploadedSize, corrupted]
  );

  res.json({
    totalFiles: files.length,
    uploaded: results.length,
    corrupted,
    totalSize: uploadedSize,
    images: results,
  });
});

app.get('/images', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM images ORDER BY uploaded_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT total_files as "totalFiles", total_size as "totalSize", corrupted_files as "corrupted" FROM stats WHERE id = 1');
    const stats = result.rows[0] || { totalFiles: 0, totalSize: 0, corrupted: 0 };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/images/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM images WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/images/:id', async (req, res) => {
  try {
    const fields = req.body;
    const id = req.params.id;

    const columns = Object.keys(fields);
    const values = Object.values(fields);

    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    const query = `UPDATE images SET ${setClause} WHERE id = $${columns.length + 1}`;
    const result = await pool.query(query, [...values, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json({ message: 'Updated', updatedId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/images/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM images WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = result.rows[0];
    const fileSize = image.size;

    // Delete file
    fs.unlink(image.filepath, async (unlinkErr) => {
      if (unlinkErr) {
        console.error('Error deleting file:', unlinkErr);
      }

      try {
        await pool.query('DELETE FROM images WHERE id = $1', [req.params.id]);

        // Update stats
        await pool.query(
          `UPDATE stats SET total_files = total_files - 1, total_size = total_size - $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
          [fileSize]
        );

        res.json({ message: 'Image deleted' });
      } catch (deleteErr) {
        res.status(500).json({ error: deleteErr.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Folder Configuration API Endpoints

// Get all folder configs
app.get('/folder-configs', (req, res) => {
  const configs = folderConfigManager.getConfigs();
  res.json({
    configs,
    globalSettings: folderConfigManager.config.globalSettings
  });
});

// Get enabled folder configs
app.get('/folder-configs/enabled', (req, res) => {
  const configs = folderConfigManager.getEnabledConfigs();
  res.json({ configs });
});

// Add new folder config
app.post('/folder-configs', (req, res) => {
  try {
    const config = req.body;
    const newConfig = folderConfigManager.addConfig(config);
    res.status(201).json({ config: newConfig });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update folder config
app.put('/folder-configs/:id', (req, res) => {
  try {
    const updates = req.body;
    const updatedConfig = folderConfigManager.updateConfig(req.params.id, updates);
    if (updatedConfig) {
      res.json({ config: updatedConfig });
    } else {
      res.status(404).json({ error: 'Configuration not found' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete folder config
app.delete('/folder-configs/:id', (req, res) => {
  try {
    const deletedConfig = folderConfigManager.deleteConfig(req.params.id);
    if (deletedConfig) {
      res.json({ message: 'Configuration deleted', config: deletedConfig });
    } else {
      res.status(404).json({ error: 'Configuration not found' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Batch import from folder config
app.post('/folder-configs/:id/import', async (req, res) => {
  try {
    const config = folderConfigManager.getConfigById(req.params.id);
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    if (!config.enabled) {
      return res.status(400).json({ error: 'Configuration is disabled' });
    }

    console.log(`📂 Starting batch import from config: ${config.name}`);

    // Check if folder exists
    if (!fs.existsSync(config.path)) {
      return res.status(400).json({ error: `Folder does not exist: ${config.path}` });
    }

    // Perform the import
    const results = await folderConfigManager.scanFolder(config, pool);

    // Update stats
    await pool.query(
      `UPDATE stats SET total_files = total_files + $1, total_size = total_size + $2, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
      [results.processed, results.files.reduce((sum, file) => sum + file.size, 0)]
    );

    res.json({
      message: 'Batch import completed',
      config: config.name,
      results
    });

  } catch (error) {
    console.error('Batch import error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Batch import from all enabled configs
app.post('/folder-configs/import-all', async (req, res) => {
  try {
    const enabledConfigs = folderConfigManager.getEnabledConfigs();
    const results = [];

    console.log(`📂 Starting batch import from ${enabledConfigs.length} enabled configs`);

    for (const config of enabledConfigs) {
      try {
        console.log(`📁 Processing config: ${config.name}`);
        const configResults = await folderConfigManager.scanFolder(config, pool);
        results.push({
          config: config.name,
          results: configResults
        });
      } catch (error) {
        console.error(`❌ Error importing from ${config.name}:`, error);
        results.push({
          config: config.name,
          error: error.message
        });
      }
    }

    // Update total stats
    const totalProcessed = results.reduce((sum, result) => {
      return sum + (result.results?.processed || 0);
    }, 0);

    const totalSize = results.reduce((sum, result) => {
      return sum + (result.results?.files?.reduce((fileSum, file) => fileSum + file.size, 0) || 0);
    }, 0);

    if (totalProcessed > 0) {
      await pool.query(
        `UPDATE stats SET total_files = total_files + $1, total_size = total_size + $2, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
        [totalProcessed, totalSize]
      );
    }

    res.json({
      message: 'Batch import from all enabled configs completed',
      totalConfigs: enabledConfigs.length,
      results
    });

  } catch (error) {
    console.error('Batch import all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync endpoint (mock)
app.post('/sync', async (req, res) => {
  // Mock sync logic
  res.json({ message: 'Sync completed' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 API server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
});