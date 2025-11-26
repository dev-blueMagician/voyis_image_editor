'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardBody, Progress, Input, Spacer, Chip } from '@nextui-org/react';
import axios from 'axios';

interface UploadResult {
  totalFiles: number;
  uploaded: number;
  corrupted: number;
  totalSize: number;
  images: any[];
}

export default function UploadPanel({ onUpload, refreshTrigger }: { onUpload: () => void; refreshTrigger?: number }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [totalStats, setTotalStats] = useState({ files: 0, size: 0, corrupted: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch total stats on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchTotalStats();
  }, [refreshTrigger]);

  const fetchTotalStats = async () => {
    try {
      const response = await axios.get('http://localhost:3001/stats');
      setTotalStats({
        files: response.data.totalFiles,
        size: response.data.totalSize,
        corrupted: response.data.corrupted
      });
    } catch (error) {
      console.error('Failed to fetch total stats:', error);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    setUploading(true);
    setProgress(0);

    try {
      const response = await axios.post('http://localhost:3001/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percent);
        },
      });

      setResult(response.data);
      // Refresh total stats from server
      fetchTotalStats();
      onUpload();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };

  return (
    <div className="w-full">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        📤 File Upload
      </h3>

      <div className="space-y-4">
        <Card
          className={`border-2 border-dashed transition-all duration-200 ${
            isDragOver
              ? 'border-primary-500 bg-primary-50 scale-105'
              : 'border-primary-300 hover:border-primary-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardBody className="text-center py-8">
            <div className="mb-4">
              <div className={`text-4xl mb-2 transition-transform ${isDragOver ? 'scale-110' : ''}`}>
                {isDragOver ? '📂' : '📁'}
              </div>
              <p className="text-lg font-medium">
                {isDragOver ? 'Drop images here!' : 'Drop images here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">Supports JPG, PNG, TIF up to 4K resolution</p>
            </div>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleInputChange}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button
                color="primary"
                variant="solid"
                as="span"
                disabled={uploading}
                startContent={<span>📎</span>}
                className="cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Choose Files'}
              </Button>
            </label>
          </CardBody>
        </Card>

        {uploading && (
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardBody>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Uploading files...</span>
                  <Chip color="primary" size="sm">{progress}%</Chip>
                </div>
                <Progress
                  value={progress}
                  color="primary"
                  size="md"
                  className="w-full"
                />
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="border-2 border-info-200 bg-info-50">
          <CardBody>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              📊 Total Statistics
            </h4>
            <div className="grid grid-cols-1 gap-2">
              <Chip color="primary" variant="flat" size="lg" className="justify-center py-2">
                Total File Count: {totalStats.files}
              </Chip>
              <Chip color="secondary" variant="flat" size="lg" className="justify-center py-2">
                Total File Size: {(totalStats.size / 1024 / 1024).toFixed(2)} MB
              </Chip>
              <Chip color={totalStats.corrupted > 0 ? "danger" : "default"} variant="flat" size="lg" className="justify-center py-2">
                Number of Corrupted Images: {totalStats.corrupted}
              </Chip>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}