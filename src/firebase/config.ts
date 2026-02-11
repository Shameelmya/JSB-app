import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyBbUp2TMP3_HrXscGA31tQn8Y2ecl-N5Hg",
  authDomain: "mahall-bnk.firebaseapp.com",
  projectId: "mahall-bnk",
  storageBucket: "mahall-bnk.firebasestorage.app",
  messagingSenderId: "364265261108",
  appId: "1:364265261108:web:920e1480f91663c1b982fc"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
