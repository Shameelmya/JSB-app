import { doc, setDoc, getDoc, collection, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { Member, BankTransaction, AdminTransaction } from '@/types';

export interface BackupMetadata {
  lastBackupTime: string;
  totalMembers: number;
  totalTransactions: number;
  backupId: string;
  version: string;
}

export interface CloudBackup {
  members: Member[];
  transactions: any[];
  adminTransactions: AdminTransaction[];
  bankTransactions: BankTransaction[];
  metadata: BackupMetadata;
}

/**
 * Generate a unique backup ID
 */
export function generateBackupId(): string {
  return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect duplicate members based on account number and name
 */
export function detectDuplicateMembers(members: Member[]): Map<string, Member[]> {
  const duplicates = new Map<string, Member[]>();
  const seen = new Map<string, Member>();

  members.forEach(member => {
    const key = `${member.accountNumber.toLowerCase()}-${member.name.toLowerCase()}`;
    
    if (seen.has(key)) {
      if (!duplicates.has(key)) {
        duplicates.set(key, [seen.get(key)!]);
      }
      duplicates.get(key)!.push(member);
    } else {
      seen.set(key, member);
    }
  });

  return duplicates;
}

/**
 * Detect duplicate transactions
 */
export function detectDuplicateTransactions(transactions: any[]): Map<string, any[]> {
  const duplicates = new Map<string, any[]>();
  const seen = new Map<string, any>();

  transactions.forEach(tx => {
    const key = `${tx.memberId}-${tx.amount}-${tx.date}-${tx.type}`;
    
    if (seen.has(key)) {
      if (!duplicates.has(key)) {
        duplicates.set(key, [seen.get(key)!]);
      }
      duplicates.get(key)!.push(tx);
    } else {
      seen.set(key, tx);
    }
  });

  return duplicates;
}

/**
 * Remove older duplicates keeping only the most recent one
 */
export function deduplicateData(
  members: Member[],
  transactions: any[],
  adminTransactions: AdminTransaction[],
  bankTransactions: BankTransaction[]
): {
  members: Member[];
  transactions: any[];
  adminTransactions: AdminTransaction[];
  bankTransactions: BankTransaction[];
  removedCount: number;
} {
  let removedCount = 0;

  // Deduplicate members
  const memberMap = new Map<string, Member>();
  members.forEach(member => {
    const key = `${member.accountNumber.toLowerCase()}-${member.name.toLowerCase()}`;
    const existing = memberMap.get(key);
    
    if (existing) {
      // Keep the one with the most recent update
      if (new Date(member.id || 0) > new Date(existing.id || 0)) {
        memberMap.set(key, member);
        removedCount++;
      } else {
        removedCount++;
      }
    } else {
      memberMap.set(key, member);
    }
  });

  // Deduplicate transactions
  const txMap = new Map<string, any>();
  transactions.forEach(tx => {
    const key = `${tx.memberId}-${tx.amount}-${tx.date}-${tx.type}`;
    const existing = txMap.get(key);
    
    if (existing) {
      if (new Date(tx.createdAt || tx.date) > new Date(existing.createdAt || existing.date)) {
        txMap.set(key, tx);
        removedCount++;
      } else {
        removedCount++;
      }
    } else {
      txMap.set(key, tx);
    }
  });

  // Deduplicate admin transactions
  const adminTxMap = new Map<string, AdminTransaction>();
  adminTransactions.forEach(tx => {
    const key = `${tx.memberId}-${tx.amount}-${tx.date}-${tx.type}`;
    const existing = adminTxMap.get(key);
    
    if (existing) {
      if (new Date(tx.date) > new Date(existing.date)) {
        adminTxMap.set(key, tx);
        removedCount++;
      } else {
        removedCount++;
      }
    } else {
      adminTxMap.set(key, tx);
    }
  });

  return {
    members: Array.from(memberMap.values()),
    transactions: Array.from(txMap.values()),
    adminTransactions: Array.from(adminTxMap.values()),
    bankTransactions, // Keep as is unless duplicates needed
    removedCount
  };
}

/**
 * Backup data to Firebase
 */
export async function backupToFirebase(
  members: Member[],
  transactions: any[],
  adminTransactions: AdminTransaction[],
  bankTransactions: BankTransaction[]
): Promise<{ backupId: string; status: string }> {
  try {
    const backupId = generateBackupId();
    
    const metadata: BackupMetadata = {
      lastBackupTime: new Date().toISOString(),
      totalMembers: members.length,
      totalTransactions: transactions.length,
      backupId,
      version: '1.0'
    };

    const backup: CloudBackup = {
      members,
      transactions,
      adminTransactions,
      bankTransactions,
      metadata
    };

    // Save backup to Firestore
    const backupRef = doc(db, 'backups', backupId);
    await setDoc(backupRef, {
      ...backup,
      createdAt: serverTimestamp()
    });

    // Also save metadata for quick access
    const metadataRef = doc(db, 'backups_metadata', backupId);
    await setDoc(metadataRef, metadata);

    return {
      backupId,
      status: 'success'
    };
  } catch (error) {
    console.error('Backup error:', error);
    throw new Error(`Failed to backup data to Firebase: ${error}`);
  }
}

/**
 * Restore data from Firebase
 */
export async function restoreFromFirebase(backupId: string): Promise<CloudBackup> {
  try {
    const backupRef = doc(db, 'backups', backupId);
    const backupSnap = await getDoc(backupRef);

    if (!backupSnap.exists()) {
      throw new Error('Backup not found');
    }

    const data = backupSnap.data() as CloudBackup;
    return data;
  } catch (error) {
    console.error('Restore error:', error);
    throw new Error(`Failed to restore data from Firebase: ${error}`);
  }
}

/**
 * Get all backup metadata
 */
export async function getAllBackupMetadata(): Promise<BackupMetadata[]> {
  try {
    const q = query(collection(db, 'backups_metadata'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data() as BackupMetadata);
  } catch (error) {
    console.error('Error fetching backups:', error);
    throw new Error(`Failed to fetch backups: ${error}`);
  }
}

/**
 * Check if a backup already exists (to avoid duplicates)
 */
export async function checkBackupExists(
  members: Member[],
  transactions: any[]
): Promise<boolean> {
  try {
    const allBackups = await getAllBackupMetadata();
    
    for (const backup of allBackups) {
      if (backup.totalMembers === members.length && 
          backup.totalTransactions === transactions.length) {
        // Check if timestamps are very close (within 1 minute)
        const lastBackupDate = new Date(backup.lastBackupTime);
        const now = new Date();
        const timeDiff = now.getTime() - lastBackupDate.getTime();
        
        if (timeDiff < 60000) { // 1 minute
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking backup:', error);
    return false;
  }
}
