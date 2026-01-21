'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Member, Block, Cluster, Transaction, AppSettings, AdminTransaction, BankTransaction } from '@/types';
import { offlineDB } from './offlineDataManager';
import { useAppSettings } from '@/lib/app-settings';


function useCollection<T>(collectionName: string) {
  const [data, setData] = useState<(T & {id: string})[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!collectionName) {
        setData([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    const unsubscribe = offlineDB.onSnapshot<T>(collectionName, async (snapshot) => {
      try {
        const mappedData = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(mappedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [collectionName]);

  return { data, loading, error };
}


interface DataContextType {
  allMembers: Member[];
  blocks: Block[];
  adminTransactions: AdminTransaction[];
  bankTransactions: BankTransaction[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getMemberById: (id: string) => Member | undefined;
  getMemberByAccountNumber: (accountNumber: string) => Member | undefined;
  addMember: (memberData: Omit<Member, 'id' | 'transactions' | 'totalIn' | 'totalOut' | 'balance' | 'blockId' | 'clusterId' | 'hasPaidRegistrationFee'> & {block: string, cluster: string}) => Promise<Member | undefined>;
  updateMember: (id: string, memberData: Partial<Omit<Member, 'id' | 'transactions' | 'totalIn' | 'totalOut' | 'balance'>>) => void;
  deleteMember: (id: string) => Promise<void>;
  addTransaction: (memberId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'memberId'>) => Promise<{ transactionId: string; newBalance: number }>;
  updateTransaction: (memberId: string, transactionId: string, newAmount: number, newDate: string) => void;
  addBlock: (blockName: string) => Promise<Block | undefined>;
  addCluster: (blockName: string, clusterName: string) => void;
  deleteBlock: (blockName: string) => Promise<void>;
  deleteCluster: (blockName: string, clusterName: string) => Promise<void>;
  chargeRegistrationFee: (memberId: string) => void;
  chargePassbookFee: (memberId: string) => void;
  deleteAdminTransaction: (transactionId: string) => void;
  addBankTransaction: (transaction: Omit<BankTransaction, 'id'>) => void;
  updateBankTransaction: (transactionId: string, transaction: Omit<BankTransaction, 'id'>) => void;
  deleteBankTransaction: (transactionId: string) => void;
  resetAllData: () => Promise<void>;
  bulkAddMembers: (csvData: string, overwrite: boolean) => Promise<{ success: number; failed: number, duplicates: number, membersToOverwrite: Member[] }>;
  bulkAddTransactions: (csvData: string, overwrite: boolean) => Promise<{ success: number; failed: number; duplicates: number }>;
  appSettings: AppSettings;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [searchQuery, setSearchQuery] = useState('');
    const { appSettings, updateAppSettings } = useAppSettings();
    
    const { data: blocksData, isLoading: blocksLoading } = useCollection<Omit<Block, 'clusters'>>('blocks');
    const { data: clustersData, isLoading: clustersLoading } = useCollection<Omit<Cluster, 'members'>>('clusters');
    const { data: membersData, isLoading: membersLoading } = useCollection<Omit<Member, 'transactions'>>('members');
    const { data: transactionsData, isLoading: transactionsLoading } = useCollection<Transaction>('transactions');
    const { data: adminTransactionsData, isLoading: adminTransactionsLoading } = useCollection<AdminTransaction>('adminTransactions');
    const { data: bankTransactionsData, isLoading: bankTransactionsLoading } = useCollection<BankTransaction>('bankTransactions');

  const allMembers = useMemo(() => {
    if (!membersData || !transactionsData) return [];
    
    return membersData.map(member => {
      const memberTransactions = transactionsData
        .filter(t => t.memberId === member.id)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
      const totalIn = memberTransactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
      const totalOut = memberTransactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIn - totalOut;

      return {
        ...member,
        transactions: memberTransactions,
        totalIn,
        totalOut,
        balance,
      };
    });
  }, [membersData, transactionsData]);

  const adminTransactions = useMemo(() => adminTransactionsData || [], [adminTransactionsData]);
  const bankTransactions = useMemo(() => bankTransactionsData || [], [bankTransactionsData]);
  
  const blocks = useMemo(() => {
      if (!blocksData || !clustersData) return [];
      
      return blocksData.map(block => ({
          ...block,
          clusters: clustersData
            .filter(cluster => cluster.blockId === block.id)
            .map(cluster => ({
                ...cluster,
                members: allMembers.filter(member => member.clusterId === cluster.id)
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
      }));

  }, [blocksData, clustersData, allMembers]);

  const getMemberById = useCallback((id: string): Member | undefined => {
    return allMembers.find(m => m.id === id);
  }, [allMembers]);
  
  const getMemberByAccountNumber = useCallback((accountNumber: string): Member | undefined => {
      return allMembers.find(m => m.accountNumber === accountNumber);
  }, [allMembers]);

    const normalizePhoneNumber = (phone: string): string => {
        if (!phone) return '';
        let cleanNum = phone.replace(/\D/g, '');
        if (cleanNum.length === 10) {
            return `91${cleanNum}`;
        }
        if (phone.startsWith('+')) {
            return phone.replace(/\D/g, '');
        }
        return cleanNum;
    }

    const addMember = async (memberData: Omit<Member, 'id' | 'transactions' | 'totalIn' | 'totalOut' | 'balance' | 'blockId' | 'clusterId' | 'hasPaidRegistrationFee'> & {block: string, cluster: string}) => {
        const existingMember = getMemberByAccountNumber(memberData.accountNumber);
        if (memberData.accountNumber && existingMember) {
            return existingMember; 
        }

        const block = blocks.find(b => b.name === memberData.block);
        if (!block) throw new Error("Block not found");

        const cluster = block.clusters.find(c => c.name === memberData.cluster);
        if (!cluster) throw new Error("Cluster not found in the selected block.");

        const newMemberPayload = {
            accountNumber: memberData.accountNumber || `MB${Date.now()}`,
            name: memberData.name,
            houseNumber: memberData.houseNumber,
            husbandName: memberData.husbandName || '',
            address: memberData.address || '',
            phone: normalizePhoneNumber(memberData.phone),
            whatsapp: normalizePhoneNumber(memberData.whatsapp || memberData.phone),
            block: block.name,
            cluster: cluster.name,
            blockId: block.id,
            clusterId: cluster.id,
            hasPaidRegistrationFee: false,
        };
        
        await offlineDB.addDoc('members', newMemberPayload);
        return undefined;
    };

    const updateMember = async (id: string, memberData: Partial<Omit<Member, 'id' | 'transactions' | 'totalIn' | 'totalOut' | 'balance'>>) => {
        const payload: { [key: string]: any } = { ...memberData };

        if ('block' in payload && 'cluster' in payload) {
            const block = blocks.find(b => b.name === payload.block);
            const cluster = block?.clusters.find(c => c.name === payload.cluster);

            if (block && cluster) {
                payload.blockId = block.id;
                payload.clusterId = cluster.id;
            }
        }
        
        await offlineDB.updateDoc('members', id, payload);
    };

    const deleteMember = async (id: string) => {
        const member = allMembers.find(m => m.id === id);
        if (!member) return;
        
        if (member.transactions) {
            for (const tx of member.transactions) {
                await offlineDB.deleteDoc('transactions', tx.id);
            }
        }
        await offlineDB.deleteDoc('members', id);
    };

    const addTransaction = async (memberId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'memberId'>): Promise<{ transactionId: string, newBalance: number }> => {
        const member = allMembers.find(m => m.id === memberId);
        if (!member) throw new Error("Member not found");

        const REGISTRATION_FEE = 50;

        let finalTransactionAmount = transaction.amount;
        let newBalance = member.balance;

        if (transaction.type === 'in' && !member.hasPaidRegistrationFee && transaction.amount >= REGISTRATION_FEE) {
            finalTransactionAmount -= REGISTRATION_FEE;
            
            await offlineDB.addDoc('adminTransactions', {
                memberId: member.id,
                type: 'registration_fee',
                amount: REGISTRATION_FEE,
                date: new Date().toISOString()
            });

            await offlineDB.updateDoc('members', member.id, { hasPaidRegistrationFee: true });

            newBalance -= REGISTRATION_FEE;
        }
        
        if (transaction.type === 'in') {
            newBalance += finalTransactionAmount;
        } else {
            newBalance -= transaction.amount;
        }

        const transactionId = await offlineDB.addDoc('transactions', {
            ...transaction,
            amount: transaction.type === 'in' ? finalTransactionAmount : transaction.amount,
            memberId,
        });

        return { transactionId, newBalance };
    };

    const updateTransaction = async (memberId: string, transactionId: string, newAmount: number, newDate: string) => {
        await offlineDB.updateDoc('transactions', transactionId, { amount: newAmount, date: newDate });
    };

    const addBlock = async (blockName: string) => {
        const existingBlock = blocks.find(b => b.name.trim().toLowerCase() === blockName.trim().toLowerCase());
        if (existingBlock) return existingBlock;

        const newBlockId = await offlineDB.addDoc('blocks', { name: blockName });

        const clusterNames = ['A', 'B', 'C', 'D'];
        const newClusters = [];
        for (const name of clusterNames) {
            const clusterId = await offlineDB.addDoc('clusters', { name, blockId: newBlockId });
            newClusters.push({ name, id: clusterId, blockId: newBlockId, members: [] });
        }
        
        return { id: newBlockId, name: blockName, clusters: newClusters };
    };

    const addCluster = async (blockName: string, clusterName: string) => {
        const block = blocks.find(b => b.name === blockName);
        if (!block) throw new Error(`Block ${blockName} not found.`);
        const blockId = block.id;

        const existingCluster = block.clusters.find(c => c.name.trim().toLowerCase() === clusterName.trim().toLowerCase());
        if (existingCluster) throw new Error(`Cluster ${clusterName} already exists in block ${blockName}.`);

        await offlineDB.addDoc('clusters', { name: clusterName, blockId: blockId });
    };
    
    const deleteBlock = async (blockName: string) => {
        const blockToDelete = blocks.find(b => b.name === blockName);
        if (!blockToDelete) throw new Error("Block not found.");

        const membersInBlock = allMembers.filter(m => m.blockId === blockToDelete.id);
        for(const member of membersInBlock) {
            await deleteMember(member.id);
        }

        for(const cluster of blockToDelete.clusters) {
            await offlineDB.deleteDoc('clusters', cluster.id);
        }

        await offlineDB.deleteDoc('blocks', blockToDelete.id);
    };
    
    const deleteCluster = async (blockName: string, clusterName: string) => {
        const block = blocks.find(b => b.name === blockName);
        if (!block) throw new Error("Block not found.");
        
        const clusterToDelete = block.clusters.find(c => c.name === clusterName);
        if (!clusterToDelete) throw new Error("Cluster not found.");

        const membersInCluster = allMembers.filter(m => m.clusterId === clusterToDelete.id);
        for (const member of membersInCluster) {
            await deleteMember(member.id);
        }
        
        await offlineDB.deleteDoc('clusters', clusterToDelete.id);
    };

    const chargeRegistrationFee = async (memberId: string) => {
        const member = allMembers.find(m => m.id === memberId);
        if (!member) throw new Error("Member not found");
        if (member.hasPaidRegistrationFee) throw new Error("Member has already paid the registration fee.");
        
        const REGISTRATION_FEE = 50;
        if (member.balance < REGISTRATION_FEE) {
            throw new Error(`Insufficient balance. Member needs at least ₹${REGISTRATION_FEE} to pay the fee.`);
        }

        await offlineDB.addDoc('adminTransactions', {
            memberId: member.id,
            type: 'registration_fee',
            amount: REGISTRATION_FEE,
            date: new Date().toISOString()
        });

        await offlineDB.addDoc('transactions', {
            memberId: member.id,
            type: 'out',
            amount: REGISTRATION_FEE,
            date: new Date().toISOString(),
            remarks: 'One-Time Registration Fee'
        });

        await offlineDB.updateDoc('members', member.id, { hasPaidRegistrationFee: true });
    };
    
    const chargePassbookFee = async (memberId: string) => {
        const member = allMembers.find(m => m.id === memberId);
        if (!member) throw new Error("Member not found");

        const PASSBOOK_FEE = 50;

        await offlineDB.addDoc('adminTransactions',{
            memberId: member.id,
            type: 'passbook_fee',
            amount: PASSBOOK_FEE,
            date: new Date().toISOString()
        });
        
        await offlineDB.addDoc('transactions', {
            memberId: member.id,
            type: 'out',
            amount: PASSBOOK_FEE,
            date: new Date().toISOString(),
            remarks: 'Passbook Renew Charge'
        });
    };

    const deleteAdminTransaction = async (transactionId: string) => {
        await offlineDB.deleteDoc('adminTransactions', transactionId);
    };

    const addBankTransaction = async (transaction: Omit<BankTransaction, 'id'>) => {
        await offlineDB.addDoc('bankTransactions', transaction);
    };

    const updateBankTransaction = async (transactionId: string, transaction: Omit<BankTransaction, 'id'>) => {
        await offlineDB.updateDoc('bankTransactions', transactionId, transaction);
    };

    const deleteBankTransaction = async (transactionId: string) => {
        await offlineDB.deleteDoc('bankTransactions', transactionId);
    };

    const resetAllData = async () => {
        const collections = ['blocks', 'clusters', 'members', 'transactions', 'adminTransactions', 'bankTransactions'];
        for (const coll of collections) {
            await offlineDB.clearStore(coll);
        }
    };

    const bulkAddMembers = async (csvData: string, overwrite: boolean = false) => {
        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');

        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const headerMap: { [key: string]: string } = {};
        const headerKeys = ['name', 'houseNumber', 'phone', 'block', 'cluster', 'accountNumber', 'husbandName', 'address', 'whatsapp'];
        
        rawHeaders.forEach(h => {
            const lower = h.toLowerCase().replace(/\s+/g, '');
            const matchedKey = headerKeys.find(key => lower.startsWith(key.toLowerCase().substring(0, 4)));
            if (matchedKey) headerMap[h] = matchedKey;
        });

        const requiredHeaders = ['name', 'houseNumber', 'block', 'cluster'];
         if (!requiredHeaders.every(h => Object.values(headerMap).includes(h))) {
             throw new Error(`CSV must include headers for: ${requiredHeaders.join(', ')}. Please check your file. Found: ${Object.values(headerMap).join(', ')}`);
        }

        let membersAdded = 0;
        let membersUpdated = 0;
        let failedRows = 0;
        let duplicatesFound = 0;
        const membersToOverwrite: Member[] = [];
        
        const existingMembersMap = new Map(allMembers.map(m => [m.accountNumber, m]));
        const csvAccountNumbers = new Set<string>();

        const parseAndNormalizePhoneNumber = (numStr: string): string => {
            if (!numStr) return '';
            let cleanNum = String(numStr).replace(/"/g, '').trim();
            if (cleanNum.toUpperCase().includes('E+')) {
                try {
                    cleanNum = Number(cleanNum).toFixed(0);
                } catch { return ''; }
            }
            return normalizePhoneNumber(cleanNum);
        };

        if (!overwrite) {
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const rowData: { [key: string]: string } = {};
                rawHeaders.forEach((header, index) => {
                    const mappedKey = headerMap[header];
                    if (mappedKey) rowData[mappedKey] = values[index];
                });

                const accountNumber = rowData.accountNumber;
                if (accountNumber && existingMembersMap.has(accountNumber)) {
                    duplicatesFound++;
                    membersToOverwrite.push(existingMembersMap.get(accountNumber)!);
                }
            }
            if (duplicatesFound > 0) {
                return { success: 0, failed: 0, duplicates: duplicatesFound, membersToOverwrite };
            }
        }
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const memberData: { [key: string]: string } = {};
            rawHeaders.forEach((header, index) => {
                const mappedKey = headerMap[header];
                if (mappedKey) memberData[mappedKey] = values[index];
            });

            let block = blocks.find(b => b.name.trim().toLowerCase() === memberData.block.trim().toLowerCase());
            if (!block) {
                const newBlock = await addBlock(memberData.block.trim());
                if (newBlock) {
                    blocks.push(newBlock);
                    block = newBlock;
                }
            }
            if(!block) { failedRows++; continue; }

            let cluster = block.clusters.find(c => c.name.trim().toLowerCase() === memberData.cluster.trim().toLowerCase());
            if (!cluster) {
                await addCluster(block.name, memberData.cluster.trim().toUpperCase());
                // Re-fetch might be slow, so we just assume it's created and proceed
                // This part is not ideal but necessary for bulk without complex state management
                const newClusterId = `${block.id}-${memberData.cluster.trim().toUpperCase()}`;
                cluster = { id: newClusterId, blockId: block.id, name: memberData.cluster.trim().toUpperCase(), members: [] };
            }
            
            const phone = parseAndNormalizePhoneNumber(memberData.phone) || parseAndNormalizePhoneNumber(memberData.whatsapp) || '';
            const whatsapp = parseAndNormalizePhoneNumber(memberData.whatsapp) || phone;
            
            if (!phone || !memberData.name || !memberData.block || !memberData.cluster || !memberData.houseNumber) {
                failedRows++;
                continue;
            }

            const newMemberPayload: Partial<Member> = {
                accountNumber: memberData.accountNumber,
                name: memberData.name,
                houseNumber: memberData.houseNumber,
                husbandName: memberData.husbandName || '',
                address: memberData.address || '',
                phone: phone,
                whatsapp: whatsapp,
                block: block.name,
                cluster: cluster.name,
                blockId: block.id,
                clusterId: cluster.id,
                hasPaidRegistrationFee: false,
            };

            const accountNumber = memberData.accountNumber;
            
            if (accountNumber && csvAccountNumbers.has(accountNumber)) {
                failedRows++;
                continue;
            }
            if(accountNumber) csvAccountNumbers.add(accountNumber);
            
            const existingMember = existingMembersMap.get(accountNumber);
            
            if (existingMember && overwrite) {
                await offlineDB.updateDoc('members', existingMember.id, newMemberPayload);
                membersUpdated++;
            } else if (!existingMember) {
                const finalAccountNumber = accountNumber || `MB${Date.now() + i}`;
                await offlineDB.addDoc('members', { ...newMemberPayload, accountNumber: finalAccountNumber });
                membersAdded++;
            }
        }
        return { success: membersAdded + membersUpdated, failed: failedRows, duplicates: 0, membersToOverwrite: [] };
    };

    const bulkAddTransactions = async (csvData: string, overwrite: boolean = false) => {
        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');
        
        const headers = lines[0].split(',').map(h => h.trim());
        const required = ['accountNumber', 'type', 'amount'];
        if (!required.every(h => headers.includes(h))) throw new Error(`CSV must include headers: ${required.join(', ')}`);

        const allTransactionsMap = new Map(transactionsData?.map(t => [t.id, t]));
        let duplicatesFound = 0;
        
        if (!overwrite) {
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const row: { [key: string]: string } = {};
                headers.forEach((header, index) => row[header] = values[index]?.trim());
                if (row.transactionId && allTransactionsMap.has(row.transactionId)) {
                    duplicatesFound++;
                }
            }
            if (duplicatesFound > 0) return { success: 0, failed: 0, duplicates: duplicatesFound };
        }
        
        let success = 0;
        let failed = 0;
        const memberMap = new Map(allMembers.map(m => [m.accountNumber, m.id]));

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const row: { [key: string]: string } = {};
            headers.forEach((header, index) => row[header] = values[index]?.trim());
            
            const memberId = memberMap.get(row.accountNumber);
            const amount = parseFloat(row.amount);
            const type = row.type?.toLowerCase();

            if (!memberId || isNaN(amount) || (type !== 'in' && type !== 'out')) {
                failed++;
                continue;
            }
            
            const txId = row.transactionId;
            const transactionPayload: Omit<Transaction, 'id' | 'createdAt'> = {
                memberId,
                type: type as 'in' | 'out',
                amount,
                date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
                remarks: row.remarks || 'Bulk Upload',
            };

            if (txId && overwrite && allTransactionsMap.has(txId)) {
                await offlineDB.setDoc('transactions', txId, transactionPayload);
            } else {
                await offlineDB.addDoc('transactions', {id: txId, ...transactionPayload});
            }
            success++;
        }
        
        return { success, failed, duplicates: 0 };
    };

    const loading = blocksLoading || clustersLoading || membersLoading || transactionsLoading || adminTransactionsLoading || bankTransactionsLoading;

  const value = {
    allMembers,
    blocks,
    adminTransactions,
    bankTransactions,
    searchQuery,
    setSearchQuery,
    getMemberById,
    getMemberByAccountNumber,
    addMember,
    updateMember,
    deleteMember,
    addTransaction,
    updateTransaction,
    addBlock,
    addCluster,
    deleteBlock,
    deleteCluster,
    chargeRegistrationFee,
    chargePassbookFee,
    deleteAdminTransaction,
    addBankTransaction,
    updateBankTransaction,
    deleteBankTransaction,
    resetAllData,
    bulkAddMembers,
    bulkAddTransactions,
    appSettings,
    updateAppSettings,
    loading
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
