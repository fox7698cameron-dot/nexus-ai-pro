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

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Storage
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key)
  },

  // Credentials (Keychain/Credential Manager/libsecret)
  credentials: {
    set: (service, account, password) =>
      ipcRenderer.invoke('credentials-set', service, account, password),
    get: (service, account) =>
      ipcRenderer.invoke('credentials-get', service, account),
    delete: (service, account) =>
      ipcRenderer.invoke('credentials-delete', service, account)
  },

  // Biometric authentication
  biometric: {
    authenticate: () => ipcRenderer.invoke('biometric-auth')
  },

  // File dialogs
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog-open-file', options),
    saveFile: (options) => ipcRenderer.invoke('dialog-save-file', options)
  },

  // System info
  system: {
    getInfo: () => ipcRenderer.invoke('get-system-info')
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close')
  },

  // Event listeners
  on: (channel, callback) => {
    const validChannels = [
      'new-chat',
      'navigate-to',
      'window-state-changed',
      'update-available',
      'update-downloaded'
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // Remove listeners
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// Platform detection
contextBridge.exposeInMainWorld('platform', {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  type: process.platform
});

// Version info
contextBridge.exposeInMainWorld('appVersion', {
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node
});
