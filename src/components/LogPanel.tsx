'use client';

import { useState, useEffect } from 'react';
import {
  Chip,
  Box,
  Typography
} from '@mui/material';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export default function LogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Mock logs
    const mockLogs: LogEntry[] = [
      { id: 1, timestamp: new Date().toISOString(), message: 'Application started', type: 'info' },
      { id: 2, timestamp: new Date().toISOString(), message: 'Connected to server', type: 'success' },
    ];
    setLogs(mockLogs);
  }, []);

  const addLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const newLog: LogEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      message,
      type,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
  };

  // Expose addLog to window for global use
  useEffect(() => {
    (window as any).addLog = addLog;
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        📋 System Logs
      </Typography>
      <Box sx={{ height: 128, width: '100%', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {logs.map((log) => (
            <Box key={log.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: 1, bgcolor: 'grey.50' }}>
              <Chip
                color={
                  log.type === 'error' ? 'error' :
                  log.type === 'success' ? 'success' :
                  'primary'
                }
                variant="filled"
                size="small"
                label={log.type.toUpperCase()}
                sx={{ fontSize: '0.75rem' }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </Typography>
              <Typography variant="caption" sx={{ flex: 1 }}>
                {log.message}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}