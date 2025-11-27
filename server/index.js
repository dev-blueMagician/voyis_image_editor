const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const exifr = require('exifr');

require('dotenv').config();

const app = express();
const port = 3001;

// Database connection
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.serialize(() => {
      // Create table if not exists
      db.run(`CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        mimetype TEXT,
        size INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        exif_data TEXT
      )`);

      // Create stats table for tracking totals
      db.run(`CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_files INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        corrupted_files INTEGER DEFAULT 0
      )`);

      // Insert initial stats if not exists
      db.run(`INSERT OR IGNORE INTO stats (id, total_files, total_size, corrupted_files) VALUES (1, 0, 0, 0)`);
    })
  }
});

// Middleware
app.use(cors());
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

      const stmt = db.prepare(`
        INSERT INTO images (filename, filepath, mimetype, size, exif_data)
        VALUES (?, ?, ?, ?, ?)
      `);

      await new Promise((resolve, reject) => {
        stmt.run(
          [file.originalname, relativePath, file.mimetype, file.size, exifData ? JSON.stringify(exifData) : null],
          function (err) {
            if (err) {
              console.error(err);
              corrupted++;
              reject(err);
            } else {
              results.push({
                id: this.lastID,
                filename: file.originalname,
                filepath: relativePath, // <-- URL-friendly path
                mimetype: file.mimetype,
                size: file.size,
                uploaded_at: new Date().toISOString(),
                exif_data: exifData ? JSON.stringify(exifData) : null,
              });
              resolve();
            }
          }
        );
        stmt.finalize();
      });
    } catch (err) {
      console.error('Error processing file', file.originalname, err);
      corrupted++;
    }
  }

  // Update stats
  const uploadedSize = results.reduce((sum, img) => sum + img.size, 0);
  db.run(
    `UPDATE stats SET total_files = total_files + ?, total_size = total_size + ?, corrupted_files = corrupted_files + ? WHERE id = 1`,
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

app.get('/images', (req, res) => {
  db.all('SELECT * FROM images ORDER BY uploaded_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get('/stats', (req, res) => {
  db.get('SELECT total_files as totalFiles, total_size as totalSize, corrupted_files as corrupted FROM stats WHERE id = 1', [], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        totalFiles: row?.totalFiles || 0,
        totalSize: row?.totalSize || 0,
        corrupted: row?.corrupted || 0
      });
    }
  });
});

app.get('/images/:id', (req, res) => {
  db.get('SELECT * FROM images WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Image not found' });
    } else {
      res.json(row);
    }
  });
});

app.patch('/images/:id', (req, res) => {
  const fields = req.body;
  const id = req.params.id;

  const columns = Object.keys(fields);
  const values = Object.values(fields);

  const setClause = columns.map(col => `${col} = ?`).join(', ');

  db.run(
    `UPDATE images SET ${setClause} WHERE id = ?`,
    [...values, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Image not found' });
      res.json({ message: 'Updated', updatedId: id });
    }
  );
});

app.delete('/images/:id', (req, res) => {
  db.get('SELECT * FROM images WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Image not found' });
    } else {
      const fileSize = row.size;
      fs.unlink(row.filepath, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error deleting file:', unlinkErr);
        }
        db.run('DELETE FROM images WHERE id = ?', [req.params.id], (deleteErr) => {
          if (deleteErr) {
            res.status(500).json({ error: deleteErr.message });
          } else {
            // Update stats
            db.run(
              `UPDATE stats SET total_files = total_files - 1, total_size = total_size - ? WHERE id = 1`,
              [fileSize]
            );
            res.json({ message: 'Image deleted' });
          }
        });
      });
    }
  });
});

// Sync endpoint (mock)
app.post('/sync', async (req, res) => {
  // Mock sync logic
  res.json({ message: 'Sync completed' });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});