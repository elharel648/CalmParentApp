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
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

// --- הגדרות קולקציה קבועות ---
const EVENTS_COLLECTION = 'events';
const PROFILES_COLLECTION = 'babies'; // Changed from 'child_profiles' to match babyService.ts
const GARDEN_REPORTS_COLLECTION = 'garden_reports';

// --- ממשקים (Types) ---
interface ChildProfile {
  name: string;
  birthDate: Date;
  parentId: string;
  childId: string;
  photoUrl?: string;
}

// ----------------------------------------------------
// 1. ניהול פרופיל הילד (נדרש עבור HomeScreen ו-AI)
// ----------------------------------------------------

export const getChildProfile = async (userId: string): Promise<ChildProfile | null> => {
  try {
    // First try to find baby by user's UID
    let q = query(collection(db, PROFILES_COLLECTION), where('parentId', '==', userId), limit(1));
    let querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();

      return {
        name: data.name || 'תינוק',
        birthDate: data.birthDate instanceof Timestamp ? data.birthDate.toDate() : new Date(data.birthDate),
        parentId: userId,
        childId: docSnap.id,
        photoUrl: data.photoUrl || undefined,
      };
    }

    // If not found, check if user belongs to a family
    const userDoc = await getDoc(doc(db, 'users', userId));
    const familyId = userDoc.data()?.familyId;

    if (familyId) {
      const familyDoc = await getDoc(doc(db, 'families', familyId));
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        const babyId = familyData?.babyId;
        const creatorId = familyData?.createdBy;

        // Try to get baby directly by ID
        if (babyId) {
          const babyDoc = await getDoc(doc(db, PROFILES_COLLECTION, babyId));
          if (babyDoc.exists()) {
            const data = babyDoc.data();
            return {
              name: data.name || 'תינוק',
              birthDate: data.birthDate instanceof Timestamp ? data.birthDate.toDate() : new Date(data.birthDate),
              parentId: creatorId,
              childId: babyDoc.id,
              photoUrl: data.photoUrl || undefined,
            };
          }
        }

        // Fallback: find baby by family creator
        if (creatorId && creatorId !== userId) {
          q = query(collection(db, PROFILES_COLLECTION), where('parentId', '==', creatorId), limit(1));
          querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            return {
              name: data.name || 'תינוק',
              birthDate: data.birthDate instanceof Timestamp ? data.birthDate.toDate() : new Date(data.birthDate),
              parentId: creatorId,
              childId: docSnap.id,
              photoUrl: data.photoUrl || undefined,
            };
          }
        }
      }
    }
    return null;
  } catch {
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

    // Get current user info for reporter badge
    const currentUser = auth.currentUser;
    const reporterName = currentUser?.displayName || 'אנונימי';
    const reporterPhotoUrl = currentUser?.photoURL || null;

    const docRef = await addDoc(eventsRef, {
      userId,
      childId, // 🔑 קריטי לשיתוף ולריבוי ילדים
      creatorId: userId, // 🔑 נדרש עבור security rules
      reporterName, // 👤 שם המדווח
      reporterPhotoUrl, // 📸 תמונת המדווח
      ...data,
      timestamp
    });
    return true;
  } catch (error) {
    throw error;
  }
};

// 💡 שונה userId ל-childId + תמיכה ב-creatorId
export const getLastEvent = async (childId: string, eventType: 'food' | 'sleep' | 'diaper', creatorId?: string) => {
  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);

    // 1. Query by childId
    const q1 = query(
      eventsRef,
      where('childId', '==', childId), // חיפוש לפי הילד
      where('type', '==', eventType),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const snap1 = await getDocs(q1);
    let doc1 = !snap1.empty ? snap1.docs[0] : null;

    // 2. Query by creatorId (fallback for old data)
    let doc2 = null;
    if (creatorId) {
      const q2 = query(
        eventsRef,
        where('userId', '==', creatorId),
        where('type', '==', eventType),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      const snap2 = await getDocs(q2);
      doc2 = !snap2.empty ? snap2.docs[0] : null;
    }

    // Compare and return the latest
    if (doc1 && doc2) {
      const t1 = doc1.data().timestamp instanceof Timestamp ? doc1.data().timestamp.toMillis() : new Date(doc1.data().timestamp).getTime();
      const t2 = doc2.data().timestamp instanceof Timestamp ? doc2.data().timestamp.toMillis() : new Date(doc2.data().timestamp).getTime();
      return t1 > t2 ? { id: doc1.id, ...doc1.data() } : { id: doc2.id, ...doc2.data() };
    } else if (doc1) {
      return { id: doc1.id, ...doc1.data() };
    } else if (doc2) {
      return { id: doc2.id, ...doc2.data() };
    }

    return null;
  } catch {
    return null;
  }
};

// 💡 Query ONLY by childId - this is the correct behavior for per-child data
export const getRecentHistory = async (childId: string, _creatorId?: string) => {
  if (!childId) {
    return [];
  }

  try {
    const eventsRef = collection(db, EVENTS_COLLECTION);

    // Query ONLY by childId - each child has their own events
    // Note: No orderBy to avoid composite index requirement
    const q = query(
      eventsRef,
      where('childId', '==', childId),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
      };
    });

    // Sort client-side (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Return top 30
    return events.slice(0, 30);
  } catch {
    return [];
  }
};

// Delete event by ID
export const deleteEvent = async (eventId: string) => {
  try {
    const eventRef = doc(db, EVENTS_COLLECTION, eventId);
    await deleteDoc(eventRef);
    return true;
  } catch (error) {
    throw error;
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