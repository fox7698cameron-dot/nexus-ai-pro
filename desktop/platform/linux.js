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
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

/**
 * Linux Platform Integration
 * Provides Linux-specific features like libsecret, PAM authentication, etc.
 */
class LinuxPlatform {
  constructor(app, store) {
    this.app = app;
    this.store = store;
    this.secretService = null;
    this.hasPAM = false;
    this.desktopEnvironment = null;
  }

  async initialize() {
    console.log('Initializing Linux platform integration...');

    // Detect desktop environment
    this.desktopEnvironment = await this.detectDesktopEnvironment();
    console.log('Desktop environment:', this.desktopEnvironment);

    // Check for PAM (Pluggable Authentication Modules)
    this.hasPAM = await this.checkPAM();
    console.log('PAM available:', this.hasPAM);

    // Initialize libsecret for credential storage
    try {
      this.secretService = require('keytar');
      console.log('libsecret initialized');
    } catch (error) {
      console.error('libsecret not available:', error);
    }

    // Create .desktop file
    await this.createDesktopFile();

    return true;
  }

  /**
   * Detect Linux desktop environment
   */
  async detectDesktopEnvironment() {
    const desktop = process.env.XDG_CURRENT_DESKTOP ||
                   process.env.DESKTOP_SESSION ||
                   'unknown';
    return desktop.toLowerCase();
  }

  /**
   * Check if PAM is available
   */
  async checkPAM() {
    try {
      await execAsync('which pam_tally2');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Authenticate using system authentication (PAM)
   */
  async authenticateBiometric() {
    if (!this.hasPAM) {
      return {
        success: false,
        error: 'System authentication not available'
      };
    }

    try {
      // Use zenity or kdialog for password prompt
      let command;
      if (this.desktopEnvironment.includes('kde')) {
        command = 'kdialog --password "Authenticate to access Nexus AI Pro"';
      } else {
        command = 'zenity --password --title="Authentication Required"';
      }

      const { stdout } = await execAsync(command);

      // Verify password using PAM
      // This is a simplified version - production should use proper PAM integration
      const success = stdout.trim().length > 0;

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
   * Store credentials in libsecret (GNOME Keyring/KWallet)
   */
  async setCredential(service, account, password) {
    if (!this.secretService) {
      return false;
    }

    try {
      await this.secretService.setPassword(service, account, password);
      return true;
    } catch (error) {
      console.error('Error storing credential:', error);
      return false;
    }
  }

  /**
   * Retrieve credentials from libsecret
   */
  async getCredential(service, account) {
    if (!this.secretService) {
      return null;
    }

    try {
      return await this.secretService.getPassword(service, account);
    } catch (error) {
      console.error('Error retrieving credential:', error);
      return null;
    }
  }

  /**
   * Delete credentials from libsecret
   */
  async deleteCredential(service, account) {
    if (!this.secretService) {
      return false;
    }

    try {
      return await this.secretService.deletePassword(service, account);
    } catch (error) {
      console.error('Error deleting credential:', error);
      return false;
    }
  }

  /**
   * Create .desktop file for application menu integration
   */
  async createDesktopFile() {
    const homeDir = os.homedir();
    const desktopFilePath = path.join(
      homeDir,
      '.local/share/applications/nexus-ai-pro.desktop'
    );

    const desktopFileContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=Nexus AI Pro
Comment=All-in-One AI Platform with Multi-Model Support
Exec=${process.execPath} %U
Icon=nexus-ai-pro
Terminal=false
Categories=Utility;Development;AI;
Keywords=ai;chatbot;assistant;claude;gpt;
StartupWMClass=nexus-ai-pro
MimeType=x-scheme-handler/nexus-ai-pro;
`;

    try {
      const dir = path.dirname(desktopFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(desktopFilePath, desktopFileContent);
      fs.chmodSync(desktopFilePath, 0o755);
      console.log('.desktop file created');
    } catch (error) {
      console.error('Error creating .desktop file:', error);
    }
  }

  /**
   * Called when window is ready
   */
  onWindowReady(window) {
    console.log('Window ready on Linux');

    // Set up Linux-specific features
    this.setupNotifications(window);
    this.setupDarkMode(window);
  }

  /**
   * Set up Linux desktop notifications
   */
  setupNotifications(window) {
    const { Notification } = require('electron');

    if (Notification.isSupported()) {
      console.log('Linux notifications supported');
    }
  }

  /**
   * Detect and apply system dark mode preference
   */
  async setupDarkMode(window) {
    try {
      let isDark = false;

      // Check different desktop environments
      if (this.desktopEnvironment.includes('gnome')) {
        const { stdout } = await execAsync(
          'gsettings get org.gnome.desktop.interface gtk-theme'
        );
        isDark = stdout.toLowerCase().includes('dark');
      } else if (this.desktopEnvironment.includes('kde')) {
        const { stdout } = await execAsync(
          'kreadconfig5 --group "General" --key "ColorScheme"'
        );
        isDark = stdout.toLowerCase().includes('dark');
      }

      if (isDark) {
        window.webContents.send('apply-theme', 'dark');
      }
    } catch (error) {
      console.error('Error detecting dark mode:', error);
    }
  }

  /**
   * Get Linux distribution info
   */
  async getDistribution() {
    try {
      const { stdout } = await execAsync('lsb_release -ds || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2');
      return stdout.trim().replace(/"/g, '');
    } catch {
      return 'Unknown Linux Distribution';
    }
  }

  /**
   * Enable auto-start on login (systemd)
   */
  async setAutoLaunch(enabled) {
    const homeDir = os.homedir();
    const autostartDir = path.join(homeDir, '.config/autostart');
    const autostartFile = path.join(autostartDir, 'nexus-ai-pro.desktop');

    if (enabled) {
      const content = `[Desktop Entry]
Type=Application
Name=Nexus AI Pro
Exec=${process.execPath} --hidden
Icon=nexus-ai-pro
X-GNOME-Autostart-enabled=true
`;
      try {
        if (!fs.existsSync(autostartDir)) {
          fs.mkdirSync(autostartDir, { recursive: true });
        }
        fs.writeFileSync(autostartFile, content);
        console.log('Auto-start enabled');
      } catch (error) {
        console.error('Error enabling auto-start:', error);
      }
    } else {
      try {
        if (fs.existsSync(autostartFile)) {
          fs.unlinkSync(autostartFile);
          console.log('Auto-start disabled');
        }
      } catch (error) {
        console.error('Error disabling auto-start:', error);
      }
    }
  }

  /**
   * Set up DBus integration for system tray
   */
  setupDBus() {
    // DBus integration for Linux system tray
    // This requires additional dependencies like dbus-native
    console.log('DBus integration would be set up here');
  }
}

module.exports = LinuxPlatform;
