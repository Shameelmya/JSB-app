'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useData } from '@/lib/data-provider';
import type { Member } from '@/types';
import { ArrowRight, ArrowUpDown, MinusCircle, PlusCircle, Search, Upload, AlertTriangle, Download } from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { TransactionDialog } from './transaction-dialog';
import { Label } from '@/components/ui/label';

function BulkTransactionUploadSheet({ onDone, trigger }: { onDone: () => void, trigger?: React.ReactNode }) {
  const { bulkAddTransactions } = useData();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [csvText, setCsvText] = useState<string | null>(null);

  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ duplicates: number } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => setCsvText(e.target?.result as string);
      reader.readAsText(selectedFile);
    }
  };
  
  const resetState = () => {
    setOpen(false);
    setFile(null);
    setCsvText(null);
    setUploadResult(null);
    setShowOverwriteDialog(false);
    setIsUploading(false);
  };

  const handleUpload = async (overwrite = false) => {
    if (!csvText) {
      toast({ variant: 'destructive', title: 'No File Selected', description: 'Please select a CSV file to upload.' });
      return;
    }

    setIsUploading(true);
    setShowOverwriteDialog(false);

    try {
        const result = await bulkAddTransactions(csvText, overwrite);
        if (!overwrite && result.duplicates > 0) {
            setUploadResult(result);
            setShowOverwriteDialog(true);
        } else {
            toast({ title: 'Upload Complete', description: `${result.success} transactions processed. ${result.failed} rows failed.` });
            onDone();
            resetState();
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
        if (overwrite) {
            setIsUploading(false);
        }
    }
  };

  const handleDownloadTemplate = () => {
    const headers = 'accountNumber,type,amount,transactionId,date,remarks';
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'transaction_template.csv');
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
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Bulk Upload Transactions</SheetTitle>
          <SheetDescription>
            Upload a CSV file to add historical transaction data.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-4">
          <Alert>
             <AlertTriangle className="h-4 w-4" />
            <AlertTitle>CSV Format Instructions</AlertTitle>
            <AlertDescription>
              <p className="mb-2">Your CSV file must have these headers: <strong>accountNumber, type, amount</strong>.</p>
              <p className="mb-2">Optional headers: <strong>transactionId, date, remarks</strong>.</p>
              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                <li><strong>type</strong> must be 'in' or 'out'.</li>
                <li><strong>date</strong> should be in ISO format (e.g., YYYY-MM-DDTHH:MM:SSZ). If blank, current time is used.</li>
                <li>If <strong>transactionId</strong> is provided and it already exists, the row will be updated.</li>
              </ul>
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
          <Button onClick={() => handleUpload(false)} disabled={!file || isUploading}>
            {isUploading ? 'Analyzing...' : 'Upload Transactions'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    {/* Overwrite dialog would go here if needed */}
    </>
  );
}


function MemberListItem({ member, onTransaction, sortKey }: { member: Member, onTransaction: () => void, sortKey: 'accountNumber' | 'name' }) {
    const mainText = sortKey === 'name' ? member.name : member.accountNumber;
    const subText = sortKey === 'name' ? `Acc: ${member.accountNumber}` : `Name: ${member.name}`;

    return (
        <li
        key={member.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-md border"
        >
        <div className="mb-2 sm:mb-0">
            <p className="font-semibold">{mainText}</p>
            <p className="text-sm text-muted-foreground">
                {subText} | Bal: <span className="font-mono">₹{member.balance.toLocaleString('en-IN')}</span>
            </p>
        </div>
        <div className="flex items-center gap-2">
            <TransactionDialog member={member} type="in" onTransactionComplete={onTransaction} />
            <TransactionDialog member={member} type="out" onTransactionComplete={onTransaction} />
        </div>
        </li>
    );
}


export default function TransactionsPage() {
    const { blocks, allMembers } = useData();
    const [forceRenderValue, forceRender] = useState({});

    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<'accountNumber' | 'name'>('accountNumber');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [openAccordions, setOpenAccordions] = useState<string[]>([]);


    const handleSort = (key: 'accountNumber' | 'name') => {
        if (sortKey === key) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };
    
    const filteredAndSortedMembers = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        const filtered = searchQuery
            ? allMembers.filter(member =>
                member.name.toLowerCase().includes(lowercasedQuery) ||
                member.accountNumber.toLowerCase().includes(lowercasedQuery)
            )
            : allMembers;

        return [...filtered].sort((a, b) => {
            const aValue = a[sortKey];
            const bValue = b[sortKey];
            const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
            return sortDirection === 'asc' ? comparison : -comparison;
        });

    }, [allMembers, searchQuery, sortKey, sortDirection]);
    
    const blockClusterMap = useMemo(() => {
        const map = new Map<string, Map<string, Member[]>>();
        blocks.forEach(block => {
            const clusterMap = new Map<string, Member[]>();
            block.clusters.forEach(cluster => {
                clusterMap.set(cluster.name, []);
            });
            map.set(block.name, clusterMap);
        });

        filteredAndSortedMembers.forEach(member => {
            map.get(member.block)?.get(member.cluster)?.push(member);
        });
        
        return map;
    }, [blocks, filteredAndSortedMembers]);

     useEffect(() => {
        if (searchQuery) {
            const openItems = new Set<string>();
            filteredAndSortedMembers.forEach(member => {
                openItems.add(member.block);
                openItems.add(`${member.block}-${member.cluster}`);
            });
            setOpenAccordions(Array.from(openItems));
        } else {
            // Keep existing accordions open if search is cleared
        }
    }, [searchQuery, filteredAndSortedMembers]);

    const handleTransaction = () => {
        forceRender({});
    };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Transaction Management</CardTitle>
            <CardDescription>
              Record transactions for members. Use the search and sort to quickly find members.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <BulkTransactionUploadSheet onDone={handleTransaction} />
            <Button asChild variant="primary">
              <Link href="/dashboard/transactions/all">
                View All Transactions <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
         <div className="flex flex-col sm:flex-row gap-2 mb-6 p-4 border rounded-lg bg-muted/50">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or account number..."
                    className="pl-8 w-full bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto bg-background">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        Sort by: {sortKey === 'name' ? 'Name' : 'Account No.'} ({sortDirection === 'asc' ? 'Asc' : 'Desc'})
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup value={sortKey} onValueChange={(val) => handleSort(val as 'accountNumber' | 'name')}>
                        <DropdownMenuRadioItem value="accountNumber">Account Number</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        <Accordion type="multiple" className="w-full" value={openAccordions} onValueChange={setOpenAccordions}>
          {Array.from(blockClusterMap.entries()).map(([blockName, clusterMap]) => {
            const blockHasMembers = Array.from(clusterMap.values()).some(members => members.length > 0);
            if (!blockHasMembers && searchQuery) return null;

            return (
                <AccordionItem value={blockName} key={blockName}>
                  <AccordionTrigger className="text-lg font-medium">{blockName}</AccordionTrigger>
                  <AccordionContent>
                    <Accordion type="multiple" className="w-full pl-4" value={openAccordions} onValueChange={setOpenAccordions}>
                      {Array.from(clusterMap.entries()).map(([clusterName, members]) => {
                        if (members.length === 0 && searchQuery) return null;
                        const originalCluster = blocks.find(b => b.name === blockName)?.clusters.find(c => c.name === clusterName);
                        const totalMembers = originalCluster?.members.length || 0;

                        return (
                             <AccordionItem value={`${blockName}-${clusterName}`} key={clusterName}>
                              <AccordionTrigger>Cluster {clusterName} ({searchQuery ? `${members.length} found` : `${totalMembers} members`})</AccordionTrigger>
                              <AccordionContent>
                                <ul className="space-y-3">
                                  {members.map(member => (
                                    <MemberListItem key={member.id} member={member} onTransaction={handleTransaction} sortKey={sortKey} />
                                  ))}
                                  {members.length === 0 && (
                                     <li className="text-center text-muted-foreground py-4">No members match your search in this cluster.</li>
                                  )}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                        )
                      })}
                    </Accordion>
                  </AccordionContent>
                </AccordionItem>
            )
          })}
        </Accordion>
         {filteredAndSortedMembers.length === 0 && searchQuery && (
            <div className="text-center text-muted-foreground py-10">No members found matching your search query.</div>
        )}
      </CardContent>
    </Card>
  );
}
