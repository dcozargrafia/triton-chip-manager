const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs-extra');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.loadFile('index.html')

  // Abre las herramientas de desarrollo
  // win.webContents.openDevTools()
  
  return win;
}

app.whenReady().then(() => {
  const mainWindow = createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('save-file', async (event, content, suggestedName) => {
    try {
        const { filePath } = await dialog.showSaveDialog({
            buttonLabel: 'Guardar archivo',
            defaultPath: path.join(app.getPath('documents'), suggestedName || 'output.csv'),
            filters: [{ name: 'CSV', extensions: ['csv'] }]
        });

        if (filePath) {
            // Asegurarse de que el archivo termine en .csv
            const finalPath = filePath.endsWith('.csv') ? filePath : `${filePath}.csv`;
            await fs.writeFile(finalPath, content);
            return { success: true, filePath: finalPath };
        }
        return { success: false, error: 'No se seleccionó una ubicación para guardar' };
    } catch (error) {
        console.error('Error al guardar el archivo:', error);
        return { success: false, error: error.message };
    }
});