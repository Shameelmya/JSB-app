'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AdminUser {
  email: string;
  password?: string; // Password is only needed when adding/updating
}

const ADMIN_STORAGE_KEY = 'mahallu_bank_admins';

// Function to get admins, can be called outside of a component context
export function getAdmins(): AdminUser[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const adminsJson = localStorage.getItem(ADMIN_STORAGE_KEY);
    // Directly parse what's in localStorage, which may include passwords
    return adminsJson ? JSON.parse(adminsJson) : [];
  } catch (error) {
    console.error('Failed to parse admins from localStorage', error);
    return [];
  }
}

function saveAdmins(admins: AdminUser[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  // Store the complete admin object, including password for login check
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admins));
}

// A hook for managing admins in React components
export function useAdmins() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  useEffect(() => {
    setAdmins(getAdmins());
  }, []);

  const addAdmin = useCallback((newAdmin: AdminUser) => {
    if (!newAdmin.email || !newAdmin.password) {
        throw new Error('Email and password are required.');
    }
    setAdmins(prevAdmins => {
      if (prevAdmins.some(admin => admin.email === newAdmin.email) || newAdmin.email === 'hsahilhuda@gmail.com') {
        throw new Error('This email address is already registered as an admin.');
      }
      const updatedAdmins = [...prevAdmins, newAdmin];
      saveAdmins(updatedAdmins);
      return updatedAdmins;
    });
  }, []);

  const deleteAdmin = useCallback((emailToDelete: string) => {
    setAdmins(prevAdmins => {
      const updatedAdmins = prevAdmins.filter(admin => admin.email !== emailToDelete);
      saveAdmins(updatedAdmins);
      return updatedAdmins;
    });
  }, []);

  return { admins, addAdmin, deleteAdmin };
}
