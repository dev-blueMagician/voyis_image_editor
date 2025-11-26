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
import axios from 'axios';
import JSZip from 'jszip';
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
}

// Safe way to access electron APIs
const getIpcRenderer = () => {
  if (typeof window !== 'undefined' && window.require) {
    return window.require('electron').ipcRenderer;
  }
  return null;
};

export default function GalleryControls({
  selectedImages,
  onSelectAll,
  onDeleteSelected,
  images
}: GalleryControlsProps) {
  const [filter, setFilter] = useState<string>('all');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  console.log('selectedImages', selectedImages.size)

  const handleExportClick = () => {
    setIsExportDialogOpen(true);
  };

  const handleExportWithFormat = async (format: string, folderPath: string) => {
    const ipcRenderer = getIpcRenderer();

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

      await ipcRenderer.invoke('export-images', files, folderPath, format);

      // Clear selection after export
      onSelectAll(false);
      alert('Images exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleDownload = async () => {
    if (selectedImages.size === 0) return;

    try {
      const zip = new JSZip();

      for (const imageId of Array.from(selectedImages)) {
        const image = images.find(img => img.id === imageId);
        if (image) {
          const response = await fetch(`http://localhost:3001${image.filepath}`);
          const blob = await response.blob();
          zip.file(image.filename, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exported_images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Clear selection after download
      onSelectAll(false);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
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
        <div className="flex items-center gap-2">
          <Checkbox
            isSelected={allSelected}
            isIndeterminate={someSelected}
            onValueChange={onSelectAll}
            color="primary"
            size="lg"
          />
          <span className="text-sm font-medium">
            Select All ({selectedImages.size} selected)
          </span>
        </div>

        {/* Center: Action Buttons */}
        <div className="flex gap-2">
          <Button
            color="primary"
            variant="solid"
            onPress={handleExportClick}
            disabled={selectedImages.size === 0}
            startContent={<span>📁</span>}
          >
            Export to Folder
          </Button>
          <Button
            color="secondary"
            variant="solid"
            onPress={handleDownload}
            disabled={selectedImages.size === 0}
            startContent={<span>📦</span>}
          >
            Download ZIP
          </Button>
          <Button
            color="danger"
            variant="solid"
            onPress={onDeleteSelected}
            disabled={selectedImages.size === 0}
            startContent={<span>🗑️</span>}
          >
            Delete Selected
          </Button>
        </div>

        {/* Right: Filter */}
        <FormControl sx={{ minWidth: 192 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filter}
            label="Filter by Type"
            onChange={(e: any) => setFilter(e.target.value)}
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