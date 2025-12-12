// /services/plans.ts (ודא שהקובץ קיים)

export type PlanId = 'free' | 'premium' | 'family' | 'pro' | 'garden_b2b';

export interface Entitlements {
  aiInsights: boolean;
  maxChildren: number;
  maxSharedUsers: number;
  gardenReports: boolean;
}

// 🔑 הגדרות הזכויות לכל מנוי, כפי שהוגדר במודל העסקי שלך
export const PLAN_ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    aiInsights: false,
    maxChildren: 1,
    maxSharedUsers: 2, // הורה + מטפל 1
    gardenReports: false,
  },
  premium: { // הורה רגוע+ (19.90–24.90 ₪/חודש)
    aiInsights: true,
    maxChildren: 3,
    maxSharedUsers: 4, 
    gardenReports: false,
  },
  family: {
    aiInsights: true,
    maxChildren: 99, 
    maxSharedUsers: 99, 
    gardenReports: true, 
  },
  pro: {
    aiInsights: true,
    maxChildren: 99,
    maxSharedUsers: 99,
    gardenReports: true,
  },
  garden_b2b: { // מנוי לגן
    aiInsights: false, 
    maxChildren: 999,
    maxSharedUsers: 99,
    gardenReports: true,
  }
};