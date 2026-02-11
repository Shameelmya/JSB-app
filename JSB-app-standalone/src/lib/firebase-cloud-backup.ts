// Firebase Cloud Backup Manager
// Handles backup and restore of offline data to Firebase
// Supports progress tracking and duplicate detection

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString, downloadString, getBytes } from 'firebase/storage';
import { StorageData } from './localDatabase';

const firebaseConfig = {
  apiKey: "AIzaSyBbUp2TMP3_HrXscGA31tQn8Y2ecl-N5Hg",
  authDomain: "mahall-bnk.firebaseapp.com",
  projectId: "mahall-bnk",
  storageBucket: "mahall-bnk.firebasestorage.app",
  messagingSenderId: "364265261108",
  appId: "1:364265261108:web:182f07f0b05bfb4bc46261"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

export interface BackupProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  message: string;
}

export interface BackupMetadata {
  timestamp: string;
  dataHash: string;
  size: number;
  version: string;
}

class FirebaseCloudBackup {
  private backupProgress: BackupProgress = {
    current: 0,
    total: 100,
    percentage: 0,
    status: 'pending',
    message: ''
  };

  private progressCallback: ((progress: BackupProgress) => void) | null = null;

  /**
   * Calculate hash of data for duplicate detection
   */
  private calculateHash(data: any): string {
    const json = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get existing backup metadata
   */
  private async getExistingBackupMetadata(userId: string): Promise<BackupMetadata | null> {
    try {
      const metaRef = ref(storage, `backups/${userId}/metadata.json`);
      const metaJson = await downloadString(metaRef);
      return JSON.parse(metaJson);
    } catch (error) {
      return null;
    }
  }

  /**
   * Set progress callback for UI updates
   */
  onProgress(callback: (progress: BackupProgress) => void) {
    this.progressCallback = callback;
  }

  /**
   * Update and emit progress
   */
  private updateProgress(current: number, total: number, status: 'pending' | 'uploading' | 'completed' | 'failed', message: string) {
    this.backupProgress = {
      current,
      total,
      percentage: Math.round((current / total) * 100),
      status,
      message
    };
    if (this.progressCallback) {
      this.progressCallback(this.backupProgress);
    }
  }

  /**
   * Backup data to Firebase Cloud Storage
   * Detects duplicates and avoids uploading same data
   */
  async backupToCloud(userId: string, data: StorageData): Promise<{ success: boolean; message: string; skipped?: boolean }> {
    try {
      this.updateProgress(10, 100, 'uploading', 'Calculating data hash...');

      const dataHash = this.calculateHash(data);
      const existingMetadata = await this.getExistingBackupMetadata(userId);

      // Check for duplicates
      if (existingMetadata && existingMetadata.dataHash === dataHash) {
        this.updateProgress(100, 100, 'completed', 'Backup already exists. Skipping duplicate upload.');
        return {
          success: true,
          message: 'Data already backed up. Skipped duplicate upload.',
          skipped: true
        };
      }

      this.updateProgress(30, 100, 'uploading', 'Compressing data...');

      const backupData = {
        data,
        timestamp: new Date().toISOString(),
        hash: dataHash,
        version: '1.0.0'
      };

      const dataJson = JSON.stringify(backupData);
      const dataSize = new Blob([dataJson]).size;

      this.updateProgress(50, 100, 'uploading', `Uploading backup (${(dataSize / 1024).toFixed(2)} KB)...`);

      // Upload data
      const dataRef = ref(storage, `backups/${userId}/data-${Date.now()}.json`);
      await uploadString(dataRef, dataJson);

      this.updateProgress(80, 100, 'uploading', 'Updating metadata...');

      // Upload metadata
      const metadata: BackupMetadata = {
        timestamp: new Date().toISOString(),
        dataHash: dataHash,
        size: dataSize,
        version: '1.0.0'
      };

      const metaRef = ref(storage, `backups/${userId}/metadata.json`);
      await uploadString(metaRef, JSON.stringify(metadata));

      this.updateProgress(100, 100, 'completed', 'Backup completed successfully!');

      return {
        success: true,
        message: 'Data backed up to cloud successfully!'
      };
    } catch (error: any) {
      this.updateProgress(0, 100, 'failed', `Backup failed: ${error.message}`);
      return {
        success: false,
        message: `Backup failed: ${error.message}`
      };
    }
  }

  /**
   * Restore data from Firebase Cloud Storage
   */
  async restoreFromCloud(userId: string): Promise<{ success: boolean; data?: StorageData; message: string }> {
    try {
      this.updateProgress(20, 100, 'uploading', 'Fetching backup list...');

      // Get latest backup
      const metaRef = ref(storage, `backups/${userId}/metadata.json`);
      const metaJson = await downloadString(metaRef);
      const metadata = JSON.parse(metaJson) as BackupMetadata;

      this.updateProgress(50, 100, 'uploading', 'Downloading backup data...');

      // Find latest data file
      // In production, you'd list files and get the latest
      // For now, we'll try to get the data from the timestamp
      const dataRef = ref(storage, `backups/${userId}/data-${new Date(metadata.timestamp).getTime()}.json`);
      const dataJson = await downloadString(dataRef);
      const backupData = JSON.parse(dataJson);

      this.updateProgress(80, 100, 'uploading', 'Verifying data...');

      // Verify data hash
      const downloadedHash = this.calculateHash(backupData.data);
      if (downloadedHash !== metadata.dataHash) {
        throw new Error('Data integrity check failed');
      }

      this.updateProgress(100, 100, 'completed', 'Restore completed successfully!');

      return {
        success: true,
        data: backupData.data,
        message: 'Data restored from cloud successfully!'
      };
    } catch (error: any) {
      this.updateProgress(0, 100, 'failed', `Restore failed: ${error.message}`);
      return {
        success: false,
        message: `Restore failed: ${error.message}`
      };
    }
  }

  /**
   * Get current progress
   */
  getProgress(): BackupProgress {
    return { ...this.backupProgress };
  }
}

export const cloudBackup = new FirebaseCloudBackup();
