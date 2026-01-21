'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Home,
  Menu,
  Search,
  Settings,
  Users,
  UserCircle,
  Mail,
  ArrowRightLeft,
  BarChart,
  LogOut
} from 'lucide-react';
import { BankIcon, WhatsAppIcon } from '@/components/icons';
import { useData, DataProvider } from '@/lib/data-provider';
import React, { useEffect, useState, useRef } from 'react';
import { CommandMenu } from '@/components/command-menu';
import { AddMemberSheet } from './members/page';
import { useCommandMenu, CommandMenuProvider } from '@/hooks/use-command-menu';
import { useAuth } from '@/lib/auth-provider';


function useIdleTimer(timeout: number, onIdle: () => void) {
    const timeoutId = useRef<NodeJS.Timeout>();

    const resetTimer = () => {
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }
        timeoutId.current = setTimeout(onIdle, timeout);
    };

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
        
        const handleActivity = () => resetTimer();
        
        events.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer();

        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
            }
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [onIdle]);

    return null;
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { appSettings } = useData();
  const { logout, isLoggedIn, userEmail, isLoading } = useAuth();
  const router = useRouter();
  
  const { addMemberOpen, setAddMemberOpen, addBlockOpen, setAddBlockOpen } = useCommandMenu();
  const [, forceRender] = useState({});

  useIdleTimer(5 * 60 * 1000, () => {
    logout();
  });
  
   useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        setAddMemberOpen(true);
      }
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        setAddBlockOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [setAddMemberOpen, setAddBlockOpen]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
        router.replace('/');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !isLoggedIn) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-background">
              <p>Loading...</p>
          </div>
      )
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dashboard/members', label: 'Members', icon: Users },
    { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowRightLeft },
    { href: '/dashboard/reports', label: 'Reports', icon: BarChart },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];
  
  const supportEmail = 'dotprojectsofficial@gmail.com';
  const supportWhatsApp = '917559865389';
  const emailSubject = `Enquiry from ${appSettings.bankName} Admin`;
  const whatsappBody = `Sir,\n\nI am an admin of ${appSettings.bankName}. I have an enquiry regarding the Mahallu Bank application.\n\n[Please type your query here]`;


  const desktopNav = (
    <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold md:text-base text-white">
        {appSettings.logoUrl ? (
            <Image src={appSettings.logoUrl} alt="Bank Logo" width={32} height={32} className="h-8 w-8" />
        ) : (
            <BankIcon className="h-6 w-6 text-white" />
        )}
        <span className="sr-only">Mahallu Bank</span>
      </Link>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`group relative transition-colors hover:text-white ${
            pathname === item.href ? 'text-white font-semibold' : 'text-slate-300'
          }`}
        >
          {item.label}
           <span className={`absolute -bottom-2 left-0 h-0.5 bg-white transition-all duration-300 ${pathname === item.href ? 'w-full' : 'w-0 group-hover:w-full'}`} />
        </Link>
      ))}
    </nav>
  );

  const mobileNav = (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden bg-transparent border-slate-300 text-white hover:bg-slate-700 hover:text-white">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <nav className="grid gap-6 text-lg font-medium">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
             {appSettings.logoUrl ? (
                <Image src={appSettings.logoUrl} alt="Bank Logo" width={32} height={32} className="h-8 w-8" />
            ) : (
                <BankIcon className="h-6 w-6 text-primary" />
            )}
            <span className="">{appSettings.bankName}</span>
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 transition-colors hover:text-foreground ${
                pathname === item.href ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <AddMemberSheet onDone={() => forceRender({})} onOpenChange={setAddMemberOpen} open={addMemberOpen} />
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b border-slate-700 bg-slate-800 px-4 md:px-6 z-10">
        {desktopNav}
        {mobileNav}
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
           <div className="relative ml-auto flex-1 md:grow-0">
             <CommandMenu />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <UserCircle className="h-6 w-6" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{userEmail}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>Profile</DropdownMenuItem>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Support</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                    <a href={`https://wa.me/${supportWhatsApp}?text=${encodeURIComponent(whatsappBody)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                     <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(emailSubject)}`} className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email
                    </a>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
               <DropdownMenuSeparator />
               <DropdownMenuLabel className="text-xs text-center font-normal text-muted-foreground">
                developed by dotprojects ©
               </DropdownMenuLabel>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider>
        <CommandMenuProvider>
          <DashboardLayoutContent>
            {children}
          </DashboardLayoutContent>
        </CommandMenuProvider>
    </DataProvider>
  );
}
