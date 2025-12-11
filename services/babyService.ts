import { db, auth } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp, 
  updateDoc, 
  doc, 
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

export type BabyData = {
  id?: string;
  name: string;
  birthDate: any;
  gender: 'boy' | 'girl' | 'other';
  parentId: string;
  photoUrl?: string;
  stats?: {
    height?: string;
    weight?: string;
    headCircumference?: string;
  };
  album?: { [key: number]: string };
  milestones?: { title: string; date: any }[];
  vaccines?: { [key: string]: boolean }; 
  customVaccines?: { id: string; name: string; isDone: boolean }[]; 
};

// --- קריאת נתונים ---
export const getBabyData = async (): Promise<BabyData | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  const q = query(collection(db, 'babies'), where('parentId', '==', user.uid));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const docData = snapshot.docs[0].data();
    return { id: snapshot.docs[0].id, ...docData } as BabyData;
  }
  return null;
};

export const updateBabyData = async (babyId: string, dataToUpdate: any) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, dataToUpdate);
};

// --- פונקציה חדשה: הוספת רשומת יומן (עם ערך אמיתי) ---
export const addDailyLogEntry = async (type: 'sleep' | 'food' | 'general', value: number) => {
  const user = auth.currentUser;
  if (!user) return;
  await addDoc(collection(db, 'dailyLogs'), {
    parentId: user.uid,
    timestamp: Timestamp.now(),
    type: type, 
    value: value, // לדוגמה: 300 מ"ל, 1.5 שעות
  });
};

// --- פונקציה חכמה לדוחות: מחליפה את getWeeklyActivity ---
export const getReportData = async (range: 'week' | 'month' | 'day', reportType: 'sleep' | 'food' | 'general') => {
  const user = auth.currentUser;
  if (!user) return { labels: [], data: [], summary: 0 };

  const today = new Date();
  let startDate: Date;
  let labelLength: number;
  let timeFormat: 'day' | 'hour' | 'monthDay';

  if (range === 'day') {
      // 24 שעות אחרונות
      startDate = new Date(today.getTime() - (24 * 60 * 60 * 1000));
      labelLength = 24;
      timeFormat = 'hour';
  } else if (range === 'month') {
      // 30 ימים אחרונים
      startDate = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
      labelLength = 30;
      timeFormat = 'monthDay';
  } else { // 'week' (7 ימים אחרונים)
      startDate = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
      labelLength = 7;
      timeFormat = 'day';
  }

  const q = query(
    collection(db, 'dailyLogs'),
    where('parentId', '==', user.uid),
    where('type', '==', reportType), // סינון לפי סוג (שינה/אוכל)
    where('timestamp', '>=', Timestamp.fromDate(startDate))
  );

  const snapshot = await getDocs(q);
  
  // מבנה נתונים לסכומים יומיים/שעתיים
  const aggregates: { [key: string]: { sum: number, count: number } } = {};
  const dayNames = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];

  // אתחול מערך התוצאות
  const results: { key: string, sum: number, count: number }[] = [];
  for (let i = 0; i < labelLength; i++) {
    const d = new Date(today.getTime() - ((labelLength - 1 - i) * 24 * 60 * 60 * 1000));
    let key = '';
    let label = '';
    
    if (timeFormat === 'day') {
        key = d.getDate().toString();
        label = dayNames[d.getDay()];
    } else if (timeFormat === 'monthDay') {
        key = d.getDate().toString();
        label = d.getDate().toString();
    } else { // hour
        key = (i).toString();
        label = `${i}:00`;
    }
    
    aggregates[key] = { sum: 0, count: 0 };
    results.push({ key, sum: 0, count: 0 }); // כדי לשמור על סדר נכון
  }

  // ספירת וסיכום רשומות
  snapshot.forEach(doc => {
    const entry = doc.data();
    const date = entry.timestamp.toDate();
    let key: string;
    
    if (timeFormat === 'day') {
        key = date.getDate().toString();
    } else if (timeFormat === 'monthDay') {
        key = date.getDate().toString();
    } else { // hour
        key = date.getHours().toString();
    }

    // מציאת הפריט המתאים במערך ה-results
    const resultItem = results.find(item => {
        if (timeFormat === 'day' || timeFormat === 'monthDay') return item.key === key;
        // ל-day format אנחנו צריכים לדעת איזה יום בשבוע זה, אבל ה-key הוא רק המספר.
        // לשם הפשטות, נסתמך על זה שהיומן מסודר כרונולוגית
        return false; // פשוט נסמוך על הצבירה ב-aggregates
    });
    
    // צבירה
    if (!aggregates[key]) {
        aggregates[key] = { sum: 0, count: 0 };
    }
    aggregates[key].sum += entry.value;
    aggregates[key].count++;
  });
  
  // יצירת מערך סופי לגרף (לפי ממוצע)
  const finalLabels = Object.keys(aggregates).map(k => {
      if (timeFormat === 'day') {
          // מציאת יום בשבוע לפי המיקום
          const d = new Date(today.getTime() - ((labelLength - 1 - results.findIndex(r => r.key === k)) * 24 * 60 * 60 * 1000));
          return dayNames[d.getDay()];
      }
      return k;
  });

  const finalData = Object.values(aggregates).map(agg => agg.count > 0 ? parseFloat((agg.sum / agg.count).toFixed(1)) : 0);
  const totalSum = Object.values(aggregates).reduce((total, agg) => total + agg.sum, 0);
  
  return { labels: finalLabels, data: finalData, totalSum, totalCount: snapshot.docs.length };
};


// --- פונקציות קיימות (שומרות על מבנה) ---
export const saveAlbumImage = async (babyId: string, month: number, base64Image: string) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, {
    [`album.${month}`]: base64Image
  });
};

export const addMilestone = async (babyId: string, title: string, date: Date) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, {
    milestones: arrayUnion({ title, date: Timestamp.fromDate(date) })
  });
};

export const removeMilestone = async (babyId: string, milestoneObject: any) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, {
    milestones: arrayRemove(milestoneObject)
  });
};

export const toggleVaccineStatus = async (babyId: string, currentVaccines: any, vaccineKey: string) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  const newVal = !currentVaccines?.[vaccineKey];
  await updateDoc(babyRef, {
    [`vaccines.${vaccineKey}`]: newVal
  });
};

export const addCustomVaccine = async (babyId: string, vaccineName: string) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  const newVaccine = { id: Date.now().toString(), name: vaccineName, isDone: false };
  await updateDoc(babyRef, {
    customVaccines: arrayUnion(newVaccine)
  });
};

export const removeCustomVaccine = async (babyId: string, vaccineObject: any) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, {
    customVaccines: arrayRemove(vaccineObject)
  });
};

export const toggleCustomVaccine = async (babyId: string, allCustomVaccines: any[], vaccineId: string) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  
  const updatedList = allCustomVaccines.map(v => 
    v.id === vaccineId ? { ...v, isDone: !v.isDone } : v
  );
  
  await updateDoc(babyRef, { customVaccines: updatedList });
};

export const checkIfBabyExists = async () => {
  const user = auth.currentUser;
  if (!user) return false;
  const q = query(collection(db, 'babies'), where('parentId', '==', user.uid));
  const snap = await getDocs(q);
  return !snap.empty;
};

export const saveBabyProfile = async (name: string, birthDate: Date, gender: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user');
  await addDoc(collection(db, 'babies'), {
    name, birthDate, gender, parentId: user.uid, createdAt: Timestamp.now(),
    stats: { weight: '0', height: '0', headCircumference: '0' },
    milestones: [],
    album: {},
    vaccines: {},
    customVaccines: []
  });
};