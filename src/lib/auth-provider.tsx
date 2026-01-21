'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getAdmins } from '@/lib/admin-manager';

const ADMIN_EMAIL = 'hsahilhuda@gmail.com';
const ADMIN_PASS = 'Huda313';
const AUTH_KEY = 'mahallu_bank_auth_session';

interface AuthContextType {
  isLoggedIn: boolean;
  userEmail: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    try {
      const session = sessionStorage.getItem(AUTH_KEY);
      if (session) {
        const { email } = JSON.parse(session);
        // We just re-validate that the session email is a valid admin on load
        const admins = getAdmins();
        if (email === ADMIN_EMAIL || admins.some(admin => admin.email === email)) {
            setIsLoggedIn(true);
            setUserEmail(email);
        }
      }
    } catch (error) {
      console.error('Failed to parse auth session', error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = (email: string, pass: string) => {
    const admins = getAdmins();
    const isSuperAdmin = email === ADMIN_EMAIL && pass === ADMIN_PASS;
    const isStandardAdmin = admins.some(admin => admin.email === email && admin.password === pass);

    if (isSuperAdmin || isStandardAdmin) {
      const session = { email: email, loggedInAt: new Date().toISOString() };
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
      setIsLoggedIn(true);
      setUserEmail(email);
      router.push('/dashboard');
    } else {
      throw new Error('Invalid credentials. Please try again.');
    }
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setIsLoggedIn(false);
    setUserEmail(null);
    router.push('/');
  };
  
  if (isLoading && hasMounted) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <p>Loading session...</p>
        </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, userEmail, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
