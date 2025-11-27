"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    const isDev = !electron_1.app.isPackaged;
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
electron_1.ipcMain.on("upload-images", (event, files, folderPath) => {
    console.log("Upload request", files, folderPath);
});
electron_1.ipcMain.on("convert-images", (event, files, folderPath, format) => {
    console.log("Convert request", files, folderPath, format);
});
// Handle folder selection
electron_1.ipcMain.handle('select-folder', async () => {
    const result = await electron_1.dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
});
// Handle image export with format conversion
electron_1.ipcMain.handle('export-images', async (event, files, folderPath, format) => {
    try {
        for (const file of files) {
            const response = await fetch(`http://localhost:3001${file.url}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Convert image format using Sharp
            let outputBuffer;
            const outputPath = path_1.default.join(folderPath, `${file.name.split('.')[0]}.${format}`);
            switch (format) {
                case 'jpeg':
                case 'jpg':
                    outputBuffer = await (0, sharp_1.default)(buffer).jpeg().toBuffer();
                    break;
                case 'png':
                    outputBuffer = await (0, sharp_1.default)(buffer).png().toBuffer();
                    break;
                case 'tiff':
                    outputBuffer = await (0, sharp_1.default)(buffer).tiff().toBuffer();
                    break;
                default:
                    outputBuffer = buffer;
            }
            fs_1.default.writeFileSync(outputPath, outputBuffer);
        }
        return { success: true };
    }
    catch (error) {
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
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on("activate", () => {
        if (mainWindow === null) {
            createWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
