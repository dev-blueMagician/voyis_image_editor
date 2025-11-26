'use client';

import { useState, useEffect } from 'react';
import { Tabs, Tab, Card, CardBody } from '@nextui-org/react';
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
      <Card className="rounded-none border-b shadow-sm">
        <CardBody className="py-4">
          <div className="flex items-center justify-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Voyis Image Editor
            </h1>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Left Panel */}
        <div className="w-80 space-y-4 overflow-y-auto">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardBody>
              <UploadPanel onUpload={handleUpload} refreshTrigger={refreshStats} />
            </CardBody>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardBody>
              <ControlPanel />
            </CardBody>
          </Card>
        </div>

        {/* Center Panel */}
        <div className="flex-1 overflow-hidden">
          <Card className="h-full shadow-lg hover:shadow-xl transition-shadow">
            <CardBody className="p-0 h-full">
              {selectedImage ? (
                <ImageViewer image={selectedImage} onBack={handleBackToGallery} />
              ) : (
                <div className="h-full flex flex-col">
                  <Tabs
                    aria-label="Viewer options"
                    variant="underlined"
                    color="primary"
                    size="lg"
                    className="flex-shrink-0"
                  >
                    <Tab key="gallery" title="🖼️ Gallery">
                      <GalleryControls
                        selectedImages={selectedImages}
                        onSelectAll={handleSelectAll}
                        onDeleteSelected={handleDeleteSelected}
                        images={images}
                      />
                    </Tab>
                    <Tab key="viewer" title="👁️ Single Viewer">
                      <div className="flex items-center justify-center h-32">
                        <div className="text-center text-gray-500">
                          <div className="text-4xl mb-2">📷</div>
                          <p className="text-sm">Select an image from the gallery to view</p>
                        </div>
                      </div>
                    </Tab>
                  </Tabs>

                  <div className="flex-1 overflow-auto p-4">
                    <GalleryViewer
                      onSelectImage={handleSelectImage}
                      onStatsUpdate={handleStatsUpdate}
                      key={refreshGallery}
                      showControls={false}
                      selectedImages={selectedImages}
                      setSelectedImages={setSelectedImages}
                    />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom Panel - Split into two equal parts */}
      <div className="flex border-t shadow-sm" style={{ height: '200px' }}>
        {/* Left: System Logs */}
        <div className="flex-1 border-r">
          <Card className="rounded-none h-full">
            <CardBody className="p-3 h-full">
              <LogPanel />
            </CardBody>
          </Card>
        </div>

        {/* Right: EXIF Data Management */}
        <div className="flex-1">
          <Card className="rounded-none h-full">
            <CardBody className="p-3 h-full">
              <ExifPanel selectedImageId={selectedImage?.id} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}