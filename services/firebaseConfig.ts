// services/firebaseConfig.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // <--- התיקון לנתיב הנכון
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAdESrCDWktlnZGyDrSeqElw3WL7Q9MPUQ",
  authDomain: "baby-app-42b3b.firebaseapp.com",
  projectId: "baby-app-42b3b",
  storageBucket: "baby-app-42b3b.appspot.com", 
  messagingSenderId: "16421819020",
  appId: "1:16421819020:web:2c87cd757d69fae199a1a9",
  // measurementId לא חובה במובייל
};

// אתחול ה-App פעם אחת
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth + Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);