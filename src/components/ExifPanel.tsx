'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Input, Chip, image } from '@nextui-org/react';
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
    <Card className="w-full">
      <CardBody>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🏷️ Image Properties
        </h3>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              {selectedImageId
                ? ''
                : 'Select an image from the gallery'
              }
            </p>
            {loading && (
              <Chip color="primary" size="sm" className="mb-2">
                Loading Properties...
              </Chip>
            )}
          </div>

          {exifData && (
            <div className="space-y-1">
              <Button
                color="success"
                onPress={handleInsertExif}
                size="sm"
              >
                Update Properties
              </Button>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {Object.entries(exifData).map(([key, value]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <Chip size="sm" variant="flat" color="primary" className="min-w-fit">
                      {key}
                    </Chip>
                    <Input
                      size="sm"
                      value={String(value)}
                      onChange={(e) => handleExifChange(key, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>


            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}