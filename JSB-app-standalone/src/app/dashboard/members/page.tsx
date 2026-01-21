'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import {
  File,
  MoreHorizontal,
  PlusCircle,
  Upload,
  ArrowUpDown,
  Filter,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { useData } from '@/lib/data-provider';
import type { Member, Block, Cluster } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCommandMenu } from '@/hooks/use-command-menu';
import { TransactionDialog } from '../transactions/transaction-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type SortKey = 'accountNumber' | 'name' | 'balance' | 'totalIn' | 'totalOut' | 'hasPaidRegistrationFee';
type SortDirection = 'asc' | 'desc';
type FeeStatusFilter = 'all' | 'paid' | 'unpaid';

export function AddMemberSheet({ onDone, trigger, defaultBlock, defaultCluster, member: memberToEdit, open, onOpenChange }: { onDone: () => void, trigger?: React.ReactNode, defaultBlock?: string, defaultCluster?: Cluster['name'], member?: Member, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const { blocks, addMember, updateMember, getMemberByAccountNumber } = useData();
  const { toast } = useToast();
  
  const member = memberToEdit;
  
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [memberDataToSave, setMemberDataToSave] = useState<any>(null);
  const [existingMember, setExistingMember] = useState<Member | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const memberPayload = {
      name: data.name as string,
      houseNumber: data.houseNumber as string,
      husbandName: data.husbandName as string,
      accountNumber: data.accountNumber as string || (member ? member.accountNumber : `MB${Date.now()}`),
      address: data.address as string,
      phone: data.phone as string,
      whatsapp: data.whatsapp as string,
      block: data.block as string,
      cluster: data.cluster as string,
    };
    
    setMemberDataToSave(memberPayload);

    // If we are NOT editing an existing member, check for duplicate account numbers
    if (!member) {
        const potentialDuplicate = getMemberByAccountNumber(memberPayload.accountNumber);
        if (potentialDuplicate) {
            setExistingMember(potentialDuplicate);
            setShowOverwriteDialog(true);
            return;
        }
    }

    try {
       if (member) {
        updateMember(member.id, memberPayload);
        toast({ title: "Member Updated", description: `${memberPayload.name} has been updated.` });
      } else {
        addMember(memberPayload);
        toast({ title: "Member Added", description: `${memberPayload.name} has been added.` });
      }
      onDone();
      if(onOpenChange) onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };
  
  const handleOverwrite = () => {
    if (!existingMember || !memberDataToSave) return;
    try {
        updateMember(existingMember.id, memberDataToSave);
        toast({ title: "Member Overwritten", description: `Details for A/C No. ${memberDataToSave.accountNumber} have been updated.` });
        onDone();
        if(onOpenChange) onOpenChange(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Overwrite Failed", description: error.message });
    } finally {
        setShowOverwriteDialog(false);
        setExistingMember(null);
        setMemberDataToSave(null);
    }
  };

  const defaultTrigger = (
      <Button size="sm" className="h-8 gap-1">
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Add Member
        </span>
      </Button>
  );

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent className="sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{member ? 'Edit Member' : 'Add New Member'}</SheetTitle>
          <SheetDescription>
            {member ? 'Update the details for this member.' : 'Fill in the details below to register a new member.'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
         <ScrollArea className="flex-1 pr-6 -mr-6">
            <div className="grid gap-4 py-4">
              {!member && (
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accountNumber" className="text-right">Account No.</Label>
                  <Input id="accountNumber" name="accountNumber" className="col-span-3" placeholder={`MB${Date.now()}`} />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" defaultValue={member?.name} className="col-span-3" required />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="houseNumber" className="text-right">House No.</Label>
                <Input id="houseNumber" name="houseNumber" defaultValue={member?.houseNumber} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="husbandName" className="text-right">Wife of</Label>
                <Input id="husbandName" name="husbandName" defaultValue={member?.husbandName} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Address</Label>
                <Input id="address" name="address" defaultValue={member?.address} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={member?.phone} className="col-span-3" required/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="whatsapp" className="text-right">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={member?.whatsapp} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Block</Label>
                <Select name="block" defaultValue={member?.block || defaultBlock} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a block" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map(block => (
                      <SelectItem key={block.id} value={block.name}>{block.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Cluster</Label>
                <Select name="cluster" defaultValue={member?.cluster || defaultCluster} required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Cluster A</SelectItem>
                    <SelectItem value="B">Cluster B</SelectItem>
                    <SelectItem value="C">Cluster C</SelectItem>
                    <SelectItem value="D">Cluster D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>
          <SheetFooter className="mt-4 pt-4 border-t">
            <Button type="submit">{member ? 'Save Changes' : 'Add Member'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>

    <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate Account Number</AlertDialogTitle>
                <AlertDialogDescription>
                    Account number <strong>{memberDataToSave?.accountNumber}</strong> is already assigned to <strong>{existingMember?.name}</strong>. Would you like to overwrite this member's data with the new information?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowOverwriteDialog(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleOverwrite}>
                    Overwrite
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

export function BulkUploadSheet({ onDone, trigger }: { onDone: () => void, trigger?: React.ReactNode }) {
  const { bulkAddMembers } = useData();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<{ duplicates: number; membersToOverwrite: Member[] } | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        const selectedFile = event.target.files[0];
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
            setCsvText(e.target?.result as string);
        };
        reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!csvText) {
      toast({ variant: 'destructive', title: 'No File Selected', description: 'Please select a CSV file to upload.' });
      return;
    }

    setIsUploading(true);
    try {
        const result = await bulkAddMembers(csvText, false); // First pass: check for duplicates
        if (result.duplicates > 0) {
            setBulkUploadResult(result);
            setShowOverwriteDialog(true);
        } else {
            toast({ title: 'Upload Successful', description: `${result.success} new members have been added.` });
            onDone();
            resetState();
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleOverwrite = async () => {
      if (!csvText) return;
      setIsUploading(true);
      setShowOverwriteDialog(false);
      try {
          const result = await bulkAddMembers(csvText, true); // Second pass: overwrite
          toast({ title: 'Upload Complete', description: `Updated ${bulkUploadResult?.duplicates} members and added ${result.success - (bulkUploadResult?.duplicates || 0)} new members.` });
          onDone();
          resetState();
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
      } finally {
          setIsUploading(false);
      }
  };
  
  const resetState = () => {
    setOpen(false);
    setFile(null);
    setCsvText(null);
    setBulkUploadResult(null);
    setShowOverwriteDialog(false);
  };
  
  const handleDownloadTemplate = () => {
    const headers = 'name,houseNumber,phone,block,cluster,accountNumber,husbandName,address,whatsapp';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'member_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const defaultTrigger = (
    <Button size="sm" variant="outline" className="h-8 gap-1">
      <Upload className="h-3.5 w-3.5" />
      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
        Bulk Upload
      </span>
    </Button>
  );

  return (
    <>
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) resetState(); else setOpen(true);}}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Bulk Upload Members</SheetTitle>
          <SheetDescription>
            Upload a CSV file to add multiple members at once. Blocks and clusters will be created if they do not exist.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-4">
          <Alert>
             <AlertTriangle className="h-4 w-4" />
            <AlertTitle>CSV Format Instructions</AlertTitle>
            <AlertDescription>
              <p>Required headers: <strong>name, houseNumber, phone, block, cluster</strong>.</p>
              <p>Optional headers: <strong>accountNumber, husbandName, address, whatsapp</strong>.</p>
               <p className="text-xs text-muted-foreground mt-1">If `phone` is blank, the `whatsapp` number will be used. Phone numbers should be 10 digits.</p>
              <Button variant="link" size="sm" className="p-0 h-auto mt-2" onClick={handleDownloadTemplate}>
                  <Download className="h-3 w-3 mr-1"/> Download Template
              </Button>
            </AlertDescription>
          </Alert>
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? 'Analyzing...' : 'Upload and Add Members'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
     <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Duplicate Account Numbers Found</AlertDialogTitle>
                <AlertDialogDescription>
                    {bulkUploadResult?.duplicates} members in your file have existing account numbers. Proceeding will overwrite their information.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleOverwrite}>
                    Overwrite Duplicates & Add New
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}


function DeleteMemberDialog({ member, onDone }: { member: Member, onDone: () => void }) {
  const { deleteMember } = useData();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    deleteMember(member.id);
    toast({ title: "Member Deleted", description: `${member.name} has been removed.` });
    onDone();
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
          Delete Member
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the account for <strong>{member.name}</strong> and remove all their associated data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PayFeeCell({ member, onFeePaid }: { member: Member, onFeePaid: () => void }) {
    const { chargeRegistrationFee } = useData();
    const { toast } = useToast();
    const [isConfirmingFee, setIsConfirmingFee] = useState(false);
    const [isInsufficientBalance, setIsInsufficientBalance] = useState(false);
    const [isFastCashInOpen, setIsFastCashInOpen] = useState(false);
    
    if (member.hasPaidRegistrationFee) {
        return (
            <Badge variant={'default'} className={cn('bg-green-600', 'text-white')}>
                Paid
            </Badge>
        );
    }
    
    const handlePayFeeClick = () => {
        if (member.balance < 50) {
            setIsInsufficientBalance(true);
        } else {
            setIsConfirmingFee(true);
        }
    };

    const handleChargeRegFee = () => {
        try {
            chargeRegistrationFee(member.id);
            toast({ title: 'Fee Charged', description: `Registration fee charged to ${member.name}.` });
            onFeePaid();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
        } finally {
            setIsConfirmingFee(false);
        }
    };

    const handleOpenFastCashIn = () => {
        setIsInsufficientBalance(false);
        setIsFastCashInOpen(true);
    };
    
    return (
        <>
            <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={handlePayFeeClick}>
                Pay Fee
            </Button>
            
            <AlertDialog open={isConfirmingFee} onOpenChange={setIsConfirmingFee}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Registration Fee</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will deduct ₹50 from {member.name}'s balance (current: ₹{member.balance.toLocaleString()}) and mark the fee as paid. Proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleChargeRegFee}>Confirm & Pay</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog open={isInsufficientBalance} onOpenChange={setIsInsufficientBalance}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Insufficient Balance</AlertDialogTitle>
                        <AlertDialogDescription>
                            {member.name}'s balance is less than ₹50. Please record a cash-in of at least ₹50 before paying the fee.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsInsufficientBalance(false)}>Cancel</AlertDialogCancel>
                        <Button onClick={handleOpenFastCashIn}>Fast Cash In</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <TransactionDialog 
                member={member} 
                type="in" 
                open={isFastCashInOpen}
                onOpenChange={setIsFastCashInOpen}
                onTransactionComplete={() => {
                    onFeePaid();
                    setIsFastCashInOpen(false);
                }}
            />
        </>
    )
}

function MembersTable({ onFeePaid }: { onFeePaid: () => void; }) {
  const { allMembers: members, blocks, chargeRegistrationFee, setSearchQuery } = useData();
  const { toast } = useToast();
  const [sortKey, setSortKey] = useState<SortKey>('accountNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [, forceRender] = useState({});
  const [editingMember, setEditingMember] = useState<Member | undefined>(undefined);
  
  const { addMemberOpen, setAddMemberOpen } = useCommandMenu();

  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [feeStatusFilter, setFeeStatusFilter] = useState<FeeStatusFilter>('all');
  const [isClient, setIsClient] = useState(false);
  
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';


  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const filteredMembers = useMemo(() => {
    if (!isClient) return [];
    let filtered = members;
    if (query) {
        const lowerQuery = query.toLowerCase();
        filtered = filtered.filter(m => 
            m.name.toLowerCase().includes(lowerQuery) ||
            m.accountNumber.toLowerCase().includes(lowerQuery)
        );
    }
     if (selectedBlock) {
        filtered = filtered.filter(m => m.block === selectedBlock);
    }
    if (selectedCluster) {
        filtered = filtered.filter(m => m.cluster === selectedCluster);
    }
    if (feeStatusFilter !== 'all') {
        filtered = filtered.filter(m => (feeStatusFilter === 'paid') ? m.hasPaidRegistrationFee : !m.hasPaidRegistrationFee);
    }
    return filtered;
  }, [members, query, selectedBlock, selectedCluster, feeStatusFilter, isClient]);


  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredMembers, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'name', label: 'Name' },
    { key: 'balance', label: 'Balance' },
    { key: 'totalIn', label: 'Total In' },
    { key: 'totalOut', label: 'Total Out' },
    { key: 'hasPaidRegistrationFee', label: 'Reg. Fee Status'}
  ];

  const handleBlockChange = (value: string) => {
      setSelectedBlock(value === 'all' ? null : value);
      setSelectedCluster(null);
  };
  
  const handleClusterChange = (value: string) => {
      setSelectedCluster(value === 'all' ? null : value);
  };

  const handleFeeStatusChange = (value: FeeStatusFilter) => {
      setFeeStatusFilter(value);
  }
  
  const handleEditMember = (member: Member) => {
    setEditingMember(member);
    setAddMemberOpen(true);
  };
  
  const handleSheetOpenChange = (open: boolean) => {
    setAddMemberOpen(open);
    if (!open) {
      setEditingMember(undefined);
    }
  }

  const handleFeePaid = () => {
    forceRender({});
    onFeePaid();
  };


  if (!isClient) {
    return null;
  }

  return (
    <>
    <AddMemberSheet 
      onDone={() => forceRender({})} 
      member={editingMember} 
      open={addMemberOpen}
      onOpenChange={handleSheetOpenChange} 
    />
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>Manage all members of Mahallu Bank.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto items-center gap-2 flex-wrap justify-end">
                <Select onValueChange={handleBlockChange} value={selectedBlock || 'all'}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                        <SelectValue placeholder="Filter by Block" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Blocks</SelectItem>
                        {blocks.map(block => <SelectItem key={block.id} value={block.name}>{block.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select onValueChange={handleClusterChange} value={selectedCluster || 'all'} disabled={!selectedBlock}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                        <SelectValue placeholder="Filter by Cluster" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Clusters</SelectItem>
                        {selectedBlock && blocks.find(b => b.name === selectedBlock)?.clusters.map(cluster => (
                            <SelectItem key={cluster.id} value={cluster.name}>Cluster {cluster.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select onValueChange={handleFeeStatusChange} value={feeStatusFilter || 'all'}>
                    <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                        <SelectValue placeholder="Filter by Fee Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Fee Statuses</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                </Select>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            <ArrowUpDown className="h-4 w-4 mr-2" />
                            Sort by: {sortOptions.find(o => o.key === sortKey)?.label}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuRadioGroup value={sortKey} onValueChange={(val) => handleSort(val as SortKey)}>
                            {sortOptions.map(option => (
                                 <DropdownMenuRadioItem key={option.key} value={option.key}>
                                    {option.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort('accountNumber')}>Account No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Block/Cluster</TableHead>
                <TableHead className="hidden md:table-cell">Reg. Fee</TableHead>
                <TableHead className="text-right" onClick={() => handleSort('balance')}>Balance</TableHead>
                <TableHead className="text-right hidden sm:table-cell" onClick={() => handleSort('totalIn')}>Total In</TableHead>
                <TableHead className="text-right hidden sm:table-cell" onClick={() => handleSort('totalOut')}>Total Out</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.map((member) => {
                const balance = member.balance;
                const totalIn = member.totalIn;
                const totalOut = member.totalOut;

                return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.accountNumber}</TableCell>
                  <TableCell>{member.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{member.block} / <Badge variant="outline">{member.cluster}</Badge></TableCell>
                   <TableCell className="hidden md:table-cell">
                     <PayFeeCell member={member} onFeePaid={handleFeePaid} />
                  </TableCell>
                  <TableCell className="text-right">₹{balance.toLocaleString('en-IN')}</TableCell>
                   <TableCell className="text-right text-green-600 hidden sm:table-cell">₹{totalIn.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-right text-red-600 hidden sm:table-cell">₹{totalOut.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild><Link href={`/dashboard/members/${member.id}`}>View Passbook</Link></DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleEditMember(member)}>Edit Member</DropdownMenuItem>
                        <DeleteMemberDialog member={member} onDone={() => forceRender({})} />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    </>
  );
}

function BlockClusterManagement({ expandActive }: { expandActive: boolean }) {
    const { blocks, addBlock } = useData();
    const [, forceRender] = useState({});

    const [openAccordions, setOpenAccordions] = useState<string[]>([]);
    const { addBlockOpen, setAddBlockOpen } = useCommandMenu();

    useEffect(() => {
        if (expandActive) {
            const activeBlocks = blocks
                .filter(block => block.clusters.some(cluster => cluster.members.length > 0))
                .map(block => block.name);
            setOpenAccordions(activeBlocks);
        }
    }, [expandActive, blocks]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Block &amp; Cluster Management</CardTitle>
                <CardDescription>View and manage member distribution across blocks and clusters.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className='flex justify-end mb-4'>
                    <Button size="sm" className="h-8 gap-1" onClick={() => setAddBlockOpen(true)}>
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                            Add Block
                        </span>
                    </Button>
                </div>
                <Accordion type="multiple" className="w-full" value={openAccordions} onValueChange={setOpenAccordions}>
                    {blocks.map(block => (
                        <AccordionItem value={block.name} key={block.id}>
                            <AccordionTrigger>{block.name} ({block.clusters.reduce((acc, c) => acc + c.members.length, 0)} members)</AccordionTrigger>
                            <AccordionContent>
                                <ul className="space-y-2 pl-4">
                                    {block.clusters.map(cluster => (
                                      <li key={cluster.id}>
                                        <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 rounded-md hover:bg-muted gap-2", 
                                            expandActive && cluster.members.length > 0 && "bg-blue-50 border border-blue-200"
                                        )}>
                                            <div className="flex-1 cursor-pointer">
                                                <span>Cluster {cluster.name}</span>
                                                <Badge className="ml-2">{cluster.members.length} Members</Badge>
                                            </div>
                                        </div>
                                      </li>
                                    ))}
                                     {block.clusters.length === 0 && <li className="text-muted-foreground">No clusters in this block.</li>}
                                </ul>
                                 <div className="mt-4 pl-4">
                                    <AddClusterDialog blockName={block.name} onDone={() => forceRender({})} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}

function AddClusterDialog({ blockName, onDone }: { blockName: string, onDone: () => void }) {
    const { addCluster } = useData();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [clusterName, setClusterName] = useState('');

    const handleSubmit = () => {
        if (!clusterName.trim()) {
            toast({ variant: 'destructive', title: "Error", description: "Cluster name cannot be empty." });
            return;
        }
        try {
            addCluster(blockName, clusterName.trim().toUpperCase());
            toast({ title: "Cluster Added", description: `Cluster "${clusterName.trim().toUpperCase()}" has been added to ${blockName}.` });
            onDone();
            setOpen(false);
            setClusterName('');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };
    
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                 <Button variant="outline" size="sm"><PlusCircle className="h-4 w-4 mr-2" /> Add Cluster</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Add New Cluster to {blockName}</AlertDialogTitle>
                    <AlertDialogDescription>
                        Enter a name for the new cluster (e.g., E, F, G).
                    </AlertDialogDescription>
                </AlertDialogHeader>
                 <div className="py-4">
                    <Label htmlFor="cluster-name">Cluster Name</Label>
                    <Input
                        id="cluster-name"
                        value={clusterName}
                        onChange={(e) => setClusterName(e.target.value)}
                        placeholder="e.g., E"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit}>Add Cluster</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


function MembersPageContent({ onFeePaid }: { onFeePaid: () => void; }) {
  const [, forceRender] = useState({});
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const expand = searchParams.get('expand');
  const { addMemberOpen, setAddMemberOpen, addBlockOpen, setAddBlockOpen } = useCommandMenu();

  const [activeTab, setActiveTab] = useState(tab || 'all');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setActiveTab(tab || 'all');
  }, [tab]);


  if (!isClient) {
      return <div>Loading...</div>;
  }
  
  return (
    <>
      <AddBlockSheet open={addBlockOpen} onOpenChange={setAddBlockOpen} onDone={() => forceRender({})} />
      <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="all">
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">All Members</TabsTrigger>
            <TabsTrigger value="blocks">Block &amp; Cluster</TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
              <Button size="sm" className="h-8 gap-1" onClick={() => setAddMemberOpen(true)}>
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Member</span>
              </Button>
            <BulkUploadSheet onDone={() => forceRender({})} />
          </div>
        </div>
        <TabsContent value="all">
          <MembersTable onFeePaid={onFeePaid} />
        </TabsContent>
        <TabsContent value="blocks">
          <BlockClusterManagement expandActive={expand === 'active'} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function AddBlockSheet({ open, onOpenChange, onDone }: { open: boolean, onOpenChange: (open: boolean) => void, onDone: () => void }) {
    const { addBlock } = useData();
    const { toast } = useToast();
    const [blockName, setBlockName] = useState('');

    const handleSubmit = async () => {
        if (!blockName.trim()) {
            toast({ variant: 'destructive', title: "Error", description: "Block name cannot be empty." });
            return;
        }
        try {
            await addBlock(blockName.trim());
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

export default function MembersPage({ onFeePaid = () => {} }: { onFeePaid?: () => void; }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MembersPageContent onFeePaid={onFeePaid}/>
    </Suspense>
  )
}
