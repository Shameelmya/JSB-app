'use client';

import React, { useState } from 'react';
import { Cloud, Download, Upload, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useFirebaseSync } from '@/hooks/use-firebase-sync';
import { useData } from '@/lib/data-provider';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface CloudBackupProps {
  onBackupComplete?: () => void;
  onRestoreComplete?: () => void;
}

export function CloudBackup({ onBackupComplete, onRestoreComplete }: CloudBackupProps) {
  const { toast } = useToast();
  const { allMembers, allTransactions, adminTransactions, bankTransactions } = useData();
  const { isBackingUp, isRestoring, lastBackupTime, backupMetadata, error, backup, restore } = useFirebaseSync();
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [isRestoringDialog, setIsRestoringDialog] = useState(false);

  const handleBackup = async () => {
    const allTx = allMembers.flatMap(m => m.transactions || []);
    const result = await backup(
      allMembers,
      allTx,
      adminTransactions,
      bankTransactions
    );

    if (result.success) {
      toast({
        title: 'Backup Successful',
        description: result.message
      });
      onBackupComplete?.();
    } else {
      toast({
        variant: 'destructive',
        title: 'Backup Failed',
        description: result.message
      });
    }
  };

  const handleRestore = async () => {
    if (!selectedBackupId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a backup to restore'
      });
      return;
    }

    const result = await restore(selectedBackupId);

    if (result.success) {
      toast({
        title: 'Restore Successful',
        description: result.message
      });
      setIsRestoringDialog(false);
      onRestoreComplete?.();
    } else {
      toast({
        variant: 'destructive',
        title: 'Restore Failed',
        description: result.message
      });
    }
  };

  return (
    <>
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Cloud Backup & Restore</CardTitle>
                <CardDescription>
                  Backup your data to Firebase and restore from any backup. Uses offline-first architecture.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {lastBackupTime && (
            <Alert className="border-green-200 bg-green-50/50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Last Backup</AlertTitle>
              <AlertDescription className="text-green-800">
                {format(new Date(lastBackupTime), 'PPpp')}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Backup Section */}
            <div className="p-4 border rounded-lg border-blue-200 bg-white">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Backup to Cloud</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Save your data to Firebase. All data stays offline until you click backup.
                  </p>
                  <Button
                    onClick={handleBackup}
                    disabled={isBackingUp || allMembers.length === 0}
                    className="w-full"
                  >
                    {isBackingUp ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Backing up...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Backup Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Restore Section */}
            <div className="p-4 border rounded-lg border-blue-200 bg-white">
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Restore from Cloud</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Restore data from a previous backup. Select and restore.
                  </p>
                  <Dialog open={isRestoringDialog} onOpenChange={setIsRestoringDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isRestoring || backupMetadata.length === 0}
                        className="w-full"
                      >
                        {isRestoring ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Restore Data
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Select Backup to Restore</DialogTitle>
                        <DialogDescription>
                          Choose a backup to restore. This will overwrite your current local data.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {backupMetadata.length > 0 ? (
                          backupMetadata.map((metadata) => (
                            <div
                              key={metadata.backupId}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedBackupId === metadata.backupId
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setSelectedBackupId(metadata.backupId)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {format(new Date(metadata.lastBackupTime), 'PPp')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Members: {metadata.totalMembers} | Transactions: {metadata.totalTransactions}
                                  </p>
                                </div>
                                {selectedBackupId === metadata.backupId && (
                                  <Check className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No backups found. Create one first!
                          </p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsRestoringDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleRestore}
                          disabled={!selectedBackupId || isRestoring}
                        >
                          {isRestoring ? 'Restoring...' : 'Restore'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          </div>

          {/* Backup History */}
          {backupMetadata.length > 0 && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-3">Backup History</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {backupMetadata.slice(0, 5).map((metadata) => (
                  <div key={metadata.backupId} className="flex items-center justify-between p-2 bg-white rounded text-sm">
                    <div>
                      <p className="font-medium">
                        {format(new Date(metadata.lastBackupTime), 'PPp')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {metadata.totalMembers} members, {metadata.totalTransactions} transactions
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      v{metadata.version}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How It Works</AlertTitle>
            <AlertDescription>
              Your app works completely offline. Click "Backup Now" to save data to Firebase. Click "Restore Data" to load from a previous backup on any computer. Internet is only needed for backup/restore operations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </>
  );
}
