'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  backupToFirebase,
  restoreFromFirebase,
  getAllBackupMetadata,
  deduplicateData,
  checkBackupExists,
  type BackupMetadata
} from '@/firebase/backup-service';
import type { Member, BankTransaction, AdminTransaction } from '@/types';

export interface FirebaseSyncState {
  isBackingUp: boolean;
  isRestoring: boolean;
  lastBackupTime: string | null;
  backupMetadata: BackupMetadata[];
  error: string | null;
}

export function useFirebaseSync() {
  const [state, setState] = useState<FirebaseSyncState>({
    isBackingUp: false,
    isRestoring: false,
    lastBackupTime: null,
    backupMetadata: [],
    error: null
  });

  // Load backup metadata on mount
  useEffect(() => {
    loadBackupMetadata();
  }, []);

  const loadBackupMetadata = useCallback(async () => {
    try {
      const metadata = await getAllBackupMetadata();
      setState(prev => ({
        ...prev,
        backupMetadata: metadata.sort((a, b) => 
          new Date(b.lastBackupTime).getTime() - new Date(a.lastBackupTime).getTime()
        )
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load backups'
      }));
    }
  }, []);

  const backup = useCallback(
    async (
      members: Member[],
      transactions: any[],
      adminTransactions: AdminTransaction[],
      bankTransactions: BankTransaction[]
    ) => {
      setState(prev => ({ ...prev, isBackingUp: true, error: null }));

      try {
        // Check if backup already exists
        const isDuplicate = await checkBackupExists(members, transactions);
        
        if (isDuplicate) {
          setState(prev => ({
            ...prev,
            isBackingUp: false,
            error: 'Duplicate backup detected. Skipping to avoid storage redundancy.'
          }));
          return {
            success: false,
            message: 'Duplicate backup skipped',
            backupId: null
          };
        }

        // Deduplicate data before backing up
        const deduplicated = deduplicateData(
          members,
          transactions,
          adminTransactions,
          bankTransactions
        );

        // Perform backup
        const result = await backupToFirebase(
          deduplicated.members,
          deduplicated.transactions,
          deduplicated.adminTransactions,
          deduplicated.bankTransactions
        );

        const lastBackupTime = new Date().toISOString();
        setState(prev => ({
          ...prev,
          isBackingUp: false,
          lastBackupTime,
          error: null
        }));

        // Reload metadata
        await loadBackupMetadata();

        return {
          success: true,
          message: `Backup completed. ${deduplicated.removedCount} duplicates removed.`,
          backupId: result.backupId
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Backup failed';
        setState(prev => ({
          ...prev,
          isBackingUp: false,
          error: errorMessage
        }));
        return {
          success: false,
          message: errorMessage,
          backupId: null
        };
      }
    },
    [loadBackupMetadata]
  );

  const restore = useCallback(
    async (backupId: string) => {
      setState(prev => ({ ...prev, isRestoring: true, error: null }));

      try {
        const backup = await restoreFromFirebase(backupId);
        
        setState(prev => ({
          ...prev,
          isRestoring: false,
          lastBackupTime: backup.metadata.lastBackupTime,
          error: null
        }));

        return {
          success: true,
          message: 'Backup restored successfully',
          data: backup
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Restore failed';
        setState(prev => ({
          ...prev,
          isRestoring: false,
          error: errorMessage
        }));
        return {
          success: false,
          message: errorMessage,
          data: null
        };
      }
    },
    []
  );

  return {
    ...state,
    backup,
    restore,
    loadBackupMetadata
  };
}
