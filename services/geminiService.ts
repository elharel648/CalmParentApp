import { Activity, Prediction } from '../types';

// פונקציה זמנית שמחזירה תחזית דמה כדי שהאפליקציה תעבוד
// בהמשך נחבר את זה ל-Gemini האמיתי
export const getAIPrediction = async (
  ageWeeks: number,
  activities: Activity[]
): Promise<Prediction | null> => {
  
  // מדמה המתנה של שנייה כאילו הוא "חושב"
  await new Promise(resolve => setTimeout(resolve, 1000));

  // מחזיר תחזית לדוגמה
  return {
    nextSleep: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // עוד שעתיים
    nextFeed: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(), // עוד 3 שעות
    tip: 'בגיל זה תינוקות מתחילים לזהות פרצופים, נסו לחייך אליו מקרוב!',
    alert: undefined
  };
};