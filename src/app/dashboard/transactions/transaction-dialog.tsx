'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useData } from '@/lib/data-provider';
import type { Member, Transaction } from '@/types';
import { MinusCircle, PlusCircle } from 'lucide-react';
import React, { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const formatWhatsAppNumber = (phone: string): string => {
    if (!phone) return '';
    let cleanNum = phone.replace(/\D/g, '');
    if (cleanNum.length > 10 && cleanNum.startsWith('91')) {
        return cleanNum;
    }
    if (cleanNum.length === 10) {
        return `91${cleanNum}`;
    }
    return cleanNum;
}

export function TransactionDialog({ member, type, onTransactionComplete, trigger, open: externalOpen, onOpenChange: externalOnOpenChange }: { member: Member, type: 'in' | 'out', onTransactionComplete: () => void, trigger?: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const { addTransaction } = useData();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [isConfirmingOverdraft, setIsConfirmingOverdraft] = useState(false);
  const [transactionData, setTransactionData] = useState<Omit<Transaction, 'id' | 'memberId' | 'createdAt'> | null>(null);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const resetForm = () => {
    setAmount('');
    setRemarks('');
    setSendWhatsApp(true);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      resetForm();
    }
    setOpen(isOpen);
  };

  const proceedWithTransaction = async (data: Omit<Transaction, 'id'| 'memberId' | 'createdAt'>, shouldSendWhatsApp: boolean) => {
     try {
        const { transactionId, newBalance } = await addTransaction(member.id, data);
        toast({
            title: 'Transaction Saved',
            description: `₹${data.amount} recorded for ${member.name}.`,
        });

        if (shouldSendWhatsApp) {
            const whatsAppNumber = formatWhatsAppNumber(member.whatsapp || member.phone);
            if (whatsAppNumber) {
                const txDate = new Date(data.date);
                const txType = data.type === 'in' ? 'credited to' : 'debited from';

                const message = `Transaction Alert from JSB (Jeeran Savings Bank): A/C No: ${member.accountNumber}, Ref: ${transactionId.substring(0,8)}. A transaction of INR ${data.amount.toLocaleString('en-IN')} has been ${txType} on ${format(txDate, 'dd/MM/yy')} at ${format(txDate, 'hh:mm a')}. The available balance is INR ${newBalance.toLocaleString('en-IN')}.`;

                const url = `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'WhatsApp Failed',
                    description: `Could not send message. Member ${member.name} has no valid WhatsApp number.`,
                });
            }
        }

        handleOpenChange(false);
        setIsConfirmingOverdraft(false);
        setTransactionData(null);
        onTransactionComplete();

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error Saving Transaction", description: error.message });
    }
  };
  
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amountValue = parseFloat(amount);
    
    const dateInput = formData.get('date') as string;
    const timeInput = formData.get('time') as string;
    const sendWhatsAppChecked = formData.get('sendWhatsApp') === 'on';
    setSendWhatsApp(sendWhatsAppChecked);
    
    const date = dateInput ? new Date(dateInput) : new Date();
    if (timeInput) {
        const [hours, minutes] = timeInput.split(':').map(Number);
        date.setHours(hours, minutes);
    } else {
        const now = new Date();
        date.setHours(now.getHours(), now.getMinutes());
    }

    if (isNaN(amountValue) || amountValue <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid positive number for the amount.' });
      return;
    }

    let finalRemarks = remarks;
    if (!sendWhatsAppChecked) {
        finalRemarks = remarks ? `${remarks} (WhatsApp message not sent)` : '(WhatsApp message not sent)';
    }

    const newTransactionData: Omit<Transaction, 'id' | 'memberId' | 'createdAt'> = {
      type,
      amount: amountValue,
      remarks: finalRemarks,
      date: date.toISOString(),
    };
    
    if (type === 'out' && amountValue > member.balance) {
        setTransactionData(newTransactionData);
        setIsConfirmingOverdraft(true);
    } else {
        await proceedWithTransaction(newTransactionData, sendWhatsAppChecked);
    }
  };
  
  const handleProceedAnyway = async () => {
    if (transactionData) {
        const finalRemarks = transactionData.remarks ? `${transactionData.remarks}; Gets minus balance.` : 'Gets minus balance.';
        const dataWithRemark = { ...transactionData, remarks: finalRemarks };
        await proceedWithTransaction(dataWithRemark, sendWhatsApp);
    }
  };

  const defaultTrigger = (
    <Button size="sm" variant={type === 'in' ? 'outline' : 'destructive'} className="h-8 gap-1">
      {type === 'in' ? (
        <PlusCircle className="h-3.5 w-3.5" />
      ) : (
        <MinusCircle className="h-3.5 w-3.5" />
      )}
      <span>{type === 'in' ? 'Cash In' : 'Cash Out'}</span>
    </Button>
  );
  
  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0];
  const defaultTime = now.toTimeString().slice(0,5);

  return (
    <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : <DialogTrigger asChild>{defaultTrigger}</DialogTrigger> }
        <DialogContent className="sm:max-w-[425px]">
            <form ref={formRef} onSubmit={handleSubmit}>
            <DialogHeader>
                <DialogTitle>{type === 'in' ? 'Record Cash In' : 'Record Cash Out'} for {member.name}</DialogTitle>
                <DialogDescription>
                Enter the amount and remarks for this transaction. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                    Amount
                </Label>
                <Input id="amount" name="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" placeholder="₹0.00" required/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="remarks" className="text-right">
                    Remarks
                </Label>
                <Input id="remarks" name="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="col-span-3" placeholder="Optional" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date" className="text-right">
                    Date
                </Label>
                <Input id="date" name="date" type="date" className="col-span-3" defaultValue={defaultDate}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="time" className="text-right">
                    Time
                </Label>
                <Input id="time" name="time" type="time" className="col-span-3" defaultValue={defaultTime}/>
                </div>
            </div>
            <DialogFooter>
                <div className="flex items-center space-x-2 mr-auto">
                    <Checkbox id="sendWhatsApp" name="sendWhatsApp" checked={sendWhatsApp} onCheckedChange={(checked) => setSendWhatsApp(checked as boolean)} />
                    <Label htmlFor="sendWhatsApp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Send WhatsApp Message
                    </Label>
                </div>
                <Button type="submit">Save Transaction</Button>
            </DialogFooter>
            </form>
        </DialogContent>
        </Dialog>
        <AlertDialog open={isConfirmingOverdraft} onOpenChange={setIsConfirmingOverdraft}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Insufficient Balance</AlertDialogTitle>
                    <AlertDialogDescription>
                        The cash out amount of ₹{transactionData?.amount.toLocaleString('en-IN')} is greater than the member's available balance of ₹{member.balance.toLocaleString('en-IN')}. This will result in a negative balance.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleProceedAnyway}>Proceed Anyway</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
