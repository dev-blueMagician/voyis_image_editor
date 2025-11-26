// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-compositing');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--no-sandbox');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false,
    },
  });

  // Load your Next.js app
  mainWindow.loadURL('http://localhost:3000');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('save-files', async (event, files, folderPath) => {
  for (const file of files) {
    const response = await fetch(file.url);
    const buffer = await response.arrayBuffer();
    const filePath = path.join(folderPath, file.name);
    fs.writeFileSync(filePath, Buffer.from(buffer));
  }
  return true;
});

ipcMain.handle('export-images', async (event, files, folderPath, format) => {
  for (const file of files) {
    try {
      // Download the image
      const response = await fetch(file.url);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Convert format using Sharp
      let sharpInstance = sharp(buffer);

      // Apply format conversion
      switch (format) {
        case 'jpg':
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality: 90 });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality: 90 });
          break;
        case 'tiff':
          sharpInstance = sharpInstance.tiff({ quality: 90 });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: 90 });
          break;
        default:
          // Keep original format
          break;
      }

      // Generate output filename
      const ext = format === 'jpg' ? 'jpg' : format;
      const baseName = path.parse(file.name).name;
      const outputFileName = `${baseName}.${ext}`;
      const outputPath = path.join(folderPath, outputFileName);

      // Save converted image
      await sharpInstance.toFile(outputPath);
    } catch (error) {
      console.error(`Failed to export ${file.name}:`, error);
      throw error;
    }
  }
  return true;
});

// Electron events
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
