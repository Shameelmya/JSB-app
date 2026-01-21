// React Hook for using local offline database
import { useEffect, useState, useCallback } from 'react';
import { localDB } from './localDatabase';

export interface UseLocalDBReturn {
  members: any[];
  transactions: any[];
  dashboard: any;
  reports: any;
  settings: any;
  loading: boolean;
  error: Error | null;
  addMember: (data: any) => Promise<void>;
  updateMember: (id: number, data: any) => Promise<void>;
  deleteMember: (id: number) => Promise<void>;
  addTransaction: (data: any) => Promise<void>;
  updateTransaction: (id: number, data: any) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  updateDashboard: (data: any) => Promise<void>;
  updateReports: (data: any) => Promise<void>;
  updateSettings: (data: any) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLocalDB(): UseLocalDBReturn {
  const [members, setMembers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const membersData = (await localDB.getData('members')) as any[];
      const transactionsData = (await localDB.getData('transactions')) as any[];
      const dashboardData = (await localDB.getData('dashboard')) as any;
      const reportsData = (await localDB.getData('reports')) as any;
      const settingsData = (await localDB.getData('settings')) as any;

      setMembers(Array.isArray(membersData) ? membersData : []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      setDashboard(dashboardData);
      setReports(reportsData);
      setSettings(settingsData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to load local data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localDB.initialize().then(() => loadData());
  }, [loadData]);

  const addMember = useCallback(async (data: any) => {
    await localDB.setData('members', data);
    await loadData();
  }, [loadData]);

  const updateMember = useCallback(async (id: number, data: any) => {
    await localDB.setData('members', data, id);
    await loadData();
  }, [loadData]);

  const deleteMember = useCallback(async (id: number) => {
    await localDB.deleteData('members', id);
    await loadData();
  }, [loadData]);

  const addTransaction = useCallback(async (data: any) => {
    await localDB.setData('transactions', data);
    await loadData();
  }, [loadData]);

  const updateTransaction = useCallback(async (id: number, data: any) => {
    await localDB.setData('transactions', data, id);
    await loadData();
  }, [loadData]);

  const deleteTransaction = useCallback(async (id: number) => {
    await localDB.deleteData('transactions', id);
    await loadData();
  }, [loadData]);

  const updateDashboard = useCallback(async (data: any) => {
    await localDB.setData('dashboard', data, 'main');
    setDashboard(data);
  }, []);

  const updateReports = useCallback(async (data: any) => {
    await localDB.setData('reports', data, 'main');
    setReports(data);
  }, []);

  const updateSettings = useCallback(async (data: any) => {
    await localDB.setData('settings', data, 'main');
    setSettings(data);
  }, []);

  return {
    members,
    transactions,
    dashboard,
    reports,
    settings,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateDashboard,
    updateReports,
    updateSettings,
    refresh: loadData,
  };
}
