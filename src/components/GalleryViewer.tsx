'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Checkbox,
  Box,
  Chip,

} from '@mui/material';
import axios from 'axios';

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
  selectedImages,
  setSelectedImages,
  filter
}: {
  onSelectImage: (image: ImageData) => void;
  onStatsUpdate?: () => void;
  showControls?: boolean;
  selectedImages: Set<number>;
  setSelectedImages: React.Dispatch<React.SetStateAction<Set<number>>>;
  filter: string;
}) {
  const [images, setImages] = useState<ImageData[]>([]);


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

  const safeImages = Array.isArray(images) ? images : [];
  const filteredImages = safeImages.filter(img => {
      if (filter === 'all') return true;
      const filtered = img.mimetype.includes(filter);
      console.log('img.mimetype...', img.mimetype, filter, filtered)

      return filtered
  });

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
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
      </Box>
    </Box>
  );
}