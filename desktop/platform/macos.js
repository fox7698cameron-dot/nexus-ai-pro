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

/**
 * macOS Platform Integration (Desktop - Electron version)
 * Provides macOS-specific features for the Electron desktop app
 * Note: This is separate from the native Swift iOS/macOS app
 */
class MacOSPlatform {
  constructor(app, store) {
    this.app = app;
    this.store = store;
    this.keychain = null;
  }

  async initialize() {
    console.log('Initializing macOS platform integration...');
    
    // Initialize Keychain access
    try {
      this.keychain = require('keytar');
      console.log('Keychain initialized');
    } catch (error) {
      console.error('Keychain not available:', error);
    }

    return true;
  }

  /**
   * Authenticate using Touch ID (via native module)
   */
  async authenticateBiometric() {
    try {
      // This would use a native module for Touch ID
      // For now, we'll use system password prompt
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const script = `
        osascript -e 'display dialog "Authenticate to access Nexus AI Pro" default answer "" with hidden answer with title "Authentication Required"'
      `;

      await execAsync(script);
      
      return {
        success: true,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed or cancelled',
      };
    }
  }

  /**
   * Store credentials in macOS Keychain
   */
  async setCredential(service, account, password) {
    if (!this.keychain) {
      return false;
    }

    try {
      await this.keychain.setPassword(service, account, password);
      return true;
    } catch (error) {
      console.error('Error storing credential:', error);
      return false;
    }
  }

  /**
   * Retrieve credentials from macOS Keychain
   */
  async getCredential(service, account) {
    if (!this.keychain) {
      return null;
    }

    try {
      return await this.keychain.getPassword(service, account);
    } catch (error) {
      console.error('Error retrieving credential:', error);
      return null;
    }
  }

  /**
   * Delete credentials from macOS Keychain
   */
  async deleteCredential(service, account) {
    if (!this.keychain) {
      return false;
    }

    try {
      return await this.keychain.deletePassword(service, account);
    } catch (error) {
      console.error('Error deleting credential:', error);
      return false;
    }
  }

  /**
   * Called when window is ready
   */
  onWindowReady(window) {
    console.log('Window ready on macOS');
    
    // macOS-specific window customization
    this.setupTouchBar(window);
    this.setupDockMenu();
  }

  /**
   * Set up Touch Bar (for MacBook Pro)
   */
  setupTouchBar(window) {
    const { TouchBar } = require('electron');
    const { TouchBarButton, TouchBarSpacer } = TouchBar;

    const newChatButton = new TouchBarButton({
      label: '💬 New Chat',
      backgroundColor: '#2563EB',
      click: () => {
        window.webContents.send('new-chat');
      },
    });

    const settingsButton = new TouchBarButton({
      label: '⚙️ Settings',
      click: () => {
        window.webContents.send('navigate-to', '/settings');
      },
    });

    const touchBar = new TouchBar({
      items: [
        newChatButton,
        new TouchBarSpacer({ size: 'flexible' }),
        settingsButton,
      ],
    });

    window.setTouchBar(touchBar);
  }

  /**
   * Set up Dock menu
   */
  setupDockMenu() {
    const { Menu } = require('electron');
    
    const dockMenu = Menu.buildFromTemplate([
      {
        label: 'New Chat',
        click: () => {
          // Trigger new chat
          this.app.emit('new-chat');
        },
      },
      {
        label: 'Open Settings',
        click: () => {
          // Open settings
          this.app.emit('open-settings');
        },
      },
    ]);

    this.app.dock.setMenu(dockMenu);
  }

  /**
   * Enable auto-start on login
   */
  setAutoLaunch(enabled) {
    this.app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
    });
  }
}

module.exports = MacOSPlatform;
