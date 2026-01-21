// Complete offline data manager replacing Firebase
import { localDB } from '@/lib/localDatabase';

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
