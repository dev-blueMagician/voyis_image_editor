'use client';

import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
  Input,
  Chip
} from '@nextui-org/react';

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
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader>
          <h3 className="text-xl font-semibold">Batch Export Images</h3>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Exporting <Chip color="primary" size="sm">{selectedCount}</Chip> selected images
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Output Format</label>
            <Select
              placeholder="Select format"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full"
            >
              {formatOptions.map((format) => (
                <SelectItem key={format.key} value={format.key}>
                  {format.label} ({format.extension})
                </SelectItem>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Output Folder</label>
            <div className="flex gap-2">
              <Input
                placeholder="Select output folder..."
                value={outputFolder}
                readOnly
                className="flex-1"
              />
              <Button
                color="secondary"
                variant="flat"
                onPress={handleSelectFolder}
                startContent={<span>📁</span>}
              >
                Browse
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Images will be converted to the selected format and saved to the chosen folder.
              Original files will not be modified.
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            color="default"
            variant="light"
            onPress={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleExport}
            disabled={!selectedFormat || !outputFolder || isExporting}
            isLoading={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Images'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}