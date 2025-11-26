"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
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
