'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  PlayArrow as ImportIcon
} from '@mui/icons-material';
import axios from 'axios';

interface FolderConfig {
  id: string;
  name: string;
  description: string;
  path: string;
  fileTypes: string[];
  recursive: boolean;
  maxDepth: number;
  includePatterns: string[];
  excludePatterns: string[];
  enabled: boolean;
  autoImport: boolean;
  lastImported: string | null;
}

interface ImportResult {
  found: number;
  processed: number;
  skipped: number;
  errors: number;
  files: any[];
}

export default function FolderConfigPanel() {
  const [configs, setConfigs] = useState<FolderConfig[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{ [key: string]: ImportResult }>({});

  // Dialog states
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<FolderConfig | null>(null);
  const [configForm, setConfigForm] = useState<Partial<FolderConfig>>({
    name: '',
    description: '',
    path: '',
    fileTypes: ['jpg', 'png'],
    recursive: true,
    maxDepth: 3,
    includePatterns: ['*'],
    excludePatterns: [],
    enabled: true,
    autoImport: false
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await axios.get('http://localhost:3001/folder-configs');
      setConfigs(response.data.configs);
      setGlobalSettings(response.data.globalSettings);
    } catch (error) {
      console.error('Failed to load folder configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = () => {
    setEditingConfig(null);
    setConfigForm({
      name: '',
      description: '',
      path: '',
      fileTypes: ['jpg', 'png'],
      recursive: true,
      maxDepth: 3,
      includePatterns: ['*'],
      excludePatterns: [],
      enabled: true,
      autoImport: false
    });
    setConfigDialogOpen(true);
  };

  const handleEditConfig = (config: FolderConfig) => {
    setEditingConfig(config);
    setConfigForm({ ...config });
    setConfigDialogOpen(true);
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this folder configuration?')) return;

    try {
      await axios.delete(`http://localhost:3001/folder-configs/${configId}`);
      await loadConfigs();
    } catch (error) {
      console.error('Failed to delete config:', error);
      alert('Failed to delete configuration');
    }
  };

  const handleSaveConfig = async () => {
    try {
      if (editingConfig) {
        await axios.put(`http://localhost:3001/folder-configs/${editingConfig.id}`, configForm);
      } else {
        await axios.post('http://localhost:3001/folder-configs', configForm);
      }
      setConfigDialogOpen(false);
      await loadConfigs();
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    }
  };

  const handleImportConfig = async (configId: string) => {
    setImporting(configId);
    try {
      const response = await axios.post(`http://localhost:3001/folder-configs/${configId}/import`);
      setImportResults(prev => ({
        ...prev,
        [configId]: response.data.results
      }));
      alert(`Import completed: ${response.data.results.processed} files processed`);
    } catch (error: any) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setImporting(null);
    }
  };

  const handleImportAll = async () => {
    if (!confirm('Import from all enabled folder configurations?')) return;

    setImporting('all');
    try {
      const response = await axios.post('http://localhost:3001/folder-configs/import-all');
      alert(`Batch import completed: ${response.data.results.length} configurations processed`);
      await loadConfigs();
    } catch (error: any) {
      console.error('Batch import failed:', error);
      alert(`Batch import failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setImporting(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        📁 Folder Configurations
      </Typography>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddConfig}
        >
          Add Configuration
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<ImportIcon />}
          onClick={handleImportAll}
          disabled={importing === 'all'}
        >
          {importing === 'all' ? <CircularProgress size={20} /> : 'Import All Enabled'}
        </Button>
      </Box>

      {/* Configurations List */}
      {configs.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FolderIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No folder configurations
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add a folder configuration to enable batch image imports
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddConfig}>
              Add Your First Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {configs.map((config) => (
            <Accordion key={config.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                  <FolderIcon color={config.enabled ? 'primary' : 'disabled'} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">{config.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {config.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Chip
                      label={config.enabled ? 'Enabled' : 'Disabled'}
                      color={config.enabled ? 'success' : 'default'}
                      size="small"
                    />
                    {config.lastImported && (
                      <Typography variant="caption" color="text.secondary">
                        Last: {new Date(config.lastImported).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Path:</strong> {config.path}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>File Types:</strong> {config.fileTypes.join(', ')}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Recursive:</strong> {config.recursive ? 'Yes' : 'No'}
                    {config.recursive && ` (Max Depth: ${config.maxDepth})`}
                  </Typography>
                  {importResults[config.id] && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Last Import Results:
                      </Typography>
                      <Typography variant="body2">
                        Found: {importResults[config.id].found} |
                        Processed: {importResults[config.id].processed} |
                        Skipped: {importResults[config.id].skipped} |
                        Errors: {importResults[config.id].errors}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ImportIcon />}
                    onClick={() => handleImportConfig(config.id)}
                    disabled={importing === config.id || !config.enabled}
                  >
                    {importing === config.id ? <CircularProgress size={16} /> : 'Import Now'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditConfig(config)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteConfig(config.id)}
                  >
                    Delete
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingConfig ? 'Edit Folder Configuration' : 'Add Folder Configuration'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={configForm.name}
              onChange={(e) => setConfigForm(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={configForm.description}
              onChange={(e) => setConfigForm(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Folder Path"
              value={configForm.path}
              onChange={(e) => setConfigForm(prev => ({ ...prev, path: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., ./images or /path/to/folder"
            />
            <TextField
              label="File Types (comma-separated)"
              value={configForm.fileTypes?.join(', ')}
              onChange={(e) => setConfigForm(prev => ({
                ...prev,
                fileTypes: e.target.value.split(',').map(s => s.trim())
              }))}
              fullWidth
              placeholder="jpg, png, tiff"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.recursive || false}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, recursive: e.target.checked }))}
                  />
                }
                label="Recursive"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.enabled || false}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                }
                label="Enabled"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={configForm.autoImport || false}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, autoImport: e.target.checked }))}
                  />
                }
                label="Auto Import"
              />
            </Box>
            {configForm.recursive && (
              <TextField
                label="Max Depth"
                type="number"
                value={configForm.maxDepth}
                onChange={(e) => setConfigForm(prev => ({ ...prev, maxDepth: parseInt(e.target.value) }))}
                inputProps={{ min: 1, max: 10 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConfig} variant="contained">
            {editingConfig ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}