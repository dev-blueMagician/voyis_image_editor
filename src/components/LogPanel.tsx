'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, Chip, ScrollShadow } from '@nextui-org/react';

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
    <div className="w-full">
      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
        📋 System Logs
      </h3>
      <ScrollShadow className="h-32 w-full">
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <Chip
                color={
                  log.type === 'error' ? 'danger' :
                  log.type === 'success' ? 'success' :
                  'primary'
                }
                variant="flat"
                size="sm"
                className="text-xs"
              >
                {log.type.toUpperCase()}
              </Chip>
              <span className="text-xs text-gray-600 font-mono">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-xs flex-1">{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollShadow>
    </div>
  );
}