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
import { Button } from '@/components/ui/button';
import { useData } from '@/lib/data-provider';
import { Calendar as CalendarIcon, FileDown, Printer, MessageSquare } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import React, { useMemo, useState } from 'react';
import { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import type { Member } from '@/types';


export default function ReportsPage() {
    const { allMembers, blocks } = useData();
    const { toast } = useToast();

    const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
    const [selectedBlock, setSelectedBlock] = useState<string | 'all'>('all');
    const [selectedCluster, setSelectedCluster] = useState<string | 'all'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const handleGenerateReport = () => {
        let members = allMembers;

        if (selectedBlock !== 'all') {
            members = members.filter(m => m.block === selectedBlock);
        }
        if (selectedCluster !== 'all') {
            members = members.filter(m => m.cluster === selectedCluster);
        }

        let finalMembers = members;

        if (dateRange?.from) {
             const from = dateRange.from;
            from.setHours(0, 0, 0, 0);
            const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
            to.setHours(23, 59, 59, 999);
            
            finalMembers = members.map(member => ({
                ...member,
                transactions: member.transactions.filter(tx => {
                    const txDate = new Date(tx.date);
                    return txDate >= from && txDate <= to;
                })
            }));
        }
        
        setFilteredMembers(finalMembers);
        toast({ title: 'Report Generated', description: `Displaying report for ${finalMembers.filter(m => m.balance !== 0 || m.transactions.length > 0).length} members.`});
    };
    
    const chartData = useMemo(() => {
        return filteredMembers.slice(0, 10).map(m => {
            const balance = m.transactions.reduce((bal, tx) => bal + (tx.type === 'in' ? tx.amount : -tx.amount), 0);
            return { name: m.name.split(' ')[0], balance };
        });
    }, [filteredMembers]);
    
    const reportData = useMemo(() => {
        return filteredMembers.map(member => {
            const totalIn = member.transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
            const totalOut = member.transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
            const balance = totalIn - totalOut;
            return { ...member, totalIn, totalOut, balance };
        }).filter(m => m.balance !== 0 || m.transactions.length > 0);
    }, [filteredMembers]);

    const handleDownloadExcel = () => {
        if (reportData.length === 0) {
            toast({ variant: 'destructive', title: "No Data", description: "Generate a report before exporting." });
            return;
        }

        const headers = ['Account No.', 'Name', 'Total In', 'Total Out', 'Balance'];
        const csvContent = [
            headers.join(','),
            ...reportData.map(item => [item.accountNumber, item.name, item.totalIn, item.totalOut, item.balance].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "report.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({title: "Export Successful", description: "Report has been downloaded as a CSV file."});
    };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports & Analysis</CardTitle>
          <CardDescription>Generate and view financial reports based on your criteria.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString() || ''}` : 'Date Range (Optional)'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                  </PopoverContent>
                </Popover>
                <Select value={selectedBlock} onValueChange={(val) => { setSelectedBlock(val); setSelectedCluster('all'); }}>
                  <SelectTrigger><SelectValue placeholder="Filter by Block" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blocks</SelectItem>
                     {blocks.map(block => <SelectItem key={block.name} value={block.name}>{block.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                 <Select value={selectedCluster} onValueChange={setSelectedCluster} disabled={selectedBlock === 'all'}>
                  <SelectTrigger><SelectValue placeholder="Filter by Cluster" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clusters</SelectItem>
                    {selectedBlock !== 'all' && blocks.find(b => b.name === selectedBlock)?.clusters.map(cluster => (
                        <SelectItem key={cluster.name} value={cluster.name}>Cluster {cluster.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleGenerateReport}>Generate Report</Button>
            </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className='flex-row items-start sm:items-center justify-between'>
            <div className='space-y-1.5'>
              <CardTitle>Generated Report</CardTitle>
              <CardDescription>Summary of member balances based on filters.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" /> Print PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                  <FileDown className="h-4 w-4 mr-2" /> Download Excel
                </Button>
            </div>
          </CardHeader>
          <CardContent>
             {reportData.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">No member data to display. Generate a report to see data.</div>
            ) : (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Account No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Total In</TableHead>
                    <TableHead>Total Out</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.map((member) => (
                    <TableRow key={member.id}>
                        <TableCell>{member.accountNumber}</TableCell>
                        <TableCell>{member.name}</TableCell>
                        <TableCell className="text-green-600">₹{member.totalIn.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-red-600">₹{member.totalOut.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right font-bold">₹{member.balance.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Balance Distribution</CardTitle>
            <CardDescription>Visual representation of top 10 member balances in the report.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
                <div className="text-center text-muted-foreground h-[350px] flex items-center justify-center">No data to display in chart.</div>
            ) : (
                <ChartContainer config={{}} className='h-[350px] w-full'>
                <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickFormatter={(value) => `₹${value / 1000}k`} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="balance" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
                </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
