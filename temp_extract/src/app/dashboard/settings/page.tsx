'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, AlertTriangle, MessageSquare, Trash2, PlusCircle, UserPlus, ShieldAlert, BookText, Banknote, DollarSign, Check, ChevronsUpDown, Edit } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useData } from '@/lib/data-provider';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { format, lastDayOfMonth } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useCommandMenu } from '@/hooks/use-command-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useAppSettings } from '@/lib/app-settings';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAdmins, type AdminUser } from '@/lib/admin-manager';
import { useAuth } from '@/lib/auth-provider';
import type { AdminTransaction, BankTransaction, Member } from '@/types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TransactionDialog } from '../transactions/transaction-dialog';
import MembersPage from '../members/page';


function GeneralSettings() {
  const { toast } = useToast();
  const { appSettings, updateAppSettings: saveAppSettingsToHook } = useAppSettings();

  
  const [bankName, setBankName] = useState(appSettings.bankName);
  const [logoUrl, setLogoUrl] = useState(appSettings.logoUrl);


  useEffect(() => {
    setBankName(appSettings.bankName);
    setLogoUrl(appSettings.logoUrl);
  }, [appSettings]);

  const handleSaveGeneral = () => {
    saveAppSettingsToHook({ bankName, logoUrl });
    toast({ title: "General Settings Saved", description: "Your bank name and logo have been updated." });
  };
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveLogo = () => {
      setLogoUrl(null);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your bank's information and branding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bank-name">Mahallu Bank Name</Label>
            <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo-upload">Bank Logo (PNG)</Label>
             <div className="flex items-center gap-4">
                <Input id="logo-upload" type="file" accept="image/png" onChange={handleLogoUpload} className="flex-1"/>
                 {logoUrl && (
                    <div className="flex items-center gap-2">
                        <img src={logoUrl} alt="Logo Preview" className="h-10 w-10 object-contain border rounded-md" />
                        <Button variant="ghost" size="icon" onClick={handleRemoveLogo} aria-label="Remove logo">
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveGeneral}>Save General Settings</Button>
        </CardFooter>
      </Card>
    </>
  );
}

function AdminManagement() {
  const { userEmail } = useAuth();
  const { admins, addAdmin, deleteAdmin } = useAdmins();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isSuperAdmin = userEmail === 'hsahilhuda@gmail.com';

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Admin Accounts</CardTitle>
          <CardDescription>Manage other administrator accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Only the super admin (hsahilhuda@gmail.com) can manage admin accounts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = (email: string) => {
    try {
      deleteAdmin(email);
      toast({ title: 'Admin Removed', description: `User ${email} is no longer an admin.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <>
      <AddAdminSheet open={open} onOpenChange={setOpen} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Accounts</CardTitle>
              <CardDescription>Add, view, and remove administrator accounts.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length > 0 ? (
                admins.map((admin) => (
                  <TableRow key={admin.email}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Admin?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove admin access for <strong>{admin.email}</strong>? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(admin.email)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                    No other admins found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function AddAdminSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { addAdmin } = useAdmins();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please provide both email and password.' });
      return;
    }
    try {
      addAdmin({ email, password });
      toast({ title: 'Admin Added', description: `${email} can now log in as an admin.` });
      onOpenChange(false);
      setEmail('');
      setPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>Add New Admin</SheetTitle>
            <SheetDescription>
              Create a new administrator account. They will have the same permissions as you.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="submit">Save Admin</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function DataManagement() {
    const { toast } = useToast();
    const { allMembers } = useData();

    const exportToCsv = (filename: string, rows: any[]) => {
        if (rows.length === 0) {
            toast({ variant: 'destructive', title: "No Data", description: "There is no data to export." });
            return;
        }
        
        const headers = Object.keys(rows[0]).join(',');
        const csvContent = [
            headers,
            ...rows.map(row => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Complete", description: `${filename} has been downloaded.` });
    };

    const handleBackup = () => {
        const transactions: any[] = [];
        allMembers.forEach(member => {
            member.transactions.forEach(tx => {
                transactions.push({
                    member_id: member.id,
                    member_account_number: member.accountNumber,
                    transaction_id: tx.id,
                    type: tx.type,
                    amount: tx.amount,
                    date: tx.date,
                    remarks: tx.remarks
                });
            });
        });

        const members = allMembers.map(({ transactions, ...member }) => {
            const { totalIn, totalOut, balance, ...rest} = member;
            return rest;
        });
        
        exportToCsv('mahallu_bank_members_backup.csv', members);
        exportToCsv('mahallu_bank_transactions_backup.csv', transactions);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Backup & Restore</CardTitle>
                <CardDescription>Export all your data to CSV files. Restore from a backup via the Bulk Upload features.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 border rounded-lg flex flex-col items-center justify-center text-center">
                    <Download className="h-10 w-10 mb-4 text-primary"/>
                    <h3 className="text-lg font-semibold mb-2">Backup Data</h3>
                    <p className="text-sm text-muted-foreground mb-4">Download members and transactions as separate CSV files.</p>
                    <Button onClick={handleBackup}>
                        <Download className="h-4 w-4 mr-2"/>
                        Export All Data
                    </Button>
                </div>
                 <div className="p-6 border rounded-lg flex flex-col items-center justify-center text-center">
                    <Upload className="h-10 w-10 mb-4 text-primary"/>
                    <h3 className="text-lg font-semibold mb-2">Restore Data</h3>
                    <p className="text-sm text-muted-foreground mb-4">Use the "Bulk Upload" features in the Members and Transactions pages to restore data from CSV files.</p>
                    <Button variant="outline" onClick={() => toast({ title: "Info", description: "Use Bulk Upload in Members/Transactions pages to restore."})}>
                        <Upload className="h-4 w-4 mr-2"/>
                        Restore Instructions
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function DangerZone() {
  const { allMembers, blocks, deleteMember, deleteCluster, deleteBlock, resetAllData } = useData();
  const { toast } = useToast();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'member' | 'cluster' | 'block' | 'reset' | null>(null);

  const [confirmationText, setConfirmationText] = useState('');
  
  const [selectedMember, setSelectedMember] = useState<string | undefined>();
  const [selectedBlock, setSelectedBlock] = useState<string | undefined>();
  const [selectedCluster, setSelectedCluster] = useState<string | undefined>();

  const openDialog = (action: 'member' | 'cluster' | 'block' | 'reset') => {
    setDialogAction(action);
    setDialogOpen(true);
    setConfirmationText('');
    setSelectedMember(undefined);
    setSelectedBlock(undefined);
    setSelectedCluster(undefined);
  };
  
  const closeDialog = () => {
    setDialogOpen(false);
    setDialogAction(null);
  };

  const getExpectedText = () => {
    switch (dialogAction) {
      case 'cluster': {
        const cluster = blocks.find(b => b.name === selectedBlock)?.clusters.find(c => c.name === selectedCluster);
        return cluster ? `Delete Cluster ${cluster.name}` : '';
      }
      case 'block':
        return selectedBlock ? `Delete Block ${selectedBlock}`: '';
      case 'reset':
        return 'Delete all My data';
      default:
        return '';
    }
  };
  const isConfirmationMatch = confirmationText === getExpectedText();
  
  const handleDelete = () => {
    try {
      switch (dialogAction) {
        case 'member':
          if (selectedMember) {
            deleteMember(selectedMember);
            toast({ title: 'Member Deleted' });
          }
          break;
        case 'cluster':
          if (selectedBlock && selectedCluster && isConfirmationMatch) {
            deleteCluster(selectedBlock, selectedCluster as 'A'|'B'|'C'|'D');
            toast({ title: 'Cluster Deleted' });
          }
          break;
        case 'block':
          if (selectedBlock && isConfirmationMatch) {
            deleteBlock(selectedBlock);
            toast({ title: 'Block Deleted' });
          }
          break;
        case 'reset':
          if (isConfirmationMatch) {
            resetAllData();
            toast({ title: 'All Data Reset' });
          }
          break;
      }
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Error", description: error.message });
    }
    closeDialog();
  };
  
  const dangerActions = [
    { id: 'member', label: 'Delete a Member' },
    { id: 'cluster', label: 'Delete a Cluster' },
    { id: 'block', label: 'Delete a Block' },
    { id: 'reset', label: 'Reset All Data' },
  ];
  
  const memberToDelete = allMembers.find(m => m.id === selectedMember);
  const expectedText = getExpectedText();
  
  let dialogTitle = '';
  let isTextConfirmation = false;
  
  switch (dialogAction) {
      case 'member':
          dialogTitle = `Are you sure you want to delete ${memberToDelete?.name}?`;
          break;
      case 'cluster':
          dialogTitle = `Are you absolutely sure?`;
          isTextConfirmation = true;
          break;
      case 'block':
          dialogTitle = `Are you absolutely sure?`;
          isTextConfirmation = true;
          break;
      case 'reset':
          dialogTitle = `Are you absolutely sure?`;
          isTextConfirmation = true;
          break;
  }

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {dangerActions.map((dangerAction) => (
            <div key={dangerAction.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg border-dashed border-destructive gap-4">
              <div><h3 className="font-semibold">{dangerAction.label}</h3></div>
              <Button variant="destructive" onClick={() => openDialog(dangerAction.id as any)} className="w-full sm:w-auto">{dangerAction.label}</Button>
            </div>
          ))}
        </CardContent>
      </Card>
      
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'member' && 'This action is permanent and cannot be undone.'}
              {dialogAction === 'cluster' && <>This will delete the cluster and all members in it. Please type <strong className="text-destructive-foreground">{expectedText}</strong> to confirm.</>}
              {dialogAction === 'block' && <>This will delete the block, its clusters, and all members. Please type <strong className="text-destructive-foreground">{expectedText}</strong> to confirm.</>}
              {dialogAction === 'reset' && <>This will delete all data. Please type <strong className="text-destructive-foreground">{expectedText}</strong> to confirm.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {dialogAction === 'member' && (
            <div className="py-4">
              <Label>Select member to delete</Label>
              <Select onValueChange={setSelectedMember} value={selectedMember}>
                <SelectTrigger><SelectValue placeholder="Select Member" /></SelectTrigger>
                <SelectContent>
                  {allMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name} ({m.accountNumber})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {dialogAction === 'cluster' && (
            <div className="grid gap-4 py-4">
              <Select onValueChange={(value) => { setSelectedBlock(value); setSelectedCluster(undefined); }} value={selectedBlock}>
                <SelectTrigger><SelectValue placeholder="Select Block" /></SelectTrigger>
                <SelectContent>
                  {blocks.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedBlock && (
                  <Select onValueChange={setSelectedCluster} value={selectedCluster}>
                  <SelectTrigger><SelectValue placeholder="Select Cluster" /></SelectTrigger>
                  <SelectContent>
                    {blocks.find(b => b.name === selectedBlock)?.clusters.map(c => <SelectItem key={c.name} value={c.name}>Cluster {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          
          {dialogAction === 'block' && (
            <div className="grid gap-4 py-4">
              <Select onValueChange={setSelectedBlock} value={selectedBlock}>
                <SelectTrigger><SelectValue placeholder="Select Block" /></SelectTrigger>
                <SelectContent>
                  {blocks.map(b => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {isTextConfirmation && (
            <Input 
              value={confirmationText} 
              onChange={(e) => setConfirmationText(e.target.value)} 
              placeholder={expectedText} 
            />
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={
                (dialogAction === 'member' && !selectedMember) ||
                (isTextConfirmation && !isConfirmationMatch)
              }
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AdminAccount({ onFeePaid }: { onFeePaid: () => void; }) {
  const { toast } = useToast();
  const { allMembers, adminTransactions, chargePassbookFee, bankTransactions, addBankTransaction, deleteAdminTransaction, updateBankTransaction, deleteBankTransaction } = useData();
  const [, setForceRender] = useState({});

  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [isConfirmingPassbookFee, setIsConfirmingPassbookFee] = useState(false);
  const [isInsufficientBalance, setIsInsufficientBalance] = useState(false);
  
  const adminBalance = adminTransactions.reduce((acc, tx) => acc + tx.amount, 0);

  const selectedMember = useMemo(() => {
      if (!selectedMemberId) return null;
      return allMembers.find(m => m.id === selectedMemberId) || null;
  }, [selectedMemberId, allMembers]);


  const handlePassbookFeeClick = () => {
    if (!selectedMember) {
        toast({ variant: 'destructive', title: "Error", description: "Please select a member." });
        return;
    }
    if (selectedMember.balance < 50) {
        setIsInsufficientBalance(true);
    } else {
        setIsConfirmingPassbookFee(true);
    }
  };

  const handleChargePassbookFee = () => {
    if (!selectedMemberId) return;

    try {
      chargePassbookFee(selectedMemberId);
      toast({ title: 'Passbook Fee Charged', description: `₹50 has been charged to the selected member.` });
      onFeePaid();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsConfirmingPassbookFee(false);
        setSelectedMemberId(null);
    }
  };
  
  const [bankTxSheetOpen, setBankTxSheetOpen] = useState(false);
  const [editingBankTx, setEditingBankTx] = useState<BankTransaction | null>(null);

  const handleEditBankTx = (tx: BankTransaction) => {
    setEditingBankTx(tx);
    setBankTxSheetOpen(true);
  };
  
  const enrichedAdminTransactions: (AdminTransaction & { memberName?: string })[] = adminTransactions.map(tx => ({
    ...tx,
    memberName: allMembers.find(m => m.id === tx.memberId)?.name || 'N/A'
  })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
    <AddBankTransactionSheet 
        open={bankTxSheetOpen} 
        onOpenChange={(isOpen) => {
            if (!isOpen) setEditingBankTx(null);
            setBankTxSheetOpen(isOpen);
        }}
        onDone={() => setForceRender({})}
        transactionToEdit={editingBankTx ?? undefined}
    />
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Balance</CardTitle>
          <CardDescription>Total fees collected from members.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">₹{adminBalance.toLocaleString('en-IN')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Passbook Fee</CardTitle>
          <CardDescription>Charge a ₹50 fee to a member for a new passbook.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full sm:w-[350px] justify-between"
                    >
                        {selectedMemberId
                            ? allMembers.find((member) => member.id === selectedMemberId)?.name
                            : "Select member..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0">
                    <Command>
                        <CommandInput placeholder="Search member by name or A/C no..." />
                        <CommandList>
                            <CommandEmpty>No member found.</CommandEmpty>
                            <CommandGroup>
                                {allMembers.map((member) => (
                                    <CommandItem
                                        key={member.id}
                                        value={`${member.name} ${member.accountNumber}`}
                                        onSelect={() => {
                                            setSelectedMemberId(member.id);
                                            setOpenCombobox(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedMemberId === member.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {member.name} ({member.accountNumber})
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <Button variant="destructive" disabled={!selectedMemberId} onClick={handlePassbookFeeClick}>
                <BookText className="mr-2 h-4 w-4" /> Charge Passbook Fee
            </Button>
        </CardContent>
      </Card>

       <AlertDialog open={isConfirmingPassbookFee} onOpenChange={setIsConfirmingPassbookFee}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Passbook Fee</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to charge ₹50 to {selectedMember?.name}? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleChargePassbookFee}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isInsufficientBalance} onOpenChange={setIsInsufficientBalance}>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Insufficient Balance</AlertDialogTitle>
                    <AlertDialogDescription>
                        {selectedMember?.name}'s balance is less than ₹50. Please record a cash-in of at least ₹50 before charging the fee.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsInsufficientBalance(false)}>Cancel</AlertDialogCancel>
                    {selectedMember && (
                        <TransactionDialog 
                            member={selectedMember} 
                            type="in" 
                            onTransactionComplete={() => {
                                onFeePaid();
                                setIsInsufficientBalance(false);
                            }}
                            trigger={<Button>Fast Cash In</Button>}
                        />
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      
      <Card>
        <CardHeader>
          <CardTitle>Admin Fee Transaction History</CardTitle>
          <CardDescription>A log of all registration and passbook fees collected.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Fee Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrichedAdminTransactions.length > 0 ? (
                enrichedAdminTransactions.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.date), 'dd MMM, yyyy, hh:mm a')}</TableCell>
                    <TableCell>{tx.memberName}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'registration_fee' ? 'secondary' : 'outline'}>
                        {tx.type === 'registration_fee' ? 'Registration Fee' : 'Passbook Renew Charge'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">₹{tx.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Fee Transaction?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete this fee record. It will NOT refund the amount to the member. Are you sure?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteAdminTransaction(tx.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">No fee transactions found.</TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Real Bank Transaction Log</CardTitle>
                    <CardDescription>A private log for your real-world bank deposits and withdrawals.</CardDescription>
                </div>
                <Button onClick={() => setBankTxSheetOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Bank Transaction
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bankTransactions.length > 0 ? (
                        bankTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                            <TableRow key={tx.id}>
                                <TableCell>{format(new Date(tx.date), 'dd MMM, yyyy')}</TableCell>
                                <TableCell>
                                    <Badge variant={tx.type === 'deposit' ? 'default' : 'destructive'} className={cn(tx.type === 'deposit' ? 'bg-green-600' : '', 'text-white')}>
                                      {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{tx.transacterName}</TableCell>
                                <TableCell className="font-medium">₹{tx.amount.toLocaleString('en-IN')}</TableCell>
                                <TableCell>{tx.remarks}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditBankTx(tx)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Bank Log?</AlertDialogTitle>
                                                <AlertDialogDescription>Are you sure you want to delete this bank transaction log? This action is permanent.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteBankTransaction(tx.id)}>Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24">No bank transactions recorded.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
    </>
  )
}

function AddBankTransactionSheet({ open, onOpenChange, onDone, transactionToEdit }: { open: boolean, onOpenChange: (open: boolean) => void, onDone: () => void, transactionToEdit?: BankTransaction }) {
    const { addBankTransaction, updateBankTransaction } = useData();
    const { toast } = useToast();
    const formRef = React.useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (open) {
            // Reset form when opening, especially for switching between edit/add
            formRef.current?.reset();
            // Repopulate if editing
            if (transactionToEdit) {
                 const form = formRef.current;
                 if (form) {
                    (form.elements.namedItem('date') as HTMLInputElement).value = transactionToEdit.date.split('T')[0];
                    (form.elements.namedItem('type') as HTMLSelectElement).value = transactionToEdit.type;
                    (form.elements.namedItem('transacterName') as HTMLInputElement).value = transactionToEdit.transacterName;
                    (form.elements.namedItem('phoneNumber') as HTMLInputElement).value = transactionToEdit.phoneNumber || '';
                    (form.elements.namedItem('amount') as HTMLInputElement).value = String(transactionToEdit.amount);
                    (form.elements.namedItem('transactionNumber') as HTMLInputElement).value = transactionToEdit.transactionNumber || '';
                    (form.elements.namedItem('remarks') as HTMLInputElement).value = transactionToEdit.remarks || '';
                 }
            } else {
                 const form = formRef.current;
                 if (form) {
                    (form.elements.namedItem('date') as HTMLInputElement).value = new Date().toISOString().split('T')[0];
                 }
            }
        }
    }, [open, transactionToEdit]);


    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        if (!data.date || !data.type || !data.transacterName || !data.amount) {
            toast({ variant: 'destructive', title: "Missing Fields", description: "Please fill out all required fields." });
            return;
        }

        try {
            const payload = {
                date: data.date as string,
                type: data.type as 'deposit' | 'withdrawal',
                transacterName: data.transacterName as string,
                phoneNumber: data.phoneNumber as string,
                amount: Number(data.amount),
                transactionNumber: data.transactionNumber as string,
                remarks: data.remarks as string,
            };

            if (transactionToEdit) {
                updateBankTransaction(transactionToEdit.id, payload);
                toast({ title: "Bank Transaction Updated" });
            } else {
                addBankTransaction(payload);
                toast({ title: "Bank Transaction Saved" });
            }

            onDone();
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };
    
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col h-full">
                <SheetHeader>
                    <SheetTitle>{transactionToEdit ? 'Edit' : 'Log'} Bank Transaction</SheetTitle>
                    <SheetDescription>
                        {transactionToEdit ? 'Update the details of this transaction.' : 'Record a deposit or withdrawal from your real bank account.'}
                    </SheetDescription>
                </SheetHeader>
                <form onSubmit={handleSubmit} ref={formRef} className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-6 -mr-6 py-4 grid gap-4 content-start">
                        <div className="space-y-1">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" name="date" type="date" required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="type">Type</Label>
                             <Select name="type" required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select transaction type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="deposit">Deposit</SelectItem>
                                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="transacterName">Transacter Name</Label>
                            <Input id="transacterName" name="transacterName" required />
                        </div>
                         <div className="space-y-1">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input id="phoneNumber" name="phoneNumber" type="tel" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="amount">Amount</Label>
                            <Input id="amount" name="amount" type="number" step="0.01" required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="transactionNumber">Transaction Number (Optional)</Label>
                            <Input id="transactionNumber" name="transactionNumber" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="remarks">Remarks (Optional)</Label>
                            <Input id="remarks" name="remarks" />
                        </div>
                    </div>
                    <SheetFooter className="mt-auto pt-4 border-t">
                         <SheetClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </SheetClose>
                        <Button type="submit">Save Log</Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

export default function SettingsPage() {
    const { addBlockOpen, setAddBlockOpen } = useCommandMenu();
    const [, forceRender] = useState({});

  return (
    <>
    <AddBlockSheet open={addBlockOpen} onOpenChange={setAddBlockOpen} onDone={() => forceRender({})} />
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="admins">Admins</TabsTrigger>
        <TabsTrigger value="admin-account">Admin Account</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="danger">Danger Zone</TabsTrigger>
      </TabsList>
      <TabsContent value="general" className="space-y-4">
        <GeneralSettings />
      </TabsContent>
       <TabsContent value="admin-account">
        <AdminAccount onFeePaid={() => forceRender({})} />
      </TabsContent>
      <TabsContent value="admins">
        <AdminManagement />
      </TabsContent>
       <TabsContent value="data">
        <DataManagement />
      </TabsContent>
       <TabsContent value="danger">
        <DangerZone />
      </TabsContent>
    </Tabs>
    </>
  );
}

function AddBlockSheet({ open, onOpenChange, onDone }: { open: boolean, onOpenChange: (open: boolean) => void, onDone: () => void }) {
    const { addBlock } = useData();
    const { toast } = useToast();
    const [blockName, setBlockName] = useState('');

    const handleSubmit = () => {
        if (!blockName.trim()) {
            toast({ variant: 'destructive', title: "Error", description: "Block name cannot be empty." });
            return;
        }
        try {
            addBlock(blockName.trim());
            toast({ title: "Block Added", description: `Block "${blockName.trim()}" has been created.` });
            onDone();
            onOpenChange(false);
            setBlockName('');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Add New Block</SheetTitle>
                    <SheetDescription>
                        Create a new block to organize clusters and members.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                    <Label htmlFor="block-name">Block Name</Label>
                    <Input
                        id="block-name"
                        value={blockName}
                        onChange={(e) => setBlockName(e.target.value)}
                        placeholder="e.g., Block-1"
                    />
                </div>
                <SheetFooter>
                    <Button onClick={handleSubmit}>Add Block</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
