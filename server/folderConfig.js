const fs = require('fs');
const path = require('path');
const exifr = require('exifr');

class FolderConfigManager {
  constructor(configPath = './folder-config.json') {
    this.configPath = configPath;
    this.config = null;
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(data);
        console.log('📁 Folder config loaded:', this.config.configs.length, 'configs');
      } else {
        console.log('📁 Folder config file not found, creating default config');
        this.createDefaultConfig();
      }
    } catch (error) {
      console.error('❌ Error loading folder config:', error);
      this.createDefaultConfig();
    }
  }

  createDefaultConfig() {
    this.config = {
      version: "1.0.0",
      description: "Folder configurations for batch image import",
      configs: [],
      globalSettings: {
        defaultMaxDepth: 5,
        defaultFileTypes: ["jpg", "jpeg", "png"],
        skipDuplicates: true,
        extractExif: true,
        autoCreateThumbnails: true,
        importBatchSize: 10
      }
    };
    this.saveConfig();
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('💾 Folder config saved');
    } catch (error) {
      console.error('❌ Error saving folder config:', error);
    }
  }

  getConfigs() {
    return this.config.configs || [];
  }

  getEnabledConfigs() {
    return this.config.configs.filter(config => config.enabled) || [];
  }

  getConfigById(id) {
    return this.config.configs.find(config => config.id === id);
  }

  addConfig(config) {
    config.id = config.id || `config_${Date.now()}`;
    config.lastImported = null;
    this.config.configs.push(config);
    this.saveConfig();
    return config;
  }

  updateConfig(id, updates) {
    const index = this.config.configs.findIndex(config => config.id === id);
    if (index !== -1) {
      this.config.configs[index] = { ...this.config.configs[index], ...updates };
      this.saveConfig();
      return this.config.configs[index];
    }
    return null;
  }

  deleteConfig(id) {
    const index = this.config.configs.findIndex(config => config.id === id);
    if (index !== -1) {
      const deleted = this.config.configs.splice(index, 1)[0];
      this.saveConfig();
      return deleted;
    }
    return null;
  }

  async scanFolder(config, db) {
    const results = {
      found: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      files: []
    };

    try {
      const files = await this.scanDirectory(config.path, config, 0);
      results.found = files.length;

      console.log(`📂 Scanning ${files.length} files from ${config.path}`);

      // Process files in batches
      const batchSize = this.config.globalSettings.importBatchSize || 10;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await this.processBatch(batch, config, db, results);
      }

      // Update last imported timestamp
      this.updateConfig(config.id, { lastImported: new Date().toISOString() });

      console.log(`✅ Folder scan completed: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors`);

    } catch (error) {
      console.error('❌ Error scanning folder:', error);
      results.errors++;
    }

    return results;
  }

  async scanDirectory(dirPath, config, currentDepth) {
    const files = [];

    if (currentDepth > (config.maxDepth || this.config.globalSettings.defaultMaxDepth)) {
      return files;
    }

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && config.recursive) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectory(fullPath, config, currentDepth + 1);
          files.push(...subFiles);
        } else if (stat.isFile()) {
          // Check if file matches criteria
          if (this.matchesFileCriteria(fullPath, config)) {
            files.push({
              path: fullPath,
              relativePath: path.relative(config.path, fullPath),
              name: item,
              size: stat.size,
              modified: stat.mtime
            });
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning directory ${dirPath}:`, error);
    }

    return files;
  }

  matchesFileCriteria(filePath, config) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const fileTypes = config.fileTypes || this.config.globalSettings.defaultFileTypes;

    // Check file extension
    if (!fileTypes.includes(ext)) {
      return false;
    }

    // Check include patterns
    if (config.includePatterns && config.includePatterns.length > 0) {
      const fileName = path.basename(filePath);
      const matchesInclude = config.includePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(fileName);
      });
      if (!matchesInclude) return false;
    }

    // Check exclude patterns
    if (config.excludePatterns && config.excludePatterns.length > 0) {
      const fileName = path.basename(filePath);
      const matchesExclude = config.excludePatterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(fileName);
      });
      if (matchesExclude) return false;
    }

    return true;
  }

  async processBatch(files, config, db, results) {
    for (const file of files) {
      try {
        // Check for duplicates if enabled
        if (this.config.globalSettings.skipDuplicates) {
          const existing = await this.checkDuplicate(db, file.name, file.size);
          if (existing) {
            results.skipped++;
            continue;
          }
        }

        // Copy file to uploads directory
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const newFileName = `${timestamp}_${file.name}`;
        const uploadPath = path.join(uploadDir, newFileName);

        fs.copyFileSync(file.path, uploadPath);

        // Extract EXIF if enabled
        let exifData = null;
        if (this.config.globalSettings.extractExif) {
          try {
            exifData = await exifr.parse(uploadPath);
          } catch (exifError) {
            console.log('EXIF extraction failed for', file.name, exifError.message);
          }
        }

        // Insert into database
        const relativePath = `/uploads/${newFileName}`;
        await this.insertFileRecord(db, {
          filename: file.name,
          filepath: relativePath,
          mimetype: this.getMimeType(file.name),
          size: file.size,
          exif_data: exifData ? JSON.stringify(exifData) : null
        });

        results.files.push({
          originalPath: file.path,
          uploadedPath: relativePath,
          filename: file.name,
          size: file.size
        });

        results.processed++;

      } catch (error) {
        console.error(`❌ Error processing file ${file.path}:`, error);
        results.errors++;
      }
    }
  }

  async checkDuplicate(db, filename, size) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM images WHERE filename = ? AND size = ?',
        [filename, size],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async insertFileRecord(db, record) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO images (filename, filepath, mimetype, size, exif_data)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        [record.filename, record.filepath, record.mimetype, record.size, record.exif_data],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
      stmt.finalize();
    });
  }

  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = FolderConfigManager;