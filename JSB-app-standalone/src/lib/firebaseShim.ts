// Firebase shim that redirects all calls to offline database
import { offlineDB } from './offlineDataManager';

// Firestore shim
export const db = {
  // This is a fake db object - actual calls will use offlineDB
};

// Doc reference shim
export const doc = (collection: string, docId: string) => ({
  __collection: collection,
  __docId: docId,
});

// Collection reference shim  
export const collection = (db: any, collectionName: string) => ({
  __collection: collectionName,
});

// Query functions redirected to offlineDB
export const getDocs = async (query: any) => {
  const collectionName = query.__collection;
  return offlineDB.getDocs(collectionName);
};

export const getDoc = async (docRef: any) => {
  return offlineDB.getDoc(docRef.__collection, docRef.__docId);
};

export const addDoc = async (collectionRef: any, data: any) => {
  const collectionName = collectionRef.__collection;
  return { id: await offlineDB.addDoc(collectionName, data) };
};

export const updateDoc = async (docRef: any, data: any) => {
  return offlineDB.updateDoc(docRef.__collection, docRef.__docId, data);
};

export const deleteDoc = async (docRef: any) => {
  return offlineDB.deleteDoc(docRef.__collection, docRef.__docId);
};

export const onSnapshot = (query: any, callback: any) => {
  const collectionName = query.__collection;
  return offlineDB.onSnapshot(collectionName, callback);
};

// Auth shim
export const auth = {
  currentUser: null,
};

export const signOut = async () => {};
export const getAuth = () => auth;
