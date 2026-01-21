'use client';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useData } from '@/lib/data-provider';
import { notFound, useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MessageSquare, MinusCircle, Phone, PlusCircle, Printer } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { format } from 'date-fns';
import { TransactionDialog } from '../../transactions/transaction-dialog';
import React, { useMemo, useState, useEffect } from 'react';

export default function MemberPassbookPage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const { getMemberById, loading } = useData();
  const router = useRouter();
  
  const member = useMemo(() => getMemberById(memberId), [getMemberById, memberId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p>Loading passbook...</p>
      </div>
    );
  }
  
  if (!member) {
    notFound();
    return null;
  }
  
  const totalIn = member.transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
  const totalOut = member.transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIn - totalOut;


  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
        </Button>
        <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
          {member.name}'s Passbook
        </h1>
        <div className="items-center gap-2 md:ml-auto flex flex-col sm:flex-row">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="w-full sm:w-auto">
            <Printer className="h-4 w-4 mr-2" /> Print Summary
          </Button>
          <div className="flex w-full sm:w-auto gap-2">
            <TransactionDialog member={member} type="out" onTransactionComplete={() => {}} trigger={
              <Button size="sm" variant="destructive" className="gap-1 flex-1">
                <MinusCircle className="h-3.5 w-3.5" />
                Cash Out
              </Button>
            } />
            <TransactionDialog member={member} type="in" onTransactionComplete={() => {}} trigger={
              <Button size="sm" className="gap-1 flex-1">
                <PlusCircle className="h-3.5 w-3.5" />
                Cash In
              </Button>
            }/>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Member Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
                 <div className="grid gap-1">
                    <div className="text-sm font-medium text-muted-foreground">Account Number</div>
                    <div className="font-semibold">{member.accountNumber}</div>
                </div>
                 <div className="grid gap-1.5">
                    <div className="text-sm font-medium text-muted-foreground">Name</div>
                    <div className="font-semibold">{member.name}</div>
                    {member.husbandName && (
                        <div className="text-sm text-muted-foreground">W/o {member.husbandName}</div>
                    )}
                </div>
                 <div className="grid gap-1">
                    <div className="text-sm font-medium text-muted-foreground">House Number</div>
                    <div>{member.houseNumber}</div>
                </div>
                <div className="grid gap-1">
                    <div className="text-sm font-medium text-muted-foreground">Address</div>
                    <div>{member.address}</div>
                </div>
                 <div className="grid gap-1">
                    <div className="text-sm font-medium text-muted-foreground">Block / Cluster</div>
                    <div>{member.block} / <Badge variant="secondary">{member.cluster}</Badge></div>
                </div>
                <div className="grid gap-1">
                    <div className="text-sm font-medium text-muted-foreground">Contact</div>
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground"/> {member.phone}
                    </div>
                     <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground"/> {member.whatsapp || 'N/A'}
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Total In</span>
                    <span className="text-lg font-bold text-green-600">₹{totalIn.toLocaleString('en-IN')}</span>
                </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Total Out</span>
                    <span className="text-lg font-bold text-red-600">₹{totalOut.toLocaleString('en-IN')}</span>
                </div>
                <Separator />
                 <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">Current Balance</span>
                    <span className="text-2xl font-bold text-primary">₹{balance.toLocaleString('en-IN')}</span>
                </div>
            </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A complete log of all transactions for this member.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead className="hidden sm:table-cell">Transaction ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden md:table-cell">Remarks</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {member.transactions.length > 0 ? (
                member.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                    <TableCell>{format(new Date(tx.date), 'dd MMM, yyyy, hh:mm a')}</TableCell>
                    <TableCell className="font-mono text-xs hidden sm:table-cell">{tx.id}</TableCell>
                    <TableCell>
                        <Badge variant={tx.type === 'in' ? 'default' : 'destructive'} className={tx.type === 'in' ? 'bg-green-600' : ''}>
                        {tx.type === 'in' ? 'Cash In' : 'Cash Out'}
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{tx.remarks}</TableCell>
                    <TableCell className={`text-right font-medium ${tx.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'in' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No transactions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
