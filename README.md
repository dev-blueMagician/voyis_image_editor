# Voyis Image Editor

An Electron-based image editor application built with Next.js, TypeScript, and Material-UI. Features comprehensive image management with folder-based batch imports.

## Features

- **File Upload**: Upload JPG, PNG, TIF images up to 4K quality with batch processing
- **Gallery Viewer**: Thumbnail gallery with filtering and batch selection
- **Single Image Viewer**: Pan, zoom, and area selection with cropping
- **Server Synchronization**: Sync with SQLite database via REST API
- **Folder Configuration**: JSON-based batch import from configured folders
- **Batch Export**: Export images with native folder selection
- **EXIF Data Management**: Automatic extraction and editing of image metadata

## Setup Instructions

### Prerequisites
- Node.js 18+
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd voyis-image-editor
```

### 2. Install Dependencies
```bash
# Main application dependencies
npm install

# Server dependencies
cd server
npm install
cd ..
```

### 3. Start the API Server
```bash
cd server
npm start
```

This will start the API server on port 3001 with SQLite database.

### 4. Run the Electron Application
In a new terminal:
```bash
npm run electron-dev
```

## Usage Guide

### File Upload
1. Click "Choose Files" or drag & drop images
2. Images are automatically uploaded to the server
3. View upload progress and statistics

### Gallery Management
1. Browse uploaded images in thumbnail view
2. Use filter dropdown to show specific file types
3. Select multiple images for batch operations
4. Double-click images to open single viewer

### Folder Configuration
1. Click "Folder Config" button in header
2. Add folder configurations with custom settings
3. Enable/disable configurations as needed
4. Use "Import All Enabled" for batch folder processing

### Image Editing
1. Open image in single viewer
2. Use mouse wheel to zoom, Alt+drag to pan
3. Draw selection rectangle for cropping
4. Click "Crop Selection" to create new image

## API Endpoints

- `GET /images` - List all images
- `GET /images/:id` - Get specific image
- `POST /images` - Upload new images
- `PATCH /images/:id` - Update image metadata
- `DELETE /images/:id` - Delete image
- `GET /stats` - Total upload statistics

### Folder Configuration
- `GET /folder-configs` - List all folder configurations
- `POST /folder-configs` - Create new folder configuration
- `PUT /folder-configs/:id` - Update configuration
- `DELETE /folder-configs/:id` - Delete configuration
- `POST /folder-configs/:id/import` - Import from specific config
- `POST /folder-configs/import-all` - Batch import from all enabled configs

## Configuration Files

### folder-config.json
```json
{
  "configs": [
    {
      "id": "project-photos",
      "name": "Project Photos",
      "path": "./sample_images",
      "fileTypes": ["jpg", "png", "tiff"],
      "recursive": true,
      "enabled": true
    }
  ]
}
```

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Material-UI, Fabric.js
- **Backend**: Node.js Express server with SQLite database
- **Desktop**: Electron with secure IPC communication
- **Image Processing**: Fabric.js for canvas manipulation

## Conflict Resolution Strategy

**Strategy Chosen: Server Always Wins**

### Why This Strategy?
- Ensures data consistency across all clients
- Simplifies conflict resolution logic
- Prevents data corruption from concurrent edits

### Potential Risks
- Local changes may be lost if not synced before server updates
- Users might lose work if they edit offline
- Requires users to be aware of sync timing

## Development

### Scripts
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run electron` - Run Electron app
- `npm run electron-dev` - Run Electron with hot reload

### Project Structure
```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── UploadPanel.tsx
│   ├── GalleryViewer.tsx
│   ├── ImageViewer.tsx
│   ├── ControlPanel.tsx
│   ├── FolderConfigPanel.tsx
│   └── ExportDialog.tsx
main.ts
server/
├── index.js
├── folderConfig.js
└── package.json
folder-config.json
```

## License

MIT License
