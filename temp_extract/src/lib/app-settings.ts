'use client';

import { useState, useEffect } from 'react';
import type { AppSettings } from '@/types';

const APP_SETTINGS_KEY = 'mahallu_bank_app_settings';

const defaultAppSettings: AppSettings = {
    bankName: 'Mahallu Bank',
    logoUrl: null,
};

export function getAppSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return defaultAppSettings;
  }
  try {
    const config = localStorage.getItem(APP_SETTINGS_KEY);
    if (config) {
      const parsed = JSON.parse(config);
      return { ...defaultAppSettings, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load app settings from localStorage", error);
  }
  return defaultAppSettings;
}

export function saveAppSettings(settings: AppSettings): void {
   if (typeof window === 'undefined') {
    console.error("Attempted to save app settings on the server.");
    return;
  }
  
  const settingsToSave: AppSettings = {
    bankName: settings.bankName,
    logoUrl: settings.logoUrl,
  };

  // Prevent storing large base64 strings in localStorage.
  // This is a common cause of quota exceeded errors.
  if (settings.logoUrl && settings.logoUrl.startsWith('data:image/') && settings.logoUrl.length > 1024 * 1024) { // 1MB limit
    console.warn("Logo is too large to be persisted in browser storage. It will not be saved.");
    settingsToSave.logoUrl = null;
  }

  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settingsToSave));
}


export function useAppSettings() {
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);

  useEffect(() => {
    setAppSettings(getAppSettings());
  }, []);

  const updateAppSettings = (settings: Partial<AppSettings>) => {
    setAppSettings(prev => {
        const newSettings = { ...prev, ...settings };
        saveAppSettings(newSettings);
        return newSettings;
    });
  };

  return { appSettings, updateAppSettings };
}
