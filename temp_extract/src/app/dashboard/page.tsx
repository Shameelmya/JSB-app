'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LineChart, Line, Tooltip } from 'recharts';
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Banknote,
  Building,
  Library,
  MinusCircle,
  PlusCircle,
  Search,
  Users,
  Calendar as CalendarIcon,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon
} from 'lucide-react';
import { useData } from '@/lib/data-provider';
import Link from 'next/link';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { format, subDays, subMonths, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TransactionDialog } from './transactions/transaction-dialog';
import { AddMemberSheet } from './members/page';
import type { Member, Block, Cluster } from '@/types';
import { Label } from '@/components/ui/label';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { useCommandMenu } from '@/hooks/use-command-menu';

const chartConfig = {
  cashIn: { label: 'Cash In', color: 'hsl(var(--chart-1))' },
  cashOut: { label: 'Cash Out', color: 'hsl(var(--chart-2))' },
};


function AccountQuickView({ member, onTransaction, onClear }: { member: Member, onTransaction: () => void, onClear: () => void }) {
  const balance = member.transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0) - member.transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Account Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>
        </div>
        <CardDescription>{member.accountNumber}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="font-bold text-lg">{member.name}</p>
          <p className="text-muted-foreground">{member.address}</p>
          <div className="flex items-center gap-1"><Badge variant="secondary">{member.block}</Badge> / <Badge variant="outline">{member.cluster}</Badge></div>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-muted-foreground">Current Balance</span>
          <span className="text-2xl font-bold text-primary">₹{balance.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex gap-2">
          <TransactionDialog member={member} type="in" onTransactionComplete={onTransaction} trigger={
            <Button size="sm" className="w-full gap-1">
              <PlusCircle className="h-3.5 w-3.5" />
              Fast Cash In
            </Button>
          } />
          <TransactionDialog member={member} type="out" onTransactionComplete={onTransaction} trigger={
            <Button size="sm" variant="destructive" className="w-full gap-1">
              <MinusCircle className="h-3.5 w-3.5" />
              Fast Cash Out
            </Button>
          } />
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionsCard() {
  const { allMembers, getMemberById } = useData();
  const [searchAccountNumber, setSearchAccountNumber] = useState('');
  const [searchedMember, setSearchedMember] = useState<Member | null>(null);
  const [, forceRender] = useState({});

  const handleSearch = () => {
    const member = allMembers.find(m => m.accountNumber === searchAccountNumber);
    setSearchedMember(member || null);
  };
  
  const handleClear = () => {
    setSearchedMember(null);
    setSearchAccountNumber('');
  }

  if (searchedMember) {
    return <AccountQuickView member={searchedMember} onTransaction={() => {
        // Re-fetch member to update balance
        const updatedMember = getMemberById(searchedMember.id);
        if(updatedMember) setSearchedMember(updatedMember);
        forceRender({});
    }} onClear={handleClear} />;
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
         <div className="space-y-1">
            <Label htmlFor="quick-search" className="text-sm font-normal text-muted-foreground">Find Member by A/C No.</Label>
            <div className="flex gap-2">
                <Input 
                    id="quick-search"
                    placeholder="Enter Account Number" 
                    value={searchAccountNumber}
                    onChange={(e) => setSearchAccountNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}><Search className="h-4 w-4" /></Button>
            </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 pt-2">
          <Button asChild className="w-full justify-between">
             <Link href="/dashboard/members">
              Add New Member
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="w-full justify-between">
            <Link href="/dashboard/transactions">
              Go to Transactions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardFilters({ onFilterChange, onReset }: { onFilterChange: (filters: any) => void, onReset: () => void }) {
    const { blocks } = useData();
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
    const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [customRangeView, setCustomRangeView] = useState(false);
    
    useEffect(() => {
        onFilterChange({ block: selectedBlock, cluster: selectedCluster, dateRange });
    }, [selectedBlock, selectedCluster, dateRange, onFilterChange]);


    const handleReset = () => {
        setSelectedBlock(null);
        setSelectedCluster(null);
        setDateRange(undefined);
        onReset();
    };

    const setDatePreset = (preset: 'today' | 'last7' | 'last30' | 'lastWeek' | 'lastMonth' | 'last6Months' | 'lastYear') => {
        const now = new Date();
        let newRange: DateRange | undefined;
        switch(preset) {
            case 'today':
                newRange = { from: now, to: now };
                break;
            case 'last7':
                newRange = { from: subDays(now, 6), to: now };
                break;
            case 'last30':
                newRange = { from: subDays(now, 29), to: now };
                break;
            case 'lastWeek':
                newRange = { from: startOfWeek(subDays(now, 7)), to: endOfWeek(subDays(now, 7))};
                break;
            case 'lastMonth':
                newRange = { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1))};
                break;
            case 'last6Months':
                newRange = { from: subMonths(now, 6), to: now };
                break;
            case 'lastYear':
                newRange = { from: subYears(now, 1), to: now };
                break;
        }
        setDateRange(newRange);
        setPopoverOpen(false);
    };

    const handleOpenChange = (open: boolean) => {
        setPopoverOpen(open);
        if (!open) {
            setCustomRangeView(false);
        }
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Dashboard Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select onValueChange={(val) => { setSelectedBlock(val === 'all' ? null : val); setSelectedCluster(null); }} value={selectedBlock || 'all'}>
                        <SelectTrigger><SelectValue placeholder="Filter by Block" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Blocks</SelectItem>
                            {blocks.map(block => <SelectItem key={block.name} value={block.name}>{block.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select onValueChange={(val) => setSelectedCluster(val === 'all' ? null : val)} value={selectedCluster || 'all'} disabled={!selectedBlock}>
                        <SelectTrigger><SelectValue placeholder="Filter by Cluster" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Clusters</SelectItem>
                            {selectedBlock && blocks.find(b => b.name === selectedBlock)?.clusters.map(cluster => (
                                <SelectItem key={cluster.name} value={cluster.name}>Cluster {cluster.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-2">
                    <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
                      <PopoverTrigger asChild>
                        <Button
                          id="date"
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                              </>
                            ) : (
                              format(dateRange.from, "LLL dd, y")
                            )
                          ) : (
                            <span>Date Range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        {customRangeView ? (
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={dateRange?.from}
                              selected={dateRange}
                              onSelect={(range) => {
                                  setDateRange(range);
                                  if (range?.from && range?.to) {
                                      setPopoverOpen(false);
                                  }
                              }}
                              numberOfMonths={2}
                            />
                        ) : (
                            <div className="flex flex-col p-2 space-y-1">
                                <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('today')}>Today</Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('last7')}>Last 7 Days</Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('last30')}>Last 30 Days</Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('lastWeek')}>Last Week</Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('lastMonth')}>Last Month</Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('last6Months')}>Last 6 Months</Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setDatePreset('lastYear')}>Last Year</Button>
                                <Button variant="ghost" className="justify-start" onClick={() => setCustomRangeView(true)}>Custom Range</Button>
                            </div>
                        )}
                      </PopoverContent>
                    </Popover>
                    <Button onClick={handleReset} variant="primary" className="w-auto">Reset</Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const { allMembers } = useData();
    const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [activeFilters, setActiveFilters] = useState({ block: null, cluster: null, dateRange: undefined });
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

    useEffect(() => {
        setIsClient(true);
        setFilteredMembers(allMembers);
    }, [allMembers]);


    const handleFilterChange = useCallback((filters: { block: string | null, cluster: string | null, dateRange: DateRange | undefined }) => {
        setActiveFilters(filters as any);
        let members = allMembers;

        if (filters.block) {
            members = members.filter(m => m.block === filters.block);
        }
        if (filters.cluster) {
            members = members.filter(m => m.cluster === filters.cluster);
        }
        
        let finalMembers = members;
        if (filters.dateRange?.from) {
            const from = filters.dateRange.from;
            // Set time to the start of the day
            from.setHours(0, 0, 0, 0);

            const to = filters.dateRange.to ? new Date(filters.dateRange.to) : new Date(from);
             // Set time to the end of the day
            to.setHours(23, 59, 59, 999);
            
            // We filter transactions inside the members, not the members themselves
            finalMembers = members.map(member => {
                const filteredTransactions = member.transactions.filter(tx => {
                    const txDate = new Date(tx.date);
                    return txDate >= from && txDate <= to;
                });
                // Return a new member object with filtered transactions for chart calculation
                // but for stat cards, we need the original member object
                 return { ...member, transactions: filteredTransactions };
            });
        }
        setFilteredMembers(finalMembers);
    }, [allMembers]);
    
    const handleReset = () => {
        setFilteredMembers(allMembers);
        setActiveFilters({ block: null, cluster: null, dateRange: undefined });
    };

    const displayMembers = filteredMembers;

    const totalBalance = useMemo(() => {
        const membersToCalculate = activeFilters.block || activeFilters.cluster ? displayMembers : allMembers;
        return membersToCalculate.reduce((acc, member) => {
            return acc + member.balance;
        }, 0);
    }, [displayMembers, allMembers, activeFilters.block, activeFilters.cluster]);


    const totalIn = useMemo(() => {
        return displayMembers.flatMap(m => m.transactions).filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
    }, [displayMembers]);
    
    const totalOut = useMemo(() => {
        return displayMembers.flatMap(m => m.transactions).filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
    }, [displayMembers]);
    
    const { totalMembers, totalBlocks, totalClusters } = useMemo(() => {
        const membersToCount = activeFilters.block || activeFilters.cluster ? displayMembers.filter(m => m.transactions.length > 0 || allMembers.find(am => am.id === m.id)) : allMembers;
        const memberIds = new Set(membersToCount.map(m => m.id));

        return {
            totalMembers: memberIds.size,
            totalBlocks: new Set(allMembers.map(m => m.block)).size,
            totalClusters: new Set(allMembers.map(m => `${m.block}-${m.cluster}`)).size
        };
    }, [displayMembers, allMembers, activeFilters.block, activeFilters.cluster]);


    const chartData = useMemo(() => {
        const allTransactions = displayMembers.flatMap(m => m.transactions);
        
        let rangeStart: Date;
        if (activeFilters.dateRange?.from) {
            rangeStart = activeFilters.dateRange.from;
        } else {
            // Default to 6 months ago if no date range is set
            rangeStart = subMonths(new Date(), 5);
            rangeStart = startOfMonth(rangeStart);
        }

        const dataMap: { [key: string]: { month: string; cashIn: number; cashOut: number } } = {};
        
        const monthLabels = Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(new Date(), i);
            return format(d, 'MMM');
        }).reverse();

        monthLabels.forEach(month => {
            dataMap[month] = { month, cashIn: 0, cashOut: 0 };
        });

        allTransactions.forEach(tx => {
            const txDate = new Date(tx.date);
            if (txDate >= rangeStart) {
                const month = format(txDate, 'MMM');
                if (!dataMap[month]) {
                    // This case handles dates outside the default 6-month window when a custom range is used
                     dataMap[month] = { month, cashIn: 0, cashOut: 0 };
                }
                if (tx.type === 'in') {
                    dataMap[month].cashIn += tx.amount;
                } else {
                    dataMap[month].cashOut += tx.amount;
                }
            }
        });

        return Object.values(dataMap).sort((a,b) => {
            // A more robust sort for months over year boundaries
            const aDate = new Date(`01 ${a.month} 2000`);
            const bDate = new Date(`01 ${b.month} 2000`);
            if (monthLabels.indexOf(a.month) > monthLabels.indexOf(b.month)) {
                return 1;
            }
            if (monthLabels.indexOf(a.month) < monthLabels.indexOf(b.month)) {
                return -1;
            }
            return 0;

        });
    }, [displayMembers, activeFilters.dateRange]);

  if (!isClient) {
      return null;
  }
  
  const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
  const ChartElement = chartType === 'bar' ? Bar : Line;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <Card className="bg-blue-500 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bank Balance</CardTitle>
            <Banknote className="h-6 w-6 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-4xl font-bold">₹{totalBalance.toLocaleString('en-IN')}</div>
            <p className="text-xs text-blue-100">+0.0% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
            <ArrowUpCircle className="h-6 w-6 text-green-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-4xl font-bold">₹{totalIn.toLocaleString('en-IN')}</div>
             <p className="text-xs text-green-100">
                {activeFilters.dateRange ? "in selected period" : "+0.0% from last month"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-500 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
            <ArrowDownCircle className="h-6 w-6 text-red-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-4xl font-bold">₹{totalOut.toLocaleString('en-IN')}</div>
             <p className="text-xs text-red-100">
                {activeFilters.dateRange ? "in selected period" : "+0.0% from last month"}
            </p>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-3 gap-4 lg:gap-6">
            <Card>
                <Link href="/dashboard/members" className="block h-full transition-colors hover:bg-muted/50">
                    <div className="flex flex-col h-full p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardContent className="p-0 flex-1 flex items-end">
                            <div className="text-2xl font-bold">{totalMembers}</div>
                        </CardContent>
                    </div>
                </Link>
            </Card>
            <Card>
                <Link href="/dashboard/members?tab=blocks" className="block h-full transition-colors hover:bg-muted/50">
                     <div className="flex flex-col h-full p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
                            <Building className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardContent className="p-0 flex-1 flex items-end">
                            <div className="text-2xl font-bold">{totalBlocks}</div>
                        </CardContent>
                    </div>
                </Link>
            </Card>
            <Card>
                 <Link href="/dashboard/members?tab=blocks&expand=active" className="block h-full transition-colors hover:bg-muted/50">
                     <div className="flex flex-col h-full p-6">
                        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Clusters</CardTitle>
                            <Library className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardContent className="p-0 flex-1 flex items-end">
                            <div className="text-2xl font-bold">{totalClusters}</div>
                        </CardContent>
                    </div>
                </Link>
            </Card>
       </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="flex flex-col gap-6 lg:hidden">
                <DashboardFilters onFilterChange={handleFilterChange} onReset={handleReset}/>
                <QuickActionsCard />
            </div>
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Cash In vs Cash Out Overview</CardTitle>
                        <CardDescription>Monthly financial flow based on selected filters.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button variant={chartType === 'bar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setChartType('bar')}>
                            <BarChartIcon className="h-4 w-4" />
                        </Button>
                        <Button variant={chartType === 'line' ? 'secondary' : 'ghost'} size="icon" onClick={() => setChartType('line')}>
                            <LineChartIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pl-2">
                    {chartData.length === 0 || chartData.every(d => d.cashIn === 0 && d.cashOut === 0) ? (
                        <div className="text-center text-muted-foreground h-[278px] flex items-center justify-center">No transaction data to display for the selected period.</div>
                    ) : (
                        <ChartContainer config={chartConfig} className="h-[278px] w-full">
                        <ChartComponent data={chartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <YAxis
                                tickFormatter={(value) => `₹${Number(value) / 1000}k`}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <ChartElement dataKey="cashIn" fill="var(--color-cashIn)" radius={chartType === 'bar' ? 4 : undefined} />
                            <ChartElement dataKey="cashOut" fill="var(--color-cashOut)" radius={chartType === 'bar' ? 4 : undefined} />
                        </ChartComponent>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2 hidden lg:flex flex-col gap-6">
           <DashboardFilters onFilterChange={handleFilterChange} onReset={handleReset}/>
           <QuickActionsCard />
        </div>
      </div>
    </>
  );
}
