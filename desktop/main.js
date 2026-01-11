/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { platform } = require('os');

// Platform-specific modules
const WindowsPlatform = require('./platform/windows');
const LinuxPlatform = require('./platform/linux');
const MacOSPlatform = require('./platform/macos');

// Initialize secure storage
const store = new Store({
  encryptionKey: 'nexus-ai-pro-secure-key-' + app.getVersion(),
  name: 'nexus-config'
});

let mainWindow;
let tray;
let platformHelper;

// Determine platform
const currentPlatform = platform();
const isDev = process.env.NODE_ENV === 'development';
const isWindows = currentPlatform === 'win32';
const isMac = currentPlatform === 'darwin';
const isLinux = currentPlatform === 'linux';

// Initialize platform-specific helper
function initializePlatform() {
  if (isWindows) {
    platformHelper = new WindowsPlatform(app, store);
  } else if (isLinux) {
    platformHelper = new LinuxPlatform(app, store);
  } else if (isMac) {
    platformHelper = new MacOSPlatform(app, store);
  }
  
  return platformHelper.initialize();
}

// Create main window
function createWindow() {
  const windowState = store.get('windowState', {
    width: 1400,
    height: 900,
    x: undefined,
    y: undefined
  });

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0A0A0A',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    frame: !isWindows, // Frameless on Windows for custom title bar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build', isWindows ? 'icon.ico' : 'icon.png'),
    show: false, // Don't show until ready
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Platform-specific initialization
    if (platformHelper) {
      platformHelper.onWindowReady(mainWindow);
    }
  });

  // Save window state on close
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      
      // Minimize to tray on close (configurable)
      const minimizeToTray = store.get('minimizeToTray', true);
      if (minimizeToTray && tray) {
        mainWindow.hide();
      } else {
        app.quit();
      }
    } else {
      const bounds = mainWindow.getBounds();
      store.set('windowState', bounds);
    }
  });

  // Window state events
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', 'normal');
  });

  // External links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

// Create system tray
function createTray() {
  const trayIcon = path.join(__dirname, 'build', isWindows ? 'tray.ico' : 'tray.png');
  
  if (!fs.existsSync(trayIcon)) {
    console.log('Tray icon not found, skipping tray creation');
    return;
  }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Nexus AI Pro',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('navigate-to', '/settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Nexus AI Pro');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Create application menu
function createMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-chat');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://nexusai.pro/docs');
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/nexus-ai-pro/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'About Nexus AI Pro',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Nexus AI Pro',
              message: 'Nexus AI Pro',
              detail: `Version: ${app.getVersion()}\nCopyright © 2025-2026 Cameron Fox\n\nAll-in-One AI Platform with Multi-Model Support`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
function setupIPC() {
  // Secure storage
  ipcMain.handle('store-get', (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('store-set', (event, key, value) => {
    store.set(key, value);
    return true;
  });

  ipcMain.handle('store-delete', (event, key) => {
    store.delete(key);
    return true;
  });

  // Platform-specific credential storage
  ipcMain.handle('credentials-set', async (event, service, account, password) => {
    if (platformHelper) {
      return await platformHelper.setCredential(service, account, password);
    }
    return false;
  });

  ipcMain.handle('credentials-get', async (event, service, account) => {
    if (platformHelper) {
      return await platformHelper.getCredential(service, account);
    }
    return null;
  });

  ipcMain.handle('credentials-delete', async (event, service, account) => {
    if (platformHelper) {
      return await platformHelper.deleteCredential(service, account);
    }
    return false;
  });

  // Biometric authentication
  ipcMain.handle('biometric-auth', async (event) => {
    if (platformHelper) {
      return await platformHelper.authenticateBiometric();
    }
    return { success: false, error: 'Biometric auth not available on this platform' };
  });

  // File operations
  ipcMain.handle('dialog-open-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('dialog-save-file', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });

  // System info
  ipcMain.handle('get-system-info', () => {
    return {
      platform: currentPlatform,
      version: app.getVersion(),
      isWindows,
      isMac,
      isLinux
    };
  });

  // Window controls (for frameless window on Windows)
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await initializePlatform();
  createWindow();
  createMenu();
  createTray();
  setupIPC();

  // Auto-launch support
  if (store.get('autoLaunch', false)) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true
    });
  }
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Error', error.message);
});

// Auto-update (production only)
if (!isDev && process.platform !== 'linux') {
  const { autoUpdater } = require('electron-updater');
  
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: 'A new version is available. It will be downloaded in the background.',
      buttons: ['OK']
    });
  });
  
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. The application will restart to install the update.',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}
