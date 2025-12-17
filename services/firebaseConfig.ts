// services/firebaseConfig.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence exists but TypeScript may not recognize it
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Auth with AsyncStorage persistence (persists login between app restarts)
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Auth already initialized, get existing instance
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);