'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import ExportDialog from './ExportDialog';

interface ImageData {
  id: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  uploaded_at: string;
}

interface GalleryControlsProps {
  selectedImages: Set<number>;
  onSelectAll: (checked: boolean) => void;
  onDeleteSelected: () => void;
  images: ImageData[];
  filter: string;
  onFilterChange: (filter: string) => void;
}

// Safe way to access electron APIs through preload script
const getElectronAPI = () => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  return null;
};

export default function GalleryControls({
  selectedImages,
  onSelectAll,
  onDeleteSelected,
  images,
  filter,
  onFilterChange
}: GalleryControlsProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const handleExportClick = () => {
    setIsExportDialogOpen(true);
  };

  const handleExportWithFormat = async (format: string, folderPath: string) => {
    const electronAPI = getElectronAPI();

    if (!electronAPI) {
      alert('Electron API not available. Please restart the application.');
      return;
    }

    try {
      const files = [];
      for (const imageId of Array.from(selectedImages)) {
        const image = images.find(img => img.id === imageId);
        if (image) {
          files.push({
            url: `http://localhost:3001${image.filepath}`,
            name: image.filename,
            format: format
          });
        }
      }

      await electronAPI.exportImages(files, folderPath, format);

      // Clear selection after export
      onSelectAll(false);
      alert('Images exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const filteredImages = images.filter(img => {
    if (filter === 'all') return true;
    return img.mimetype.includes(filter);
  });

  const allSelected = filteredImages.length > 0 && selectedImages.size === filteredImages.length;
  const someSelected = selectedImages.size > 0 && selectedImages.size < filteredImages.length;

  return (
    <>
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        {/* Left: Select All */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected}
            onChange={(e) => onSelectAll(e.target.checked)}
            color="primary"
          />
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            Select All ({selectedImages.size} selected)
          </Typography>
        </Box>

        {/* Center: Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExportClick}
            disabled={selectedImages.size === 0}
            startIcon={<span>📁</span>}
          >
            Export to Folder
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onDeleteSelected}
            disabled={selectedImages.size === 0}
            startIcon={<span>🗑️</span>}
          >
            Delete Selected
          </Button>
        </Box>

        {/* Right: Filter */}
        <FormControl sx={{ minWidth: 192 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filter}
            label="Filter by Type"
            onChange={(e: any) => onFilterChange(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="jpeg">JPEG Images</MenuItem>
            <MenuItem value="png">PNG Images</MenuItem>
            <MenuItem value="tiff">TIFF Images</MenuItem>
          </Select>
        </FormControl>
      </div>

      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        selectedCount={selectedImages.size}
        onExport={handleExportWithFormat}
      />
    </>
  );
}