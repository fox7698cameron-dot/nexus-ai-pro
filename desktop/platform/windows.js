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

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Windows Platform Integration
 * Provides Windows-specific features like Windows Hello, Credential Manager, etc.
 */
class WindowsPlatform {
  constructor(app, store) {
    this.app = app;
    this.store = store;
    this.credentialManager = null;
    this.isWindowsHelloAvailable = false;
  }

  async initialize() {
    console.log('Initializing Windows platform integration...');

    // Check for Windows Hello availability
    try {
      this.isWindowsHelloAvailable = await this.checkWindowsHello();
      console.log('Windows Hello available:', this.isWindowsHelloAvailable);
    } catch (error) {
      console.error('Error checking Windows Hello:', error);
    }

    // Initialize credential manager
    try {
      this.credentialManager = require('keytar');
      console.log('Credential Manager initialized');
    } catch (error) {
      console.error('Credential Manager not available:', error);
    }

    return true;
  }

  /**
   * Check if Windows Hello is available
   */
  async checkWindowsHello() {
    try {
      // Use PowerShell to check for biometric devices
      const { stdout } = await execAsync(
        'powershell -Command "Get-WmiObject Win32_BiometricDevice | Measure-Object | Select-Object -ExpandProperty Count"'
      );
      return parseInt(stdout.trim()) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Authenticate using Windows Hello
   */
  async authenticateBiometric() {
    if (!this.isWindowsHelloAvailable) {
      return {
        success: false,
        error: 'Windows Hello not available on this device'
      };
    }

    try {
      // Use PowerShell to trigger Windows Hello authentication
      const { stdout } = await execAsync(
        'powershell -Command "$cred = Get-Credential -Message \'Authenticate with Windows Hello\'; if ($cred) { \'success\' } else { \'failed\' }"'
      );

      const success = stdout.trim() === 'success';
      return {
        success,
        error: success ? null : 'Authentication failed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store credentials in Windows Credential Manager
   */
  async setCredential(service, account, password) {
    if (!this.credentialManager) {
      return false;
    }

    try {
      await this.credentialManager.setPassword(service, account, password);
      return true;
    } catch (error) {
      console.error('Error storing credential:', error);
      return false;
    }
  }

  /**
   * Retrieve credentials from Windows Credential Manager
   */
  async getCredential(service, account) {
    if (!this.credentialManager) {
      return null;
    }

    try {
      return await this.credentialManager.getPassword(service, account);
    } catch (error) {
      console.error('Error retrieving credential:', error);
      return null;
    }
  }

  /**
   * Delete credentials from Windows Credential Manager
   */
  async deleteCredential(service, account) {
    if (!this.credentialManager) {
      return false;
    }

    try {
      return await this.credentialManager.deletePassword(service, account);
    } catch (error) {
      console.error('Error deleting credential:', error);
      return false;
    }
  }

  /**
   * Called when window is ready
   */
  onWindowReady(window) {
    // Windows-specific window customization
    console.log('Window ready on Windows');

    // Set up Windows-specific features
    this.setupJumpList();
    this.setupNotifications(window);
  }

  /**
   * Set up Windows Jump List
   */
  setupJumpList() {
    this.app.setJumpList([
      {
        type: 'custom',
        name: 'Quick Actions',
        items: [
          {
            type: 'task',
            title: 'New Chat',
            description: 'Start a new conversation',
            program: process.execPath,
            args: '--new-chat',
            iconPath: process.execPath,
            iconIndex: 0
          }
        ]
      }
    ]);
  }

  /**
   * Set up Windows notifications
   */
  setupNotifications(window) {
    // Windows notification support
    const { Notification } = require('electron');

    if (Notification.isSupported()) {
      console.log('Windows notifications supported');
    }
  }

  /**
   * Get Windows version
   */
  async getWindowsVersion() {
    try {
      const { stdout } = await execAsync('ver');
      return stdout.trim();
    } catch {
      return 'Unknown';
    }
  }

  /**
   * Enable auto-start on login
   */
  setAutoLaunch(enabled) {
    this.app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
      path: process.execPath,
      args: ['--auto-start']
    });
  }
}

module.exports = WindowsPlatform;
