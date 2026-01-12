// main.js
// Nexus AI Pro - Electron Main Process
// Military-Grade Encrypted Desktop Application

const { app, BrowserWindow, ipcMain, Menu, Tray, nativeTheme } = require('electron');
const path = require('path');
const Store = require('electron-store');
const keytar = require('keytar');
const ElectronSecurityService = require('./electron-security-service');

// Initialize secure storage
const store = new Store({
  encryptionKey: 'nexus-ai-pro-encryption-key-v2',
  name: 'nexus-ai-config'
});

// Service name for keychain
const SERVICE_NAME = 'NexusAIPro';

// Initialize security service
const securityService = new ElectronSecurityService();

let mainWindow;
let tray;

// Force dark mode
nativeTheme.themeSource = 'dark';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0D0D0D',
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Handle window events
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
}

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets/tray-icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Nexus AI Pro', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Nova - General Assistant', type: 'radio', checked: true },
    { label: 'Cipher - Security Expert', type: 'radio' },
    { label: 'Atlas - Research', type: 'radio' },
    { label: 'Pulse - Creative', type: 'radio' },
    { label: 'Sentinel - Automation', type: 'radio' },
    { label: 'Oracle - Analysis', type: 'radio' },
    { type: 'separator' },
    { label: 'Settings', click: () => mainWindow?.webContents.send('open-settings') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);

  tray.setToolTip('Nexus AI Pro');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

// Create app menu
function createMenu() {
  const template = [
    {
      label: 'Nexus AI Pro',
      submenu: [
        { label: 'About Nexus AI Pro', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('open-settings') },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'Shift+CmdOrCtrl+R', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' }
      ]
    },
    {
      label: 'Assistants',
      submenu: [
        { label: '🚀 Nova', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.send('switch-assistant', 'nova') },
        { label: '🔐 Cipher', accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.send('switch-assistant', 'cipher') },
        { label: '🌍 Atlas', accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.webContents.send('switch-assistant', 'atlas') },
        { label: '💫 Pulse', accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.webContents.send('switch-assistant', 'pulse') },
        { label: '⚡ Sentinel', accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.webContents.send('switch-assistant', 'sentinel') },
        { label: '🔮 Oracle', accelerator: 'CmdOrCtrl+6', click: () => mainWindow?.webContents.send('switch-assistant', 'oracle') }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Documentation', click: () => require('electron').shell.openExternal('https://docs.nexusai.pro') },
        { label: 'Report Issue', click: () => require('electron').shell.openExternal('https://github.com/nexusai/pro/issues') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for secure API key storage
ipcMain.handle('store-api-key', async (event, provider, key) => {
  try {
    await keytar.setPassword(SERVICE_NAME, provider, key);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-api-key', async (event, provider) => {
  try {
    const key = await keytar.getPassword(SERVICE_NAME, provider);
    return { success: true, key };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-api-key', async (event, provider) => {
  try {
    await keytar.deletePassword(SERVICE_NAME, provider);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// IPC Handlers for settings
ipcMain.handle('get-settings', () => {
  return store.store;
});

ipcMain.handle('set-setting', (event, key, value) => {
  store.set(key, value);
  return { success: true };
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new windows
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});

// Security: CSP headers
app.on('web-contents-created', (event, contents) => {
  contents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"]
      }
    });
  });
});
