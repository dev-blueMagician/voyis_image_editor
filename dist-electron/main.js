"use strict";
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
let mainWindow = null;
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
ipcMain.on("upload-images", (event, files, folderPath) => {
    console.log("Upload request", files, folderPath);
});
ipcMain.on("convert-images", (event, files, folderPath, format) => {
    console.log("Convert request", files, folderPath, format);
});
// Handle folder selection
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (result.canceled) {
        return null;
    }
    return result.filePaths[0];
});
// Handle image export with format conversion
ipcMain.handle('export-images', async (event, files, folderPath, format) => {
    try {
        for (const file of files) {
            const response = await fetch(`http://localhost:3001${file.url}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Convert image format using Sharp
            let outputBuffer;
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
    }
    catch (error) {
        console.error('Export error:', error);
        throw error;
    }
});
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
