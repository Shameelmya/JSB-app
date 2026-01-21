'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/lib/data-provider';
import {
  Home,
  Users,
  ArrowRightLeft,
  BarChart,
  Settings,
  User,
  PlusCircle,
  Upload,
  FileText,
  MessageSquare,
  ShieldAlert,
  Building
} from 'lucide-react';
import { AddMemberSheet } from '@/app/dashboard/members/page';
import { BulkTransactionUploadSheet } from '@/app/dashboard/transactions/page';

interface Command {
  id: string;
  label: string;
  icon: React.ElementType;
  action: 'navigate' | 'function';
  path?: string;
  perform: () => void;
}

interface CommandGroup {
  id: string;
  label: string;
  commands: Command[];
}

interface CommandMenuContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  addMemberOpen: boolean;
  setAddMemberOpen: React.Dispatch<React.SetStateAction<boolean>>;
  addBlockOpen: boolean;
  setAddBlockOpen: React.Dispatch<React.SetStateAction<boolean>>;
  commands: CommandGroup[];
  setSheetContent: (node: ReactNode) => void;
}

const CommandMenuContext = createContext<CommandMenuContextType | undefined>(undefined);

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);

  const { allMembers, appSettings } = useData();
  const router = useRouter();
  const [sheetContent, setSheetContent] = useState<ReactNode>(null);

  const performNavigation = useCallback((path: string) => {
    router.push(path);
    setIsOpen(false);
  }, [router]);

  const commands = useMemo<CommandGroup[]>(() => {
    const navigationCommands: Command[] = [
      { id: 'nav-dashboard', label: 'Dashboard', icon: Home, action: 'navigate', perform: () => performNavigation('/dashboard') },
      { id: 'nav-members', label: 'Members', icon: Users, action: 'navigate', perform: () => performNavigation('/dashboard/members') },
      { id: 'nav-transactions', label: 'Transactions', icon: ArrowRightLeft, action: 'navigate', perform: () => performNavigation('/dashboard/transactions') },
       { id: 'nav-all-transactions', label: 'All Transactions', icon: ArrowRightLeft, action: 'navigate', perform: () => performNavigation('/dashboard/transactions/all') },
      { id: 'nav-reports', label: 'Reports', icon: BarChart, action: 'navigate', perform: () => performNavigation('/dashboard/reports') },
      { id: 'nav-settings', label: 'Settings', icon: Settings, action: 'navigate', perform: () => performNavigation('/dashboard/settings') },
    ];

    const memberCommands: Command[] = allMembers.map(member => ({
      id: `member-${member.id}`,
      label: `${member.name} (${member.accountNumber})`,
      icon: User,
      action: 'navigate',
      perform: () => performNavigation(`/dashboard/members/${member.id}`),
    }));

    const actionCommands: Command[] = [
      { id: 'action-add-member', label: 'Add New Member (Ctrl+M)', icon: PlusCircle, action: 'function', perform: () => setAddMemberOpen(true) },
      { id: 'action-add-block', label: 'Add New Block (Ctrl+B)', icon: Building, action: 'function', perform: () => setAddBlockOpen(true) },
      { id: 'action-bulk-members', label: 'Bulk Upload Members', icon: Upload, action: 'navigate', perform: () => performNavigation('/dashboard/members') },
      { id: 'action-bulk-transactions', label: 'Bulk Upload Transactions', icon: Upload, action: 'navigate', perform: () => performNavigation('/dashboard/transactions') },
    ];
    
    const settingsCommands: Command[] = [
       { id: 'setting-sms', label: 'SMS Settings & Templates', icon: MessageSquare, action: 'navigate', perform: () => performNavigation('/dashboard/settings?tab=sms') },
       { id: 'setting-data', label: 'Data Backup & Restore', icon: FileText, action: 'navigate', perform: () => performNavigation('/dashboard/settings?tab=data') },
       { id: 'setting-danger', label: 'Danger Zone', icon: ShieldAlert, action: 'navigate', perform: () => performNavigation('/dashboard/settings?tab=danger') },
    ];

    return [
      { id: 'navigation', label: 'Navigation', commands: navigationCommands },
      { id: 'actions', label: 'Actions', commands: actionCommands },
      { id: 'members', label: 'Members', commands: memberCommands },
      { id: 'settings', label: 'Settings', commands: settingsCommands }
    ].filter(group => group.commands.length > 0);
  }, [allMembers, performNavigation, setAddMemberOpen, setAddBlockOpen]);

  return (
    <CommandMenuContext.Provider value={{ isOpen, setIsOpen, addMemberOpen, setAddMemberOpen, addBlockOpen, setAddBlockOpen, commands, setSheetContent }}>
      {children}
      {sheetContent}
    </CommandMenuContext.Provider>
  );
}

export function useCommandMenu() {
  const context = useContext(CommandMenuContext);
  if (!context) {
    throw new Error('useCommandMenu must be used within a CommandMenuProvider');
  }
  return context;
}
