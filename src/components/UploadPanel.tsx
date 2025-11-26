'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  LinearProgress,
  TextField,
  Box,
  Chip,
  Typography
} from '@mui/material';
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
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        📤 File Upload
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Card
          sx={{
            border: '2px dashed',
            borderColor: isDragOver ? 'primary.main' : 'primary.light',
            bgcolor: isDragOver ? 'primary.light' : 'background.paper',
            transition: 'all 0.2s',
            transform: isDragOver ? 'scale(1.02)' : 'scale(1)',
            cursor: 'pointer'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h2" sx={{ mb: 1, transition: 'transform 0.2s', transform: isDragOver ? 'scale(1.1)' : 'scale(1)' }}>
                {isDragOver ? '📂' : '📁'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                {isDragOver ? 'Drop images here!' : 'Drop images here or click to browse'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supports JPG, PNG, TIF up to 4K resolution
              </Typography>
            </Box>
            <TextField
              type="file"
              inputProps={{ multiple: true, accept: 'image/*' }}
              onChange={handleInputChange}
              disabled={uploading}
              sx={{ display: 'none' }}
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button
                variant="contained"
                color="primary"
                component="span"
                disabled={uploading}
                startIcon={<span>📎</span>}
                sx={{ cursor: 'pointer' }}
              >
                {uploading ? 'Uploading...' : 'Choose Files'}
              </Button>
            </label>
          </CardContent>
        </Card>

        {uploading && (
          <Card sx={{ border: '2px solid', borderColor: 'info.light', bgcolor: 'info.light' }}>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    Uploading files...
                  </Typography>
                  <Chip color="primary" size="small" label={`${progress}%`} />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  color="primary"
                  sx={{ width: '100%' }}
                />
              </Box>
            </CardContent>
          </Card>
        )}

        <Card sx={{ border: '2px solid', borderColor: 'info.light', bgcolor: 'info.light' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              📊 Total Statistics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Chip
                color="primary"
                variant="filled"
                size="medium"
                label={`Total File Count: ${totalStats.files}`}
                sx={{ justifyContent: 'center', py: 1 }}
              />
              <Chip
                color="secondary"
                variant="filled"
                size="medium"
                label={`Total File Size: ${(totalStats.size / 1024 / 1024).toFixed(2)} MB`}
                sx={{ justifyContent: 'center', py: 1 }}
              />
              <Chip
                color={totalStats.corrupted > 0 ? "error" : "default"}
                variant="filled"
                size="medium"
                label={`Number of Corrupted Images: ${totalStats.corrupted}`}
                sx={{ justifyContent: 'center', py: 1 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}