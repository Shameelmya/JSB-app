'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/lib/data-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowUpDown, Calendar as CalendarIcon, Printer, FileDown, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Member, Transaction } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type SortKey = 'memberName' | 'date' | 'amount' | 'id';
type SortDirection = 'asc' | 'desc';
type TransactionTypeFilter = 'all' | 'in' | 'out';

type EnrichedTransaction = Transaction & {
  member: Pick<Member, 'id' | 'name' | 'accountNumber' | 'block' | 'cluster'>;
};


function EditTransactionDialog({ transaction, member, onSave }: { transaction: EnrichedTransaction, member: Member, onSave: () => void }) {
    const { updateTransaction } = useData();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState(transaction.amount);
    const [date, setDate] = useState(transaction.date.split('T')[0]);
    const [time, setTime] = useState(format(new Date(transaction.date), 'HH:mm'));

    const handleSubmit = () => {
        const newAmount = parseFloat(String(amount));
        if (isNaN(newAmount) || newAmount <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid positive number.' });
            return;
        }

        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        const newDate = new Date(year, month - 1, day, hours, minutes);

        try {
            updateTransaction(member.id, transaction.id, newAmount, newDate.toISOString());
            toast({ title: 'Transaction Updated', description: `Transaction ${transaction.id} has been updated successfully.` });
            onSave();
            setOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Transaction</DialogTitle>
                    <DialogDescription>
                        Editing transaction for {member.name}. Txn ID: {transaction.id}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-amount" className="text-right">Amount</Label>
                        <Input
                            id="edit-amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-date" className="text-right">Date</Label>
                        <Input
                            id="edit-date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-time" className="text-right">Time</Label>
                        <Input
                            id="edit-time"
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AllTransactionsPage() {
  const { allMembers, blocks } = useData();
  const router = useRouter();
  const { toast } = useToast();
  const [, forceRender] = useState({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedBlock, setSelectedBlock] = useState<string | 'all'>('all');
  const [selectedCluster, setSelectedCluster] = useState<string | 'all'>('all');
  const [transactionType, setTransactionType] = useState<TransactionTypeFilter>('all');
  
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const enrichedTransactions: EnrichedTransaction[] = useMemo(() => {
    if (!isClient) return [];
    return allMembers.flatMap(member =>
      member.transactions.map(tx => ({
        ...tx,
        member: {
          id: member.id,
          name: member.name,
          accountNumber: member.accountNumber,
          block: member.block,
          cluster: member.cluster,
        },
      }))
    );
  }, [allMembers, isClient]);

  const filteredAndSortedTransactions = useMemo(() => {
    let transactions = enrichedTransactions;

    // Filter by text search
    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        transactions = transactions.filter(tx => 
            tx.member.name.toLowerCase().includes(lowerQuery) || 
            tx.member.accountNumber.toLowerCase().includes(lowerQuery) ||
            tx.remarks.toLowerCase().includes(lowerQuery) ||
            tx.id.toLowerCase().includes(lowerQuery)
        );
    }
    
    // Filter by Block
    if (selectedBlock !== 'all') {
        transactions = transactions.filter(tx => tx.member.block === selectedBlock);
    }

    // Filter by Cluster
    if (selectedCluster !== 'all') {
        transactions = transactions.filter(tx => tx.member.cluster === selectedCluster);
    }

    // Filter by Transaction Type
    if (transactionType !== 'all') {
        transactions = transactions.filter(tx => tx.type === transactionType);
    }
    
    // Filter by Date Range
    if (dateRange?.from) {
        const from = dateRange.from;
        from.setHours(0,0,0,0);
        const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
        to.setHours(23,59,59,999);
        transactions = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= from && txDate <= to;
        });
    }

    // Sort
    return [...transactions].sort((a, b) => {
        let comparison = 0;

        switch (sortKey) {
            case 'memberName':
                comparison = a.member.name.localeCompare(b.member.name);
                break;
            case 'date':
                comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
                break;
            case 'amount':
                comparison = a.amount - b.amount;
                break;
            case 'id':
                comparison = a.id.localeCompare(b.id);
                break;
            default:
                comparison = 0;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });

  }, [enrichedTransactions, searchQuery, selectedBlock, selectedCluster, transactionType, dateRange, sortKey, sortDirection]);
  
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
        setSortKey(key);
        setSortDirection(key === 'date' ? 'desc' : 'asc');
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          All Transactions
        </h1>
        <div className="hidden items-center gap-2 md:ml-auto md:flex">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast({title: "Coming Soon", description: "Excel export will be available soon."})}>
            <FileDown className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Filter & Sort Transactions</CardTitle>
          <CardDescription>
            Use the filters below to narrow down the transaction history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Input 
                    placeholder="Search Name, Acc No, Txn ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="lg:col-span-2"
                />
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? `${format(dateRange.from, 'dd/MM/yy')} - ${dateRange.to ? format(dateRange.to, 'dd/MM/yy') : ''}` : 'Date Range'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                  </PopoverContent>
                </Popover>
                <Select value={selectedBlock} onValueChange={(val: 'all' | string) => { setSelectedBlock(val); setSelectedCluster('all'); }}>
                  <SelectTrigger><SelectValue placeholder="All Blocks" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blocks</SelectItem>
                     {blocks.map(block => <SelectItem key={block.name} value={block.name}>{block.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                 <Select value={selectedCluster} onValueChange={setSelectedCluster} disabled={selectedBlock === 'all'}>
                  <SelectTrigger><SelectValue placeholder="All Clusters" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clusters</SelectItem>
                    {selectedBlock !== 'all' && blocks.find(b => b.name === selectedBlock)?.clusters.map(cluster => (
                        <SelectItem key={cluster.name} value={cluster.name}>Cluster {cluster.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Type:</span>
                    <Button variant={transactionType === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTransactionType('all')}>All</Button>
                    <Button variant={transactionType === 'in' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTransactionType('in')}>Cash In</Button>
                    <Button variant={transactionType === 'out' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTransactionType('out')}>Cash Out</Button>
                </div>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Displaying {filteredAndSortedTransactions.length} transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('memberName')} className="px-2 py-1 h-auto -ml-2">
                          Member <ArrowUpDown className="h-4 w-4 inline-block ml-1" />
                      </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Block/Cluster</TableHead>
                  <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('date')} className="px-2 py-1 h-auto -ml-2">
                          Date & Time <ArrowUpDown className="h-4 w-4 inline-block ml-1" />
                      </Button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Remarks</TableHead>
                  <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('id')} className="px-2 py-1 h-auto -ml-2">
                          Txn ID <ArrowUpDown className="h-4 w-4 inline-block ml-1" />
                      </Button>
                  </TableHead>
                  <TableHead className="text-right">
                      <Button variant="ghost" onClick={() => handleSort('amount')} className="px-2 py-1 h-auto -mr-2">
                          Amount <ArrowUpDown className="h-4 w-4 inline-block ml-1" />
                      </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTransactions.length > 0 ? (
                  filteredAndSortedTransactions.map((tx) => {
                      const member = allMembers.find(m => m.id === tx.member.id);
                      return (
                      <TableRow key={tx.id}>
                      <TableCell>
                          <div className="font-medium">{tx.member.name}</div>
                          <div className="text-sm text-muted-foreground">{tx.member.accountNumber}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{tx.member.block} / <Badge variant="outline">{tx.member.cluster}</Badge></TableCell>
                      <TableCell>{format(new Date(tx.date), 'dd MMM, yyyy, hh:mm a')}</TableCell>
                      <TableCell>
                          <Badge variant={tx.type === 'in' ? 'default' : 'destructive'} className={tx.type === 'in' ? 'bg-green-600' : ''}>
                          {tx.type === 'in' ? 'Cash In' : 'Cash Out'}
                          </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{tx.remarks || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'in' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {member && <EditTransactionDialog transaction={tx} member={member} onSave={() => forceRender({})} />}
                      </TableCell>
                      </TableRow>
                  )})
                ) : (
                  <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground h-24">No transactions match your filters.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
