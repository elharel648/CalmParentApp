import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig'; 

// פונקציה לשמירת אירוע חדש (אוכל/שינה/חיתול)
export const saveEventToFirebase = async (userId: string, data: any) => {
  try {
    const eventsRef = collection(db, 'events');
    await addDoc(eventsRef, {
      userId,
      ...data, 
      timestamp: data.timestamp || new Date() 
    });
    console.log("Event saved to Firebase successfully");
    return true;
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
};

// פונקציה לשליפת האירוע האחרון מסוג מסוים (עבור "מבט מהיר")
export const getLastEvent = async (userId: string, eventType: 'food' | 'sleep' | 'diaper') => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('userId', '==', userId),
      where('type', '==', eventType),
      orderBy('timestamp', 'desc'), 
      limit(1) 
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null; 
  } catch (error) {
    console.error(`Error getting last ${eventType} event:`, error);
    return null;
  }
};

// --- פונקציה חדשה: שליפת היסטוריה אחרונה עבור ה-AI ---
export const getRecentHistory = async (userId: string) => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'), // מהחדש לישן
      limit(20) // לוקחים 20 אחרונים לניתוח
    );

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // המרה בטוחה של timestamp לתאריך רגיל
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
      };
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return [];
  }
};

// פונקציית עזר להמרת זמן של פיירבייס לשעה יפה (14:30)
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