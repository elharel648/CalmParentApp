// services/firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // רק הייבוא הבסיסי ביותר
import { getFirestore } from 'firebase/firestore';

// 🔥 פרטי הפרויקט שלך
const firebaseConfig = {
  apiKey: 'AIzaSyAdESrCDWktlnZGyDrSeqElw3WL7Q9MPUQ',
  authDomain: 'baby-app-42b3b.firebaseapp.com',
  projectId: 'baby-app-42b3b',
  storageBucket: 'baby-app-42b3b.appspot.com',
  messagingSenderId: '16421819020',
  appId: '1:16421819020:web:2c87cd757d69fae199a1a9',
};

// אתחול פשוט - בלי התחכמויות
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// שימוש ב-getAuth הרגיל. זה אולי ייתן אזהרה צהובה, אבל זה לא יקרוס!
const auth = getAuth(app);

export { auth };
export const db = getFirestore(app);