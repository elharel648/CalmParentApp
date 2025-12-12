// services/subscriptionService.ts
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { PlanId, PLAN_ENTITLEMENTS, Entitlements } from './plans'; // ייבוא מהקובץ החדש

const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
let DEV_PLAN: PlanId = 'free'; // משתנה ל-Dev Test

export const setDevPlan = (plan: PlanId) => {
  DEV_PLAN = plan;
};

/**
 * שליפת נתוני המנוי מ-Firebase (או שימוש בתוכנית דמה ב-Dev)
 */
const getSubscriptionFromFirebase = async (userId: string): Promise<PlanId> => {
    // 💡 שימוש בתוכנית דמה אם המערכת מוגדרת ל-Dev
    if (process.env.NODE_ENV !== 'production' && DEV_PLAN !== 'free') {
        return DEV_PLAN;
    }
    
    try {
        const docRef = doc(db, SUBSCRIPTIONS_COLLECTION, userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const expiryDate = data.expiryDate as Timestamp;
            
            // בדיקה האם המנוי פעיל ולא פג תוקף
            if (data.isActive && expiryDate && expiryDate.toDate() > new Date()) {
                return (data.level as PlanId) || 'free'; 
            }
        }
    } catch (e) {
        // שגיאה בשליפה - מחזירים חינם
    }
    
    return 'free';
};

export const getPlanId = async (userId: string): Promise<PlanId> => {
  return await getSubscriptionFromFirebase(userId);
};

export const getEntitlements = async (userId: string): Promise<Entitlements> => {
  const planId = await getPlanId(userId);
  return PLAN_ENTITLEMENTS[planId] || PLAN_ENTITLEMENTS.free;
};

export const hasEntitlement = async (
  userId: string,
  key: keyof Entitlements
): Promise<boolean> => {
  const ent = await getEntitlements(userId);
  return !!ent[key]; 
};

export const isPremiumUser = async (userId: string): Promise<boolean> => {
    const planId = await getPlanId(userId);
    return planId !== 'free';
}

export const getMaxSharedUsers = async (userId: string): Promise<number> => {
    const ent = await getEntitlements(userId);
    return ent.maxSharedUsers;
}