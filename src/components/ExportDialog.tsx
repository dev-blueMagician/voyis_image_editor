'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Box,
  Typography
} from '@mui/material';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onExport: (format: string, folderPath: string) => void;
}

const formatOptions = [
  { key: 'jpg', label: 'JPEG', extension: '.jpg' },
  { key: 'png', label: 'PNG', extension: '.png' },
  { key: 'tiff', label: 'TIFF', extension: '.tiff' },
  { key: 'webp', label: 'WebP', extension: '.webp' },
];

export default function ExportDialog({
  isOpen,
  onClose,
  selectedCount,
  onExport
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('jpg');
  const [outputFolder, setOutputFolder] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!selectedFormat || !outputFolder) return;

    setIsExporting(true);
    try {
      await onExport(selectedFormat, outputFolder);
      onClose();
      setOutputFolder('');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectFolder = async () => {
    // This will be handled by the parent component using Electron IPC
    const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
    if (ipcRenderer) {
      try {
        const folderPath = await ipcRenderer.invoke('select-folder');
        if (folderPath) {
          setOutputFolder(folderPath);
        }
      } catch (error) {
        console.error('Failed to select folder:', error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="h2">
          Batch Export Images
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Exporting <Chip color="primary" size="small" label={selectedCount} /> selected images
            </Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Output Format</InputLabel>
            <Select
              value={selectedFormat}
              label="Output Format"
              onChange={(e: any) => setSelectedFormat(e.target.value)}
            >
              {formatOptions.map((format) => (
                <MenuItem key={format.key} value={format.key}>
                  {format.label} ({format.extension})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              Output Folder
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                placeholder="Select output folder..."
                value={outputFolder}
                InputProps={{ readOnly: true }}
                fullWidth
              />
              <Button
                variant="outlined"
                onClick={handleSelectFolder}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                📁
              </Button>
            </Box>
          </Box>

          <Box sx={{ bgcolor: 'info.main', color: 'info.contrastText', p: 2, borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Images will be converted to the selected format and saved to the chosen folder.
              Original files will not be modified.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          onClick={onClose}
          disabled={isExporting}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          disabled={!selectedFormat || !outputFolder || isExporting}
          variant="contained"
          color="primary"
        >
          {isExporting ? 'Exporting...' : 'Export Images'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}