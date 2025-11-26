import { app, BrowserWindow, ipcMain, IpcMainEvent } from "electron";
import path from "path";

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
