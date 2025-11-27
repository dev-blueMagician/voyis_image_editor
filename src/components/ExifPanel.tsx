'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  TextField,
  Chip,
  Box,
  Typography
} from '@mui/material';
import axios from 'axios';

interface ExifData {
  [key: string]: any;
}

interface ExifPanelProps {
  selectedImageId?: number;
}

export default function ExifPanel({ selectedImageId }: ExifPanelProps) {
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-extract EXIF when selectedImageId changes
  useEffect(() => {
    if (selectedImageId) {
      handleExtractExif(selectedImageId);
    } else {
      setExifData(null);
    }
  }, [selectedImageId]);

  const handleExtractExif = async (imageId: number) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3001/images/${imageId}`);
      const image = response.data;
      console.log(image)
      if (image.exif_data) {
        setExifData(JSON.parse(image.exif_data));
      } else {
        setExifData({ message: 'No EXIF data available for this image' });
      }
    } catch (error) {
      console.error('Failed to extract EXIF:', error);
      setExifData({ error: 'Failed to extract EXIF data' });
    } finally {
      setLoading(false);
    }
  };

  const handleInsertExif = async () => {
    if (!selectedImageId || !exifData) return;

    try {
      await axios.patch(`http://localhost:3001/images/${selectedImageId}`, {
        exif_data: JSON.stringify(exifData)
      });
      alert('EXIF data updated successfully');
    } catch (error) {
      console.error('Failed to update EXIF:', error);
      alert('Failed to update EXIF data');
    }
  };

  const handleExifChange = (key: string, value: string) => {
    setExifData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Card sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 1, '&:last-child': { pb: 1 } }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '1rem' }}>
          🏷️ Properties
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1, minHeight: 0 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
              {selectedImageId
                ? ''
                : 'Select an image'
              }
            </Typography>
            {loading && (
              <Chip
                color="primary"
                size="small"
                label="Loading..."
                sx={{ mb: 0.5, height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>

          {exifData && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minHeight: 0 }}>
              <Button
                variant="contained"
                color="success"
                onClick={handleInsertExif}
                size="small"
                sx={{ minHeight: 24, fontSize: '0.9rem' }}
              >
                Update
              </Button>
              <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 0.5, minHeight: 0  }}>
                {Object.entries(exifData).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', gap: 1, alignItems: 'center', width: '48%' }}>
                    <Chip
                      size="small"
                      variant="filled"
                      color="primary"
                      label={key}
                      sx={{ minWidth: 'fit-content', height: 24, fontSize: '0.75rem', '& .MuiChip-label': { px: 0.5 } }}
                    />
                    <TextField
                      size="small"
                      value={String(value)}
                      onChange={(e: any) => handleExifChange(key, e.target.value)}
                      sx={{
                        flex: 1,
                        '& .MuiInputBase-root': { height: 28, fontSize: '0.8rem' },
                        '& .MuiInputBase-input': { padding: '2px 8px' }
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}