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
  Typography,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import axios from 'axios';
import { wasmProcessor, WasmProcessingOptions } from '../utils/wasmImageProcessor';

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

  // WASM processing state
  const [useWasm, setUseWasm] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmOptions, setWasmOptions] = useState<WasmProcessingOptions>({
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.9,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    sharpen: false
  });

  // Fetch total stats on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchTotalStats();
  }, [refreshTrigger]);

  // Initialize WASM processor
  useEffect(() => {
    const initWasm = async () => {
      try {
        await wasmProcessor.initialize();
        setWasmReady(true);
        console.log('✅ WASM processor ready for image processing');
      } catch (error) {
        console.error('❌ Failed to initialize WASM processor:', error);
        setWasmReady(false);
      }
    };

    initWasm();
  }, []);

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

    setUploading(true);
    setProgress(0);

    try {
      let filesToUpload: File[] = Array.from(files);

      // Process files with WASM if enabled
      if (useWasm && wasmReady) {
        console.log('🚀 Processing files with WASM...');
        const processedFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const processedBlob = await wasmProcessor.processImage(file, wasmOptions);

            // Convert blob back to file
            const processedFile = new File([processedBlob], file.name, {
              type: file.type,
              lastModified: file.lastModified
            });

            processedFiles.push(processedFile);
            console.log(`✅ Processed ${file.name} with WASM`);
          } catch (error) {
            console.warn(`Failed to process ${file.name} with WASM, using original:`, error);
            processedFiles.push(file);
          }
        }

        filesToUpload = processedFiles;
      }

      const formData = new FormData();
      for (const file of filesToUpload) {
        formData.append('images', file);
      }

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

        {/* WASM Processing Controls */}
        <Card sx={{ border: '2px solid', borderColor: 'primary.light', bgcolor: 'primary.light' }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  🚀 WASM Image Processing
                </Typography>
                {wasmReady && (
                  <Chip
                    label="Ready"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useWasm}
                      onChange={(e) => setUseWasm(e.target.checked)}
                      disabled={!wasmReady}
                      color="primary"
                    />
                  }
                  label="Enable WASM Processing"
                />

                {useWasm && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pl: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      Processing Options:
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <TextField
                        label="Max Width"
                        type="number"
                        value={wasmOptions.maxWidth}
                        onChange={(e) => setWasmOptions(prev => ({ ...prev, maxWidth: parseInt(e.target.value) || 1920 }))}
                        size="small"
                      />
                      <TextField
                        label="Max Height"
                        type="number"
                        value={wasmOptions.maxHeight}
                        onChange={(e) => setWasmOptions(prev => ({ ...prev, maxHeight: parseInt(e.target.value) || 1080 }))}
                        size="small"
                      />
                      <TextField
                        label="Quality"
                        type="number"
                        inputProps={{ min: 0.1, max: 1, step: 0.1 }}
                        value={wasmOptions.quality}
                        onChange={(e) => setWasmOptions(prev => ({ ...prev, quality: parseFloat(e.target.value) || 0.9 }))}
                        size="small"
                      />
                      <TextField
                        label="Brightness"
                        type="number"
                        inputProps={{ min: -100, max: 100 }}
                        value={wasmOptions.brightness}
                        onChange={(e) => setWasmOptions(prev => ({ ...prev, brightness: parseInt(e.target.value) || 0 }))}
                        size="small"
                      />
                      <TextField
                        label="Contrast"
                        type="number"
                        inputProps={{ min: -100, max: 100 }}
                        value={wasmOptions.contrast}
                        onChange={(e) => setWasmOptions(prev => ({ ...prev, contrast: parseInt(e.target.value) || 0 }))}
                        size="small"
                      />
                      <TextField
                        label="Saturation"
                        type="number"
                        inputProps={{ min: -100, max: 100 }}
                        value={wasmOptions.saturation}
                        onChange={(e) => setWasmOptions(prev => ({ ...prev, saturation: parseInt(e.target.value) || 0 }))}
                        size="small"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <TextField
                        label="Blur Radius"
                        type="number"
                        inputProps={{ min: 0, max: 10 }}
                        value={wasmOptions.blur}
                        onChange={(e) => setWasmOptions(prev => ({ ...prev, blur: parseInt(e.target.value) || 0 }))}
                        size="small"
                        sx={{ width: 120 }}
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={wasmOptions.sharpen || false}
                            onChange={(e) => setWasmOptions(prev => ({ ...prev, sharpen: e.target.checked }))}
                            color="secondary"
                          />
                        }
                        label="Sharpen"
                      />
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setWasmOptions({
                        maxWidth: 1920,
                        maxHeight: 1080,
                        quality: 0.9,
                        brightness: 0,
                        contrast: 0,
                        saturation: 0,
                        blur: 0,
                        sharpen: false
                      })}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Reset to Defaults
                    </Button>
                  </Box>
                )}

                {!wasmReady && (
                  <Typography variant="body2" color="warning.main" sx={{ fontStyle: 'italic' }}>
                    WASM processor is initializing... Some features may not be available.
                  </Typography>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
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