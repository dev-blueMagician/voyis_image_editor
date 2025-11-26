'use client';

import { useState, useEffect } from 'react';
import { Paper, Typography, Box } from '@mui/material';
import axios from 'axios';
import UploadPanel from '../components/UploadPanel';
import GalleryViewer from '../components/GalleryViewer';
import ImageViewer from '../components/ImageViewer';
import ControlPanel from '../components/ControlPanel';
import LogPanel from '../components/LogPanel';
import ExifPanel from '../components/ExifPanel';
import GalleryControls from '../components/GalleryControls';

interface ImageData {
  id: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  uploaded_at: string;
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [refreshGallery, setRefreshGallery] = useState(0);
  const [refreshStats, setRefreshStats] = useState(0);
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<string>('all');

  // Fetch images on mount and when refreshGallery changes
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get('http://localhost:3001/images');
        setImages(response.data);
      } catch (error) {
        console.error('Failed to fetch images:', error);
      }
    };
    fetchImages();
  }, [refreshGallery]);

  const handleUpload = () => {
    setRefreshGallery(prev => prev + 1);
    setRefreshStats(prev => prev + 1);
  };

  const handleStatsUpdate = () => {
    setRefreshStats(prev => prev + 1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(images.map(img => img.id));
      setSelectedImages(allIds);
    } else {
      setSelectedImages(new Set());
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

      // Refresh gallery and stats
      setRefreshGallery(prev => prev + 1);
      handleStatsUpdate();
      setSelectedImages(new Set());
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete some images');
    }
  };

  const handleSelectImage = (image: ImageData) => {
    setSelectedImage(image);
  };

  const handleBackToGallery = () => {
    setSelectedImage(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <Paper elevation={1} sx={{ borderRadius: 0, borderBottom: 1 }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Voyis Image Editor
          </Typography>
        </Box>
      </Paper>

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Left Panel */}
        <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          <Paper elevation={3}>
            <Box sx={{ p: 2 }}>
              <UploadPanel onUpload={handleUpload} refreshTrigger={refreshStats} />
            </Box>
          </Paper>

          <Paper elevation={3}>
            <Box sx={{ p: 2 }}>
              <ControlPanel />
            </Box>
          </Paper>
        </Box>

        {/* Center Panel */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Paper elevation={3} sx={{ height: '100%' }}>
            <Box sx={{ p: 0, height: '100%' }}>
              {selectedImage ? (
                <ImageViewer image={selectedImage} onBack={handleBackToGallery} />
              ) : (
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ flexShrink: 0 }}>
                    <GalleryControls
                      selectedImages={selectedImages}
                      onSelectAll={handleSelectAll}
                      onDeleteSelected={handleDeleteSelected}
                      images={images}
                      filter={filter}
                      onFilterChange={setFilter}
                    />
                  </Box>

                  <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                    <GalleryViewer
                      onSelectImage={handleSelectImage}
                      onStatsUpdate={handleStatsUpdate}
                      key={refreshGallery}
                      showControls={false}
                      selectedImages={selectedImages}
                      setSelectedImages={setSelectedImages}
                      filter={filter}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </div>

      {/* Bottom Panel - Split into two equal parts */}
      <Box sx={{ display: 'flex', borderTop: 1, boxShadow: 1 }}>
        {/* Left: System Logs */}
        <Box sx={{ flex: 1, borderRight: 1 }}>
          <Paper elevation={0} sx={{ borderRadius: 0, height: '100%' }}>
            <Box sx={{ p: 1.5, height: '100%' }}>
              <LogPanel />
            </Box>
          </Paper>
        </Box>

        {/* Right: EXIF Data Management */}
        <Box sx={{ flex: 1 }}>
          <Paper elevation={0} sx={{ borderRadius: 0, height: '100%' }}>
            <Box sx={{ p: 1.5, height: '100%' }}>
              <ExifPanel selectedImageId={selectedImage?.id} />
            </Box>
          </Paper>
        </Box>
      </Box>
    </div>
  );
}