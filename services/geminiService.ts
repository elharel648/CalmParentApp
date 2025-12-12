// services/geminiService.ts
import { hasEntitlement } from './subscriptionService';
// ⚠️ ייבוא הנדרש להשתמש ב-Date ו-Timestamp בצורה נכונה
import { Timestamp } from 'firebase/firestore'; 

// ⚠️ אל תשמור מפתחות בקוד. עדיף דרך app.config / env
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;
const MODEL_NAME = 'gemini-1.5-flash'; 

/**
 * פונקציה כללית לשליחת בקשה ל-Gemini API
 */
const callGeminiApi = async (prompt: string) => {
  if (!API_KEY) {
    return { tip: 'שגיאת מערכת: מפתח API חסר.' };
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { tip: text ? String(text).trim() : 'לא הצלחתי לייצר תובנה.' };
  } catch (e) {
    return { tip: 'בעיית תקשורת. בדקו אינטרנט ונסו שוב.' };
  }
};

/**
 * 💡 B2C: יצירת תובנות חכמות להורים על בסיס נתונים (Premium)
 * @param childProfile - נתונים קריטיים על הילד (גיל, שם)
 */
export const getAIPrediction = async (
  activities: any[],
  userId: string,
  childProfile: { name: string, ageMonths: number } 
) => {
  try {
    // Paywall - תובנות AI זמינות רק למנויי פרימיום ומעלה
    const allowed = await hasEntitlement(userId, 'aiInsights');
    if (!allowed) {
      return { tip: '🔒 **שדרגו לפרימיום** כדי לקבל תובנות AI מותאמות ואישיות (מודול Second Brain).' };
    }

    if (!activities || activities.length < 5) { 
      return { tip: `כדי שאוכל לתת תובנות חכמות ל${childProfile.name}, תעדו לפחות 5 פעולות ביומיים האחרונים :)` };
    }

    const historyText = activities
      .map((a) => `- ${a.type} (${a.amount || ''}) at ${new Date(a.timestamp).toLocaleString('he-IL', { timeStyle: 'short', dateStyle: 'short' })}`)
      .join('\n');

    const prompt = `
את/ה יועץ שינה והתפתחות תינוקות מומחה שנותן טיפים קצרים ומדויקים להורים עייפים.
זהו יומן הפעילות של הילד: ${childProfile.name}, בן/בת ${childProfile.ageMonths} חודשים.
... [שאר הפרומפט] ...
החזר/י **טקסט בעברית בלבד** וללא כל הקדמה נוספת.`;

    return callGeminiApi(prompt);
  } catch (e) {
    return { tip: 'שגיאה כללית בחישוב תובנת AI.' };
  }
};

/**
 * 📝 B2B: יצירת דו"ח יומי מקיף מהגן להורים (Garden/Pro)
 */
export const generateDailyGardenReport = async (
  dailyActivities: any[],
  childProfile: { name: string, ageMonths: number },
  caregiverName: string,
  gardenId: string, // קריטי ל-B2B
) => {
  // בדיקת זכאות של הגן/מטפלת ליצור דוחות (ניתן לבצע בדיקת מנוי גן כאן)
  
  if (!dailyActivities || dailyActivities.length === 0) {
    return { report: 'אין נתונים ליום זה ליצירת דו"ח.' };
  }

  // סיכום הנתונים המספריים
  const sleepSummary = dailyActivities.filter(a => a.type === 'שינה').map(s => {
    const start = new Date(s.timestamp).toLocaleTimeString('he-IL');
    const end = s.endTime ? new Date(s.endTime).toLocaleTimeString('he-IL') : 'עדיין ישן';
    return `שינה: מ-${start} עד ${end}`;
  }).join('; ');
  
  const feedingSummary = dailyActivities.filter(a => a.type === 'אכילה' || a.type === 'הנקה').map(f => {
    return `${f.type} (${f.amount || ''} ${f.unit || ''}) בשעה ${new Date(f.timestamp).toLocaleTimeString('he-IL')}`;
  }).join('; ');

  // נתונים גולמיים
  const historyText = dailyActivities
      .map((a) => `- ${a.type} (${a.amount || ''}) at ${new Date(a.timestamp).toLocaleString('he-IL', { timeStyle: 'short', dateStyle: 'short' })}. הערה: ${a.note || ''}`)
      .join('\n');
  
  const prompt = `
את/ה מחולל דוחות מקצועי לגני ילדים. ... [שאר הפרומפט] ...
החזר/י את הדו"ח המלא **בעברית בלבד**, מסודר עם כותרות מתאימות.`;

  return callGeminiApi(prompt);
};