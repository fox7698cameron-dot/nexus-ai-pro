/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Capacitor Native Bridge
 * Provides unified interface for native features across iOS, Android, and Web
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Platform detection
export const Platform = {
  isNative: Capacitor.isNativePlatform(),
  isIOS: Capacitor.getPlatform() === 'ios',
  isAndroid: Capacitor.getPlatform() === 'android',
  isWeb: Capacitor.getPlatform() === 'web',
  platform: Capacitor.getPlatform()
};

// App lifecycle management
export const AppLifecycle = {
  async initialize() {
    if (!Platform.isNative) return;

    // Hide splash screen
    await SplashScreen.hide();

    // Configure status bar
    if (Platform.isIOS || Platform.isAndroid) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0A0A0C' });
    }

    // Set up app state listeners
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active:', isActive);
      window.dispatchEvent(new CustomEvent('app-state-change', { detail: { isActive } }));
    });

    App.addListener('appUrlOpen', (event) => {
      console.log('App opened with URL:', event.url);
      window.dispatchEvent(new CustomEvent('app-url-open', { detail: event }));
    });

    // Keyboard listeners
    if (Platform.isNative) {
      Keyboard.addListener('keyboardWillShow', (info) => {
        window.dispatchEvent(new CustomEvent('keyboard-show', { detail: info }));
      });

      Keyboard.addListener('keyboardWillHide', () => {
        window.dispatchEvent(new CustomEvent('keyboard-hide'));
      });
    }

    return true;
  },

  async exitApp() {
    if (Platform.isAndroid) {
      await App.exitApp();
    }
  },

  async getInfo() {
    if (!Platform.isNative) {
      return {
        name: 'Nexus AI Pro',
        id: 'com.cameronfox.nexusaipro',
        version: '2.0.0',
        build: '1'
      };
    }
    return await App.getInfo();
  }
};

// Haptic feedback
export const HapticFeedback = {
  async impact(style = ImpactStyle.Medium) {
    if (!Platform.isNative) return;
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  },

  async notification(type = NotificationType.Success) {
    if (!Platform.isNative) return;
    try {
      await Haptics.notification({ type });
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  },

  async vibrate(duration = 100) {
    if (!Platform.isNative) return;
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  },

  async selectionStart() {
    if (!Platform.isNative) return;
    try {
      await Haptics.selectionStart();
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  },

  async selectionChanged() {
    if (!Platform.isNative) return;
    try {
      await Haptics.selectionChanged();
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  },

  async selectionEnd() {
    if (!Platform.isNative) return;
    try {
      await Haptics.selectionEnd();
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  }
};

// Notifications
export const Notifications = {
  async requestPermission() {
    if (!Platform.isNative) return { display: 'granted' };

    try {
      const result = await LocalNotifications.requestPermissions();
      return result;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return { display: 'denied' };
    }
  },

  async schedule(notification) {
    if (!Platform.isNative) {
      console.log('Would schedule notification:', notification);
      return;
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: notification.title,
            body: notification.body,
            id: notification.id || Date.now(),
            schedule: notification.schedule,
            sound: notification.sound,
            attachments: notification.attachments,
            actionTypeId: notification.actionTypeId,
            extra: notification.extra
          }
        ]
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  },

  async getPending() {
    if (!Platform.isNative) return [];
    return await LocalNotifications.getPending();
  },

  async cancel(notificationIds) {
    if (!Platform.isNative) return;
    await LocalNotifications.cancel({ notifications: notificationIds.map(id => ({ id })) });
  }
};

// Push Notifications
export const PushNotificationService = {
  async register() {
    if (!Platform.isNative) return null;

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
      }

      await PushNotifications.register();

      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          console.log('Push registration success, token: ' + token.value);
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ' + JSON.stringify(error));
          resolve(null);
        });
      });
    } catch (error) {
      console.error('Push notification registration error:', error);
      return null;
    }
  },

  setupListeners(onNotification, onActionPerformed) {
    if (!Platform.isNative) return;

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
      if (onNotification) onNotification(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification);
      if (onActionPerformed) onActionPerformed(notification);
    });
  }
};

// Share functionality
export const ShareService = {
  async share(options) {
    try {
      await Share.share({
        title: options.title || 'Share from Nexus AI Pro',
        text: options.text || '',
        url: options.url || '',
        dialogTitle: options.dialogTitle || 'Share with'
      });
      return true;
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  }
};

// Camera access
export const CameraService = {
  async takePicture(options = {}) {
    try {
      const image = await Camera.getPhoto({
        quality: options.quality || 90,
        allowEditing: options.allowEditing || false,
        resultType: CameraResultType.DataUrl,
        source: options.source || CameraSource.Prompt
      });

      return {
        dataUrl: image.dataUrl,
        format: image.format,
        saved: image.saved
      };
    } catch (error) {
      console.error('Camera error:', error);
      throw error;
    }
  },

  async pickImage() {
    return await this.takePicture({ source: CameraSource.Photos });
  }
};

// File system access
export const FileSystemService = {
  async writeFile(path, data) {
    if (!Platform.isNative) {
      console.log('Would write file:', path);
      return;
    }

    try {
      await Filesystem.writeFile({
        path,
        data,
        directory: Directory.Documents,
        encoding: 'utf8'
      });
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  },

  async readFile(path) {
    if (!Platform.isNative) {
      console.log('Would read file:', path);
      return null;
    }

    try {
      const result = await Filesystem.readFile({
        path,
        directory: Directory.Documents,
        encoding: 'utf8'
      });
      return result.data;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  },

  async deleteFile(path) {
    if (!Platform.isNative) return;

    try {
      await Filesystem.deleteFile({
        path,
        directory: Directory.Documents
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },

  async mkdir(path) {
    if (!Platform.isNative) return;

    try {
      await Filesystem.mkdir({
        path,
        directory: Directory.Documents,
        recursive: true
      });
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  },

  async readdir(path) {
    if (!Platform.isNative) return [];

    try {
      const result = await Filesystem.readdir({
        path,
        directory: Directory.Documents
      });
      return result.files;
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }
  }
};

// Keyboard management
export const KeyboardManager = {
  async show() {
    if (Platform.isNative) {
      await Keyboard.show();
    }
  },

  async hide() {
    if (Platform.isNative) {
      await Keyboard.hide();
    }
  },

  async setAccessoryBarVisible(visible) {
    if (Platform.isIOS) {
      await Keyboard.setAccessoryBarVisible({ isVisible: visible });
    }
  },

  async setScroll(enabled) {
    if (Platform.isNative) {
      await Keyboard.setScroll({ isDisabled: !enabled });
    }
  }
};

// Initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    AppLifecycle.initialize().catch(console.error);
  });
}

// Export all services
export default {
  Platform,
  AppLifecycle,
  HapticFeedback,
  Notifications,
  PushNotificationService,
  ShareService,
  CameraService,
  FileSystemService,
  KeyboardManager
};
