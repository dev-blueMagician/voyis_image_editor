import { app, BrowserWindow, ipcMain, IpcMainEvent, dialog } from "electron";
import path from "path";
import fs from "fs";
import sharp from "sharp";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;

  const url = isDev
    ? "http://localhost:3000"
    : "http://localhost:3000"; // Next.js server started by Electron

  mainWindow.loadURL(url);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/* -------------------------------
     IPC EVENTS (Typed)
-------------------------------- */

ipcMain.on(
  "upload-images",
  (
    event: IpcMainEvent,
    files: string[],
    folderPath: string
  ): void => {
    console.log("Upload request", files, folderPath);
  }
);

ipcMain.on(
  "convert-images",
  (
    event: IpcMainEvent,
    files: string[],
    folderPath: string,
    format: string
  ): void => {
    console.log("Convert request", files, folderPath, format);
  }
);

// Handle folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// Handle image export with format conversion
ipcMain.handle('export-images', async (event, files: any[], folderPath: string, format: string) => {
  try {
    for (const file of files) {
      const response = await fetch(`http://localhost:3001${file.url}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Convert image format using Sharp
      let outputBuffer: Buffer;
      const outputPath = path.join(folderPath, `${file.name.split('.')[0]}.${format}`);

      switch (format) {
        case 'jpeg':
        case 'jpg':
          outputBuffer = await sharp(buffer).jpeg().toBuffer();
          break;
        case 'png':
          outputBuffer = await sharp(buffer).png().toBuffer();
          break;
        case 'tiff':
          outputBuffer = await sharp(buffer).tiff().toBuffer();
          break;
        default:
          outputBuffer = buffer;
      }

      fs.writeFileSync(outputPath, outputBuffer);
    }

    return { success: true };
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
});

// // Handle saving cropped image
// ipcMain.handle('save-cropped-image', async (event, base64Data: string, filename: string) => {
//   try {
//     const result = await dialog.showSaveDialog(mainWindow!, {
//       title: 'Save Cropped Image',
//       defaultPath: filename,
//       filters: [
//         { name: 'PNG Images', extensions: ['png'] },
//         { name: 'All Files', extensions: ['*'] }
//       ]
//     });

//     if (result.canceled || !result.filePath) {
//       return { success: false, canceled: true };
//     }

//     // Convert base64 to buffer and save
//     const buffer = Buffer.from(base64Data, 'base64');
//     fs.writeFileSync(result.filePath, buffer);

//     return { success: true, filePath: result.filePath };
//   } catch (error) {
//     console.error('Save cropped image error:', error);
//     throw error;
//   }
// });

/* -------------------------------
     APP LIFE CYCLE
-------------------------------- */

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
