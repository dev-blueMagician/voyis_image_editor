'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Badge
} from '@mui/material';
import axios from 'axios';
import JSZip from 'jszip';

// Safe way to access electron APIs
const getIpcRenderer = () => {
  if (typeof window !== 'undefined' && window.require) {
    return window.require('electron').ipcRenderer;
  }
  return null;
};

interface ImageData {
  id: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  uploaded_at: string;
}

export default function GalleryViewer({
  onSelectImage,
  onStatsUpdate,
  showControls = true,
  selectedImages,
  setSelectedImages
}: {
  onSelectImage: (image: ImageData) => void;
  onStatsUpdate?: () => void;
  showControls?: boolean;
  selectedImages: Set<number>;
  setSelectedImages: React.Dispatch<React.SetStateAction<Set<number>>>;
}) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [filter, setFilter] = useState<string>('all');


  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await axios.get('http://localhost:3001/images');
      setImages(response.data);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const handleImageClick = (image: ImageData) => {
    onSelectImage(image);
  };

  const handleSelectImage = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedImages);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedImages(newSelected);
  };

  const handleExport = async () => {
    if (selectedImages.size === 0) return;

    const ipcRenderer = getIpcRenderer();

    try {
      const folderPath = await ipcRenderer.invoke('select-folder');
      if (!folderPath) return;

      const files = [];
      for (const imageId of Array.from(selectedImages)) {
        const image = images.find(img => img.id === imageId);
        if (image) {
          files.push({
            url: `http://localhost:3001${image.filepath}`,
            name: image.filename
          });
        }
      }

      await ipcRenderer.invoke('save-files', files, folderPath);

      // Clear selection after export
      setSelectedImages(new Set());
      alert('Images exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
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
      setSelectedImages(new Set());
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedImages.size} selected image(s)?`)) {
      return;
    }

    try {
      for (const imageId of Array.from(selectedImages)) {
        await axios.delete(`http://localhost:3001/images/${imageId}`);
      }

      // Refresh the gallery
      fetchImages();
      setSelectedImages(new Set());
      if (onStatsUpdate) onStatsUpdate();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete some images');
    }
  };

  const filteredImages = images.filter(img => {
    if (filter === 'all') return true;
    const filtered = img.mimetype.includes(filter);
    console.log('img.mimetype...', img.mimetype, filter, filtered)

    return filtered
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredImages.map(img => img.id));
      setSelectedImages(allIds);
    } else {
      setSelectedImages(new Set());
    }
  };

  const allSelected = filteredImages.length > 0 && selectedImages.size === filteredImages.length;
  const someSelected = selectedImages.size > 0 && selectedImages.size < filteredImages.length;

  return (
    <div className="w-full">
      {showControls && (
        <>
          {/* Fixed header with controls */}
          <div className="sticky top-0 bg-white z-10 pb-4 mb-4 border-b">
            {/* <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <Select
                  label="Filter by Type"
                  placeholder="All Types"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-48"
                >
                  <SelectItem key="all" value="all">All Types</SelectItem>
                  <SelectItem key="jpeg" value="jpeg">JPEG Images</SelectItem>
                  <SelectItem key="png" value="png">PNG Images</SelectItem>
                  <SelectItem key="tiff" value="tiff">TIFF Images</SelectItem>
                </Select>

                <div className="flex items-center gap-2">
                  <Checkbox
                    isSelected={allSelected}
                    isIndeterminate={someSelected}
                    onValueChange={handleSelectAll}
                    color="primary"
                    size="lg"
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectedImages.size} selected)
                  </span>
                </div>
              </div>
            </div> */}

            {/* <div className="flex gap-2">
              <Button
                color="primary"
                variant="solid"
                onPress={handleExport}
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
                onPress={handleDeleteSelected}
                disabled={selectedImages.size === 0}
                startContent={<span>🗑️</span>}
              >
                Delete Selected
              </Button>
            </div> */}
          </div>
        </>
      )}
      <div className="grid grid-cols-4 gap-4">
        {filteredImages.map((image) => {
          const isSelected = selectedImages.has(image.id);
          return (
            <Card
              key={image.id}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...(isSelected && {
                  border: 2,
                  borderColor: 'primary.main',
                  boxShadow: 3,
                  transform: 'scale(1.05)'
                }),
                '&:hover': {
                  boxShadow: 3,
                  transform: 'scale(1.02)'
                }
              }}
              onClick={() => handleSelectImage(image.id, !isSelected)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleImageClick(image);
              }}
            >
              <CardContent sx={{ p: 1.5 }}>
                <Box sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    image={`http://localhost:3001${image.filepath}`}
                    alt={image.filename}
                    sx={{ width: '100%', height: 128, objectFit: 'cover', borderRadius: 1 }}
                  />
                  <Checkbox
                    sx={{ position: 'absolute', bottom: 8, right: 8 }}
                    checked={isSelected}
                    onChange={(e, checked) => {
                      e.stopPropagation();
                      handleSelectImage(image.id, checked);
                    }}
                    color="primary"
                  />
                  <Chip
                    label={image.mimetype.split('/')[1].toUpperCase()}
                    color="primary"
                    size="small"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  />
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'medium',
                      textAlign: 'center',
                      color: isSelected ? 'primary.main' : 'inherit'
                    }}
                    noWrap
                  >
                    {image.filename}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                    <Chip size="small" color="secondary" label={`${(image.size / 1024).toFixed(0)} KB`} />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(image.uploaded_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}