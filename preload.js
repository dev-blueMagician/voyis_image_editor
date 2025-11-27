const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  exportImages: (files, folderPath, format) => ipcRenderer.invoke('export-images', files, folderPath, format),
  // saveCroppedImage: (base64Data, filename) => ipcRenderer.invoke('save-cropped-image', base64Data, filename)
});
