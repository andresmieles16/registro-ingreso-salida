const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    autoHideMenuBar: true,
    title: 'Sistema de Registro'
  });

  const distPath = path.join(__dirname, 'dist', 'registro-ingreso-salida', 'browser');
  const indexPath = path.join(distPath, 'index.html');

  // Leer el index.html y reemplazar base href
  let htmlContent = fs.readFileSync(indexPath, 'utf-8');
  htmlContent = htmlContent.replace('<base href="/">', '<base href="./">');

  // Escribir el archivo modificado
  const tempIndex = path.join(distPath, 'index-electron.html');
  fs.writeFileSync(tempIndex, htmlContent);

  win.loadFile(tempIndex);

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Error cargando:', errorCode, errorDescription);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
