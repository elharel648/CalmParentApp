// services/firebaseService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig'; 

// --- הגדרות קולקציה קבועות ---
const EVENTS_COLLECTION = 'events';
const PROFILES_COLLECTION = 'child_profiles';
const GARDEN_REPORTS_COLLECTION = 'garden_reports';

// --- ממשקים (Types) ---
interface ChildProfile {
    name: string;
    birthDate: Date;
    parentId: string;
    childId: string;
}

// ----------------------------------------------------
// 1. ניהול פרופיל הילד (נדרש עבור HomeScreen ו-AI)
// ----------------------------------------------------

export const getChildProfile = async (userId: string): Promise<ChildProfile | null> => {
    try {
        const q = query(collection(db, PROFILES_COLLECTION), where('parentId', '==', userId), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            const data = doc.data();
            
            return {
                name: data.name || 'עלמא',
                birthDate: data.birthDate instanceof Timestamp ? data.birthDate.toDate() : new Date(data.birthDate),
                parentId: userId,
                childId: doc.id 
            };
        }
        return null;
    } catch (e) {
        return null;
    }
};

// ----------------------------------------------------
// 2. שמירה ושליפת אירועים (Events)
// ----------------------------------------------------

// 💡 נוסף childId
export const saveEventToFirebase = async (userId: string, childId: string, data: any) => {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const timestamp = data.timestamp ? (data.timestamp instanceof Date ? Timestamp.fromDate(data.timestamp) : data.timestamp) : new Date();

    await addDoc(eventsRef, {
      userId,
      childId, // 🔑 קריטי לשיתוף ולריבוי ילדים
      ...data, 
      timestamp 
    });
    return true;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
};

// 💡 שונה userId ל-childId
export const getLastEvent = async (childId: string, eventType: 'food' | 'sleep' | 'diaper') => {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(
      eventsRef,
      where('childId', '==', childId), // חיפוש לפי הילד
      where('type', '==', eventType),
      orderBy('timestamp', 'desc'), 
      limit(1) 
    );
    // ... לוגיקת שליפה ...
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null; 
  } catch (error) {
    return null;
  }
};

// 💡 שונה userId ל-childId
export const getRecentHistory = async (childId: string) => {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const q = query(
      eventsRef,
      where('childId', '==', childId), // חיפוש לפי הילד
      orderBy('timestamp', 'desc'),
      limit(20) 
    );
    // ... לוגיקת שליפה ...
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
      };
    });
  } catch (error) {
    return [];
  }
};

// ----------------------------------------------------
// 3. פונקציית עזר לתצוגה
// ----------------------------------------------------

export const formatTimeFromTimestamp = (timestamp: any): string => {
  if (!timestamp) return '--:--';
  
  let date: Date;
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }

  return date.toLocaleTimeString('he-IL', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};


// ----------------------------------------------------
// 4. ניהול B2B (דוחות גן)
// ----------------------------------------------------

export const saveGardenReport = async (reportData: {
    childId: string;
    gardenId: string;
    caregiverId: string;
    reportDate: Date;
    content: string; 
    type: 'daily' | 'weekly';
}) => {
    try {
        const reportsRef = collection(db, GARDEN_REPORTS_COLLECTION);
        await addDoc(reportsRef, {
            ...reportData,
            reportDate: Timestamp.fromDate(reportData.reportDate),
            createdAt: new Date(),
        });
        return true;
    } catch (e) {
        throw e;
    }
}