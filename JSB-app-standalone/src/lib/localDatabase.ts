// Offline IndexedDB Database for standalone operation
// This file handles all offline data persistence

const DB_NAME = 'MahalluConnect';
const DB_VERSION = 1;

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
        const stores = ['members', 'transactions', 'dashboard', 'reports', 'settings', 'metadata'];
        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
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

export const localDB = new LocalDatabase();
