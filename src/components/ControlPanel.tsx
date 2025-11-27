'use client';

import { useState } from 'react';
import {
  Button,
  LinearProgress,
  Chip,
  Box,
  Typography
} from '@mui/material';
import axios from 'axios';

export default function ControlPanel() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setProgress(0);

    try {
      // Simulate sync progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      await axios.post('http://localhost:3001/sync');
      setLastSync(new Date().toLocaleString());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        ⚙️ Control Panel
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSync}
          disabled={syncing}
          size="large"
          startIcon={<span>🔄</span>}
          sx={{ width: '100%' }}
        >
          {syncing ? 'Syncing...' : 'Sync with Server'}
        </Button>

        {syncing && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Synchronizing...</Typography>
              <Typography variant="body2">{progress}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              color="primary"
              sx={{ width: '100%' }}
            />
          </Box>
        )}

        {lastSync && (
          <Chip
            color="success"
            variant="filled"
            size="small"
            label={`Last sync: ${lastSync}`}
          />
        )}

      </Box>
    </Box>
  );
}