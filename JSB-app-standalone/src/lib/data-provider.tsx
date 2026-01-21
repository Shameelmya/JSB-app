'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Member, Block, Cluster, Transaction, AppSettings, AdminTransaction, BankTransaction } from '@/types';
import { format } from 'date-fns';
import { useFirebase, useMemoFirebase } from '@/firebase';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    deleteDoc,
    writeBatch,
    query,
    getDocs,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    setDocumentNonBlocking,
    addDocumentNonBlocking,
    updateDocumentNonBlocking,
    deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useAppSettings } from '@/lib/app-settings';


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
  deleteMember: (id: string) => void;
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

// Helper to convert Firestore Timestamps to ISO strings
const processDoc = <T,>(doc: T): T => {
    if (!doc || typeof doc !== 'object') return doc;
    const newDoc: any = { ...doc };
    for (const key in newDoc) {
        if (newDoc[key] instanceof Timestamp) {
            newDoc[key] = newDoc[key].toDate().toISOString();
        } else if (Array.isArray(newDoc[key])) {
             newDoc[key] = newDoc[key].map(item => processDoc(item));
        } else if (typeof newDoc[key] === 'object' && newDoc[key] !== null) {
            newDoc[key] = processDoc(newDoc[key]);
        }
    }
    return newDoc;
};


export function DataProvider({ children }: { children: React.ReactNode }) {
    const { firestore, user } = useFirebase();
    const [searchQuery, setSearchQuery] = useState('');
    const { appSettings, updateAppSettings } = useAppSettings();
    
    // Memoized Firestore queries, conditional on user being authenticated
    const blocksQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'blocks') : null, [firestore, user]);
    const clustersQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'clusters') : null, [firestore, user]);
    const membersQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'members') : null, [firestore, user]);
    const transactionsQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'transactions') : null, [firestore, user]);
    const adminTransactionsQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'adminTransactions') : null, [firestore, user]);
    const bankTransactionsQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'bankTransactions') : null, [firestore, user]);

    // Firestore real-time data hooks
    const { data: blocksData, isLoading: blocksLoading } = useCollection<Omit<Block, 'clusters'>>(blocksQuery);
    const { data: clustersData, isLoading: clustersLoading } = useCollection<Omit<Cluster, 'members'>>(clustersQuery);
    const { data: membersData, isLoading: membersLoading } = useCollection<Omit<Member, 'transactions'>>(membersQuery);
    const { data: transactionsData, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);
    const { data: adminTransactionsData, isLoading: adminTransactionsLoading } = useCollection<AdminTransaction>(adminTransactionsQuery);
    const { data: bankTransactionsData, isLoading: bankTransactionsLoading } = useCollection<BankTransaction>(bankTransactionsQuery);

  const allMembers = useMemo(() => {
    if (!membersData || !transactionsData) return [];
    
    const processedMembers = membersData.map(m => processDoc(m));
    const processedTransactions = transactionsData.map(t => processDoc(t));

    return processedMembers.map(member => {
      const memberTransactions = processedTransactions
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

  const adminTransactions = useMemo(() => adminTransactionsData ? adminTransactionsData.map(t => processDoc(t)) : [], [adminTransactionsData]);
  const bankTransactions = useMemo(() => bankTransactionsData ? bankTransactionsData.map(t => processDoc(t)) : [], [bankTransactionsData]);
  
  const blocks = useMemo(() => {
      if (!blocksData || !clustersData) return [];
      
      const processedBlocks = blocksData.map(b => processDoc(b));
      const processedClusters = clustersData.map(c => processDoc(c));
      
      return processedBlocks.map(block => ({
          ...block,
          clusters: processedClusters
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
        let cleanNum = phone.replace(/\D/g, ''); // Remove non-digits
        // If it's a 10 digit number, assume it's Indian
        if (cleanNum.length === 10) {
            return `91${cleanNum}`;
        }
        // If it already has country code (e.g. +91), use it after cleaning
        if (phone.startsWith('+')) {
            return phone.replace(/\D/g, '');
        }
        return cleanNum;
    }

    const addMember = async (memberData: Omit<Member, 'id' | 'transactions' | 'totalIn' | 'totalOut' | 'balance' | 'blockId' | 'clusterId' | 'hasPaidRegistrationFee'> & {block: string, cluster: string}) => {
        if (!firestore) return;
        
        const existingMember = getMemberByAccountNumber(memberData.accountNumber);
        if (memberData.accountNumber && existingMember) {
            return existingMember; 
        }

        const block = blocks.find(b => b.name === memberData.block);
        if (!block) throw new Error("Block not found");

        const cluster = block.clusters.find(c => c.name === memberData.cluster);
        if (!cluster) throw new Error("Cluster not found in the selected block.");

        const memberRef = doc(collection(firestore, 'members'));

        const newMemberPayload = {
            id: memberRef.id,
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
        
        await setDocumentNonBlocking(memberRef, newMemberPayload, {});
        return undefined; // Indicate success for new member
    };

    const updateMember = async (id: string, memberData: Partial<Omit<Member, 'id' | 'transactions' | 'totalIn' | 'totalOut' | 'balance'>>) => {
        if (!firestore) return;
        const memberRef = doc(firestore, 'members', id);

        const payload: { [key: string]: any } = { ...memberData };

        if ('block' in payload && 'cluster' in payload) {
            const block = blocks.find(b => b.name === payload.block);
            const cluster = block?.clusters.find(c => c.name === payload.cluster);

            if (block && cluster) {
                payload.blockId = block.id;
                payload.clusterId = cluster.id;
            }
        }
        
        await updateDocumentNonBlocking(memberRef, payload);
    };

    const deleteMember = async (id: string) => {
        if (!firestore) return;
        
        const batch = writeBatch(firestore);
        const memberRef = doc(firestore, 'members', id);
        
        // Query for transactions to delete instead of relying on local state
        const q = query(collection(firestore, 'transactions'), where('memberId', '==', id));
        const transactionsSnapshot = await getDocs(q);
        transactionsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        batch.delete(memberRef);
        await batch.commit();
    };

    const addTransaction = async (memberId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'memberId'>): Promise<{ transactionId: string, newBalance: number }> => {
        if (!firestore) throw new Error("Firestore not initialized");
        
        const member = allMembers.find(m => m.id === memberId);
        if (!member) throw new Error("Member not found");

        const batch = writeBatch(firestore);
        const REGISTRATION_FEE = 50;

        let finalTransactionAmount = transaction.amount;
        
        const currentBalance = member.balance;
        let newBalance = currentBalance;

        if (transaction.type === 'in' && !member.hasPaidRegistrationFee && transaction.amount >= REGISTRATION_FEE) {
            finalTransactionAmount -= REGISTRATION_FEE;
            
            const adminTxRef = doc(collection(firestore, 'adminTransactions'));
            batch.set(adminTxRef, {
                id: adminTxRef.id,
                memberId: member.id,
                type: 'registration_fee',
                amount: REGISTRATION_FEE,
                date: new Date().toISOString()
            });

            const memberRef = doc(firestore, 'members', member.id);
            batch.update(memberRef, { hasPaidRegistrationFee: true });

            newBalance -= REGISTRATION_FEE;
        }
        
        if (transaction.type === 'in') {
            newBalance += finalTransactionAmount;
        } else {
            newBalance -= transaction.amount;
        }

        const txCollection = collection(firestore, 'transactions');
        const newTxRef = doc(txCollection);
        batch.set(newTxRef, {
            ...transaction,
            amount: transaction.type === 'in' ? finalTransactionAmount : transaction.amount,
            memberId,
            id: newTxRef.id,
        });

        await batch.commit();

        return { transactionId: newTxRef.id, newBalance };
    };

    const updateTransaction = async (memberId: string, transactionId: string, newAmount: number, newDate: string) => {
        if (!firestore) return;
        const txRef = doc(firestore, 'transactions', transactionId);
        await updateDocumentNonBlocking(txRef, { amount: newAmount, date: newDate });
    };

    const addBlock = async (blockName: string, batch?: ReturnType<typeof writeBatch>) => {
        if (!firestore) throw new Error("Firestore not initialized");
        const existingBlock = blocksData?.find(b => b.name.trim().toLowerCase() === blockName.trim().toLowerCase());
        if (existingBlock) {
            return {
                id: existingBlock.id,
                name: existingBlock.name,
                clusters: clustersData?.filter(c => c.blockId === existingBlock.id).map(c => ({...c, members:[]})) || []
            };
        }

        const shouldCommit = !batch;
        const commitBatch = batch || writeBatch(firestore);

        const blockRef = doc(collection(firestore, 'blocks'));
        const newBlockData = { name: blockName, id: blockRef.id };
        commitBatch.set(blockRef, newBlockData);

        const newClusters = [];
        const clusterNames = ['A', 'B', 'C', 'D'];
        for (const name of clusterNames) {
            const clusterRef = doc(collection(firestore, 'clusters'));
            const newClusterData = { name, id: clusterRef.id, blockId: blockRef.id };
            commitBatch.set(clusterRef, newClusterData);
            newClusters.push({...newClusterData, members:[]});
        }
        
        if (shouldCommit) {
            await commitBatch.commit();
        }

        return {...newBlockData, clusters: newClusters };
    };

    const addCluster = async (blockName: string, clusterName: string) => {
        if (!firestore) throw new Error("Firestore not initialized");

        const block = blocks.find(b => b.name === blockName);
        if (!block) {
            throw new Error(`Block ${blockName} not found.`);
        }
        const blockId = block.id;

        const existingCluster = clustersData?.find(c => c.blockId === blockId && c.name.trim().toLowerCase() === clusterName.trim().toLowerCase());
        if (existingCluster) {
            throw new Error(`Cluster ${clusterName} already exists in block ${blockName}.`);
        }

        const clusterRef = doc(collection(firestore, 'clusters'));
        const newCluster = { name: clusterName, id: clusterRef.id, blockId: blockId };
        await setDocumentNonBlocking(clusterRef, newCluster, {});
    };
    
    const deleteBlock = async (blockName: string) => {
        if (!firestore) throw new Error("Firestore not initialized.");
        
        const blockToDelete = blocksData?.find(b => b.name === blockName);
        if (!blockToDelete) throw new Error("Block not found.");

        const batch = writeBatch(firestore);

        // 1. Find all members in the block
        const membersQuery = query(collection(firestore, 'members'), where('blockId', '==', blockToDelete.id));
        const membersSnapshot = await getDocs(membersQuery);
        const memberIds = membersSnapshot.docs.map(d => d.id);

        // 2. Find and delete all transactions for those members
        if (memberIds.length > 0) {
            // Firestore 'in' query is limited to 30 items. We might need to batch this.
            for (let i = 0; i < memberIds.length; i += 30) {
                const chunk = memberIds.slice(i, i + 30);
                const transactionsQuery = query(collection(firestore, 'transactions'), where('memberId', 'in', chunk));
                const transactionsSnapshot = await getDocs(transactionsQuery);
                transactionsSnapshot.forEach(doc => batch.delete(doc.ref));
            }
        }
        
        // 3. Delete all member documents
        membersSnapshot.forEach(doc => batch.delete(doc.ref));

        // 4. Find and delete all clusters in the block
        const clustersQuery = query(collection(firestore, 'clusters'), where('blockId', '==', blockToDelete.id));
        const clustersSnapshot = await getDocs(clustersQuery);
        clustersSnapshot.forEach(doc => batch.delete(doc.ref));

        // 5. Delete the block itself
        batch.delete(doc(firestore, 'blocks', blockToDelete.id));

        await batch.commit();
    };
    
    const deleteCluster = async (blockName: string, clusterName: string) => {
        if (!firestore) throw new Error("Firestore not initialized.");
        
        const block = blocksData?.find(b => b.name === blockName);
        if (!block) throw new Error("Block not found.");
        
        const clusterToDelete = clustersData?.find(c => c.blockId === block.id && c.name === clusterName);
        if (!clusterToDelete) throw new Error("Cluster not found.");

        const batch = writeBatch(firestore);

        // 1. Find all members in the cluster
        const membersQuery = query(collection(firestore, 'members'), where('clusterId', '==', clusterToDelete.id));
        const membersSnapshot = await getDocs(membersQuery);
        const memberIds = membersSnapshot.docs.map(d => d.id);

        // 2. Find and delete all transactions for those members
        if (memberIds.length > 0) {
           for (let i = 0; i < memberIds.length; i += 30) {
                const chunk = memberIds.slice(i, i + 30);
                const transactionsQuery = query(collection(firestore, 'transactions'), where('memberId', 'in', chunk));
                const transactionsSnapshot = await getDocs(transactionsQuery);
                transactionsSnapshot.forEach(doc => batch.delete(doc.ref));
            }
        }
        
        // 3. Delete all member documents
        membersSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // 4. Delete the cluster itself
        batch.delete(doc(firestore, 'clusters', clusterToDelete.id));

        await batch.commit();
    };

    const chargeRegistrationFee = async (memberId: string) => {
        if (!firestore) return;
        const member = allMembers.find(m => m.id === memberId);
        if (!member) throw new Error("Member not found");
        if (member.hasPaidRegistrationFee) throw new Error("Member has already paid the registration fee.");
        
        const REGISTRATION_FEE = 50;
        if (member.balance < REGISTRATION_FEE) {
            throw new Error(`Insufficient balance. Member needs at least ₹${REGISTRATION_FEE} to pay the fee.`);
        }

        const batch = writeBatch(firestore);

        // 1. Add registration fee to admin transactions
        const adminTxRef = doc(collection(firestore, 'adminTransactions'));
        batch.set(adminTxRef, {
            id: adminTxRef.id,
            memberId: member.id,
            type: 'registration_fee',
            amount: REGISTRATION_FEE,
            date: new Date().toISOString()
        });

        // 2. Add a 'cash out' transaction for the member
        const memberTxRef = doc(collection(firestore, 'transactions'));
        batch.set(memberTxRef, {
            id: memberTxRef.id,
            memberId: member.id,
            type: 'out',
            amount: REGISTRATION_FEE,
            date: new Date().toISOString(),
            remarks: 'One-Time Registration Fee'
        });

        // 3. Mark member as having paid
        const memberRef = doc(firestore, 'members', member.id);
        batch.update(memberRef, { hasPaidRegistrationFee: true });

        await batch.commit();
    };
    
    const chargePassbookFee = async (memberId: string) => {
        if (!firestore) return;
        const member = allMembers.find(m => m.id === memberId);
        if (!member) throw new Error("Member not found");

        const batch = writeBatch(firestore);
        const PASSBOOK_FEE = 50;

        // 1. Add passbook fee to admin transactions
        const adminTxRef = doc(collection(firestore, 'adminTransactions'));
        batch.set(adminTxRef, {
            id: adminTxRef.id,
            memberId: member.id,
            type: 'passbook_fee',
            amount: PASSBOOK_FEE,
            date: new Date().toISOString()
        });
        
        // 2. Add a 'cash out' transaction for the member
        const memberTxRef = doc(collection(firestore, 'transactions'));
        batch.set(memberTxRef, {
            id: memberTxRef.id,
            memberId: member.id,
            type: 'out',
            amount: PASSBOOK_FEE,
            date: new Date().toISOString(),
            remarks: 'Passbook Renew Charge'
        });
        
        await batch.commit();
    };

    const deleteAdminTransaction = async (transactionId: string) => {
        if (!firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'adminTransactions', transactionId));
    };

    const addBankTransaction = async (transaction: Omit<BankTransaction, 'id'>) => {
        if (!firestore) return;
        const newDocRef = doc(collection(firestore, 'bankTransactions'));
        await setDocumentNonBlocking(newDocRef, { ...transaction, id: newDocRef.id }, {});
    };

    const updateBankTransaction = async (transactionId: string, transaction: Omit<BankTransaction, 'id'>) => {
        if (!firestore) return;
        await updateDocumentNonBlocking(doc(firestore, 'bankTransactions', transactionId), transaction);
    };

    const deleteBankTransaction = async (transactionId: string) => {
        if (!firestore) return;
        await deleteDocumentNonBlocking(doc(firestore, 'bankTransactions', transactionId));
    };

    const resetAllData = async () => {
        if (!firestore) return;
        const collections = ['blocks', 'clusters', 'members', 'transactions', 'adminTransactions', 'bankTransactions'];
        
        for (const coll of collections) {
            const collRef = collection(firestore, coll);
            const querySnapshot = await getDocs(collRef);
            const batch = writeBatch(firestore);
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    };

    const bulkAddMembers = async (csvData: string, overwrite: boolean = false) => {
        if (!firestore) return { success: 0, failed: 0, duplicates: 0, membersToOverwrite: [] };
        
        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');

        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const headerMap: { [key: string]: string } = {};
        const headerKeys = ['name', 'houseNumber', 'phone', 'block', 'cluster', 'accountNumber', 'husbandName', 'address', 'whatsapp'];
        
        rawHeaders.forEach(h => {
            const lower = h.toLowerCase().replace(/\s+/g, '');
            const matchedKey = headerKeys.find(key => lower.startsWith(key.toLowerCase().substring(0, 4)));
            if (matchedKey) {
                headerMap[h] = matchedKey;
            }
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
            // Handle scientific notation
            if (cleanNum.toUpperCase().includes('E+')) {
                try {
                    cleanNum = Number(cleanNum).toFixed(0);
                } catch { return ''; }
            }
            return normalizePhoneNumber(cleanNum);
        };

        const batch = writeBatch(firestore);
        let localBlocks = [...blocks];

        // Analysis pass
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
        
        // Processing and commit pass
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const memberData: { [key: string]: string } = {};
            rawHeaders.forEach((header, index) => {
                const mappedKey = headerMap[header];
                if (mappedKey) memberData[mappedKey] = values[index];
            });

            let block = localBlocks.find(b => b.name.trim().toLowerCase() === memberData.block.trim().toLowerCase());
            if (!block) {
                const newBlock = await addBlock(memberData.block.trim(), batch);
                if (newBlock) {
                    localBlocks.push(newBlock);
                    block = newBlock;
                }
            }
            if(!block) { failedRows++; continue; }

            let cluster = block.clusters.find(c => c.name.trim().toLowerCase() === memberData.cluster.trim().toLowerCase());
            if (!cluster) {
                const clusterRef = doc(collection(firestore, 'clusters'));
                const newClusterData = { name: memberData.cluster.trim().toUpperCase(), id: clusterRef.id, blockId: block.id, members: [] };
                batch.set(clusterRef, { name: newClusterData.name, id: newClusterData.id, blockId: newClusterData.blockId });
                block.clusters.push(newClusterData);
                cluster = newClusterData;
            }
            
            const phone = parseAndNormalizePhoneNumber(memberData.phone) || parseAndNormalizePhoneNumber(memberData.whatsapp) || '';
            const whatsapp = parseAndNormalizePhoneNumber(memberData.whatsapp) || phone;
            
            if (!phone || !memberData.name || !memberData.block || !memberData.cluster || !memberData.houseNumber) {
                failedRows++;
                continue;
            }

            const newMemberPayload = {
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
                hasPaidRegistrationFee: false, // Always false for new/bulk members initially
            };

            const accountNumber = memberData.accountNumber;
            
            // Check for duplicates within the CSV itself
            if (accountNumber && csvAccountNumbers.has(accountNumber)) {
                console.warn(`Duplicate account number ${accountNumber} found in CSV file. Skipping subsequent entry.`);
                failedRows++;
                continue;
            }
            if(accountNumber) csvAccountNumbers.add(accountNumber);
            
            const existingMember = existingMembersMap.get(accountNumber);
            
            if (existingMember && overwrite) {
                const memberRef = doc(firestore, 'members', existingMember.id);
                batch.update(memberRef, newMemberPayload);
                membersUpdated++;
            } else if (!existingMember) {
                const newMemberRef = doc(collection(firestore, 'members'));
                const finalAccountNumber = accountNumber || `MB${Date.now() + i}`;
                batch.set(newMemberRef, { ...newMemberPayload, id: newMemberRef.id, accountNumber: finalAccountNumber });
                membersAdded++;
            }
        }

        await batch.commit();
        return { success: membersAdded + membersUpdated, failed: failedRows, duplicates: 0, membersToOverwrite: [] };
    };

    const bulkAddTransactions = async (csvData: string, overwrite: boolean = false) => {
        if (!firestore) return { success: 0, failed: 0, duplicates: 0 };

        const lines = csvData.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');
        
        const headers = lines[0].split(',').map(h => h.trim());
        const required = ['accountNumber', 'type', 'amount'];
        if (!required.every(h => headers.includes(h))) throw new Error(`CSV must include headers: ${required.join(', ')}`);

        const allTransactionsMap = new Map(transactionsData?.map(t => [t.id, t]));
        let duplicatesFound = 0;
        
        // First pass for analysis if not overwriting
        if (!overwrite) {
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                const row: { [key: string]: string } = {};
                headers.forEach((header, index) => row[header] = values[index]?.trim());

                if (row.transactionId && allTransactionsMap.has(row.transactionId)) {
                    duplicatesFound++;
                }
            }
            if (duplicatesFound > 0) {
                return { success: 0, failed: 0, duplicates: duplicatesFound };
            }
        }
        
        // Second pass to process
        let success = 0;
        let failed = 0;
        const batch = writeBatch(firestore);
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
            
            const transactionPayload = {
                memberId: memberId,
                type: type as 'in' | 'out',
                amount,
                date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
                remarks: row.remarks || 'Bulk Upload',
                id: row.transactionId || '' // Keep id for potential overwrite
            };

            const txId = row.transactionId;
            if (txId && overwrite && allTransactionsMap.has(txId)) {
                // Overwrite existing transaction
                const txRef = doc(firestore, 'transactions', txId);
                const { id, ...payloadWithoutId } = transactionPayload;
                batch.set(txRef, payloadWithoutId);
            } else {
                // Add new transaction
                const newTxRef = txId ? doc(firestore, 'transactions', txId) : doc(collection(firestore, 'transactions'));
                const { id, ...payloadWithoutId } = transactionPayload;
                batch.set(newTxRef, {...payloadWithoutId, id: newTxRef.id});
            }
            success++;
        }
        
        await batch.commit();
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
