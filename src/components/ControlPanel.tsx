'use client';

import { useState } from 'react';
import { Button, Card, CardBody, Progress, Chip, Spacer } from '@nextui-org/react';
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
    <div className="w-full">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        ⚙️ Control Panel
      </h3>

      <div className="space-y-4">
        <Button
          color="primary"
          onPress={handleSync}
          disabled={syncing}
          size="lg"
          startContent={<span>🔄</span>}
          className="w-full"
        >
          {syncing ? 'Syncing...' : 'Sync with Server'}
        </Button>

        {syncing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Synchronizing...</span>
              <span>{progress}%</span>
            </div>
            <Progress
              value={progress}
              color="primary"
              size="md"
              className="w-full"
            />
          </div>
        )}

        {lastSync && (
          <Chip color="success" variant="flat" size="sm">
            Last sync: {lastSync}
          </Chip>
        )}
        
      </div>
    </div>
  );
}