'use client';
// Complete offline data manager replacing Firebase

// --- Content from localDatabase.ts starts here ---
const DB_NAME = 'MahalluConnect';
const DB_VERSION = 2;

export interface StorageData {
  members?: any[];
  transactions?: any[];
  dashboard?: any;
  reports?: any;
  settings?: any;
  [key: string]: any;
}

class LocalDatabase {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        const stores = ['members', 'transactions', 'blocks', 'clusters', 'adminTransactions', 'bankTransactions', 'dashboard', 'reports', 'settings', 'metadata'];
        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };
    });
  }

  async getData<T>(storeName: string, id?: string | number): Promise<T | T[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = id ? store.get(id) : store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async setData(storeName: string, data: any, id?: string | number): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const dataWithId = id ? { ...data, id } : data;
      const request = id ? store.put(dataWithId) : store.add(dataWithId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteData(storeName: string, id: string | number): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllData(): Promise<StorageData> {
    const stores = ['members', 'transactions', 'dashboard', 'reports', 'settings'];
    const result: StorageData = {};

    for (const store of stores) {
      result[store] = await this.getData(store) as any[];
    }

    return result;
  }

  async saveAllData(data: StorageData): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      if (value) {
        await this.clearStore(key);
        if (Array.isArray(value)) {
          for (const item of value) {
            await this.setData(key, item);
          }
        } else {
          await this.setData(key, value);
        }
      }
    }
  }
}

const localDB = new LocalDatabase();
// --- Content from localDatabase.ts ends here ---


export interface DataSnapshot<T> {
  data: () => T | undefined;
  exists: () => boolean;
  id: string;
}

export interface QuerySnapshot<T> {
  docs: DataSnapshot<T>[];
  empty: boolean;
  size: number;
}

export class OfflineDataManager {
  private static instance: OfflineDataManager;
  private listeners: Map<string, Set<Function>> = new Map();

  private constructor() {}

  static getInstance(): OfflineDataManager {
    if (!OfflineDataManager.instance) {
      OfflineDataManager.instance = new OfflineDataManager();
    }
    return OfflineDataManager.instance;
  }

  /**
   * Get a single document
   */
  async getDoc<T = any>(collection: string, docId: string): Promise<DataSnapshot<T>> {
    const data = (await localDB.getData(collection, docId)) as T | undefined;
    return {
      data: () => data,
      exists: () => !!data,
      id: String(docId),
    };
  }

  /**
   * Get all documents from a collection
   */
  async getDocs<T = any>(collection: string): Promise<QuerySnapshot<T>> {
    const allData = (await localDB.getData(collection)) as T[];
    const docs = (Array.isArray(allData) ? allData : []).map((item: any) => ({
      data: () => item,
      exists: () => true,
      id: item.id,
    }));

    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
    };
  }

  /**
   * Add a new document
   */
  async addDoc<T = any>(collection: string, data: T & { id?: string }): Promise<string> {
    const newId = data.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const docWithIdAndTimestamp = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await localDB.setData(collection, docWithIdAndTimestamp, newId);
    this.notifyListeners(collection);
    return newId;
  }

  /**
   * Update a document
   */
  async updateDoc<T = any>(collection: string, docId: string, data: Partial<T>): Promise<void> {
    const existing = (await localDB.getData(collection, docId)) as any;
    if (!existing) {
        console.warn(`Document with id ${docId} not found in ${collection}. Cannot update.`);
        return;
    }
    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await localDB.setData(collection, updated, docId);
    this.notifyListeners(collection);
  }

  /**
   * Delete a document
   */
  async deleteDoc(collection: string, docId: string): Promise<void> {
    await localDB.deleteData(collection, docId);
    this.notifyListeners(collection);
  }
  
   async setDoc(collection: string, docId: string, data: any): Promise<void> {
    const docWithIdAndTimestamp = {
      ...data,
      id: docId,
      updatedAt: new Date().toISOString(),
    };
    await localDB.setData(collection, docWithIdAndTimestamp, docId);
    this.notifyListeners(collection);
  }
  
  async clearStore(collectionName: string): Promise<void> {
    await localDB.clearStore(collectionName);
    this.notifyListeners(collectionName);
  }

  /**
   * Subscribe to collection changes
   */
  onSnapshot<T = any>(collection: string, callback: (snapshot: QuerySnapshot<T>) => void): () => void {
    if (!this.listeners.has(collection)) {
      this.listeners.set(collection, new Set());
    }

    const wrappedCallback = async () => {
      const snapshot = await this.getDocs<T>(collection);
      callback(snapshot);
    };

    this.listeners.get(collection)!.add(wrappedCallback);

    // Initial call
    wrappedCallback();

    // Return unsubscribe function
    return () => {
      this.listeners.get(collection)?.delete(wrappedCallback);
    };
  }

  /**
   * Notify all listeners for a collection
   */
  public notifyListeners(collection: string): void {
    const collectionListeners = this.listeners.get(collection);
    if (collectionListeners) {
      collectionListeners.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          console.error('Error in listener:', error);
        }
      });
    }
  }
}

export const offlineDB = OfflineDataManager.getInstance();
