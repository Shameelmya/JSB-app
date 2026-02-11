# Firebase Cloud Backup & Restore Guide

## Overview

The Mahallu Bank application now features a complete cloud backup and restore system using Firebase. This guide explains how to use these features to protect your data.

**Key Features:**
- ✅ Offline-first architecture - all data stays on your device
- ✅ Cloud backup to Firebase for data safety
- ✅ Restore from any backup on any computer
- ✅ Automatic duplicate detection and removal
- ✅ Internet only needed for backup/restore operations
- ✅ Complete data privacy with your own Firebase project

## System Architecture

### How It Works

1. **Local Storage**: All your data (members, transactions, balances) is stored locally on your device
2. **Offline Operations**: The app works completely offline for all operations
3. **Manual Backup**: When you click "Backup Now", your data is sent to Firebase
4. **Duplicate Prevention**: The system automatically detects and removes duplicate data
5. **Restore Anytime**: You can restore from any previous backup on any device

### Architecture Components

#### 1. Firebase Configuration (`src/firebase/config.ts`)
- Contains Firebase project credentials
- Initializes Firestore, Authentication, and Storage
- Uses the mahall-bnk Firebase project

#### 2. Backup Service (`src/firebase/backup-service.ts`)
Provides core backup/restore functionality:

**Key Functions:**
- `backupToFirebase()` - Sends data to Firebase Firestore
- `restoreFromFirebase()` - Retrieves backup from Firebase
- `detectDuplicateMembers()` - Finds duplicate member records
- `detectDuplicateTransactions()` - Finds duplicate transactions
- `deduplicateData()` - Removes duplicates while keeping recent data
- `checkBackupExists()` - Prevents duplicate backups (within 1 minute)
- `getAllBackupMetadata()` - Lists all available backups

#### 3. Firebase Sync Hook (`src/hooks/use-firebase-sync.ts`)
React hook that manages backup/restore state:

**Features:**
- Automatic metadata loading on mount
- Loading states (isBackingUp, isRestoring)
- Error handling and display
- Duplicate detection before backup
- Auto-deduplication of data

#### 4. Cloud Backup Component (`src/components/cloud-backup.tsx`)
User interface for backup/restore operations:

**Features:**
- One-click backup button
- Backup history display
- Restore dialog with backup selection
- Real-time status updates
- Error and success notifications

## Usage Guide

### Accessing Cloud Backup

1. Go to **Settings** → **Data** tab
2. Scroll to "Cloud Backup & Restore" section

### Backing Up Your Data

1. Click **"Backup Now"** button
2. The app will:
   - Check for duplicate backups (won't create if one exists within 1 minute)
   - Detect and remove any duplicate data
   - Upload to Firebase
   - Display success message
3. You'll see the backup time under "Last Backup"

### Restoring Data

1. Click **"Restore Data"** button
2. A dialog shows all available backups
3. Each backup shows:
   - Date and time of backup
   - Number of members
   - Number of transactions
4. Select a backup and click **"Restore"**
5. Your data will be loaded from that backup

### Backup History

The app displays up to 5 most recent backups:
- Shows backup timestamp
- Shows number of members and transactions
- Shows version information

## Duplicate Handling

### What Gets Deduplicated

Before backing up, the system automatically:

1. **Member Duplicates**: Removes duplicate members with same account number and name
2. **Transaction Duplicates**: Removes duplicate transactions with same member, amount, date, and type
3. **Admin Transaction Duplicates**: Removes duplicate fee charges
4. **Deduplication Logic**: Keeps the most recent entry, removes older duplicates

### Backup Deduplication

The system avoids creating duplicate backups by:
- Comparing new backup with existing backups
- Checking if total members and transactions match
- Checking if backup was created within last 1 minute
- Skipping backup if duplicate detected

## Firestore Database Structure

```
firestore/
├── backups/
│   └── {backupId}/
│       ├── members: Member[]
│       ├── transactions: Transaction[]
│       ├── adminTransactions: AdminTransaction[]
│       ├── bankTransactions: BankTransaction[]
│       ├── metadata:
│       │   ├── backupId: string
│       │   ├── lastBackupTime: ISO string
│       │   ├── totalMembers: number
│       │   ├── totalTransactions: number
│       │   └── version: string
│       └── createdAt: server timestamp
│
└── backups_metadata/
    └── {backupId}/
        ├── backupId: string
        ├── lastBackupTime: ISO string
        ├── totalMembers: number
        ├── totalTransactions: number
        └── version: string
```

## Security

### Data Privacy
- Your data is stored in your own Firebase project (mahall-bnk)
- All data is encrypted in transit (HTTPS)
- Firebase Security Rules should be configured for your needs
- Only you can access backups in your Firebase project

### Recommended Firebase Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /backups/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /backups_metadata/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### Backup Fails
- Check internet connection
- Verify Firebase credentials in config.ts
- Check Firebase project status in console
- Look for error message in app

### Restore Fails
- Ensure backup exists in selected list
- Check internet connection
- Verify Firebase project permissions

### Duplicate Backup Skipped
- This is normal - the system detected a similar backup within 1 minute
- Wait a minute and try again, or select a different backup to restore

### No Data Shows After Restore
- The backup may be corrupted
- Try a different backup
- Use local CSV backup instead

## Best Practices

1. **Regular Backups**
   - Backup after adding significant data
   - Backup before major changes
   - Create monthly backups for archival

2. **Multiple Devices**
   - Use "Restore Data" to sync between computers
   - All devices use the same Firebase project
   - Latest backup is always available

3. **Data Safety**
   - Keep local CSV backups as well
   - Review backup history regularly
   - Test restores periodically

4. **Performance**
   - Backup may take longer with large datasets (1000+ transactions)
   - Deduplication removes redundant data automatically
   - Clean old backups from Firebase console if needed

## Integration with Settings Page

The CloudBackup component is integrated into the Settings page:

```tsx
import { CloudBackup } from '@/components/cloud-backup';

// In SettingsPage component
<TabsContent value="data">
  <CloudBackup 
    onBackupComplete={() => forceRender({})}
    onRestoreComplete={() => forceRender({})}
  />
  <DataManagement />
</TabsContent>
```

## API Reference

### useFirebaseSync Hook

```typescript
const {
  // State
  isBackingUp,           // boolean
  isRestoring,           // boolean
  lastBackupTime,        // ISO string | null
  backupMetadata,        // BackupMetadata[]
  error,                 // string | null
  
  // Methods
  backup,                // async function
  restore,               // async function
  loadBackupMetadata     // async function
} = useFirebaseSync();
```

### Backup Service Functions

**backupToFirebase()**
```typescript
const result = await backupToFirebase(
  members,
  transactions,
  adminTransactions,
  bankTransactions
);
// Returns: { backupId: string, status: 'success' }
```

**restoreFromFirebase()**
```typescript
const backup = await restoreFromFirebase(backupId);
// Returns: CloudBackup object with all data
```

**deduplicateData()**
```typescript
const result = deduplicateData(
  members,
  transactions,
  adminTransactions,
  bankTransactions
);
// Returns: { members[], transactions[], adminTransactions[], bankTransactions[], removedCount }
```

## Offline Functionality

### What Works Offline
- ✅ Add/edit/delete members
- ✅ Record transactions
- ✅ View reports
- ✅ Manage admins
- ✅ All data operations

### What Needs Internet
- 🌐 Backup to Firebase
- 🌐 Restore from Firebase

## Version History

- **v1.0** (Feb 2025) - Initial cloud backup implementation
  - Firebase integration
  - Duplicate detection
  - Backup/restore functionality
  - Offline-first architecture

## Support & Contributing

For issues or improvements to the backup system:
1. Check this documentation
2. Review error messages in the app
3. Check Firebase console for backend issues
4. Create an issue in the GitHub repository

## License

This feature is part of the Mahallu Bank application.
