// preload.js
// Nexus AI Pro - Electron Preload Script
// Secure bridge between renderer and main process

const { contextBridge, ipcRenderer } = require('electron');

// Expose secure APIs to renderer
contextBridge.exposeInMainWorld('nexusAPI', {
  // API Key Management (uses system keychain)
  storeAPIKey: (provider, key) => ipcRenderer.invoke('store-api-key', provider, key),
  getAPIKey: (provider) => ipcRenderer.invoke('get-api-key', provider),
  deleteAPIKey: (provider) => ipcRenderer.invoke('delete-api-key', provider),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  
  // Platform info
  platform: process.platform,
  version: process.versions.electron,
  
  // Event listeners
  onSwitchAssistant: (callback) => ipcRenderer.on('switch-assistant', (event, assistant) => callback(assistant)),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback()),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Security: Disable remote module
delete window.require;
delete window.exports;
delete window.module;

console.log('Nexus AI Pro preload script loaded');
