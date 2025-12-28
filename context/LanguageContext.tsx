import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Language } from '../types';

const LANGUAGE_STORAGE_KEY = '@CalmParent:language';

// Translations
const translations: Record<Language, Record<string, string>> = {
  he: {
    // Common
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.delete': 'מחק',
    'common.edit': 'ערוך',
    'common.close': 'סגור',
    'common.loading': 'טוען...',
    'common.error': 'שגיאה',
    'common.retry': 'נסה שוב',
    
    // Home Screen
    'home.greeting.morning': 'בוקר טוב',
    'home.greeting.afternoon': 'צהריים טובים',
    'home.greeting.evening': 'ערב טוב',
    'home.greeting.night': 'לילה טוב',
    'home.quickActions': 'פעולות מהירות',
    'home.dailyTimeline': 'סדר היום',
    'home.shareSummary': 'שתף סיכום יומי',
    
    // Stats
    'stats.title': 'סטטיסטיקות',
    'stats.feedings': 'האכלות',
    'stats.sleep': 'שעות שינה',
    'stats.diapers': 'חיתולים',
    'stats.supplements': 'תוספים',
    'stats.editOrder': 'ערוך סדר',
    'stats.comparison': 'השוואה לשבוע שעבר',
    'stats.goals': 'יעדים שבועיים',
    
    // Settings
    'settings.language': 'שפה',
    'settings.selectLanguage': 'בחירת שפה',
    'settings.hebrew': 'עברית',
    'settings.english': 'English',
    
    // Notifications
    'notifications.feedReminder': 'הגיע הזמן להאכיל!',
    'notifications.lastFeed': 'האכלה אחרונה',
    'notifications.firstFeed': 'האכלה ראשונה',
    'notifications.notYetToday': 'עדיין לא תועד היום',
    'notifications.vitaminD': 'ויטמין D',
    'notifications.iron': 'ברזל',
    
    // Timeline
    'timeline.empty': 'אין אירועים להצגה',
    'timeline.loading': 'טוען סדר יום...',
    
    // Time
    'time.now': 'עכשיו',
    'time.minutesAgo': 'לפני {count} דקות',
    'time.hoursAgo': 'לפני {count} שעות',
    'time.daysAgo': 'לפני {count} ימים',
    'time.yesterday': 'אתמול',
    
    // Quick Actions
    'actions.food': 'אוכל',
    'actions.sleep': 'שינה',
    'actions.diaper': 'החתלה',
    'actions.supplements': 'תוספים',
    'actions.whiteNoise': 'רעש לבן',
    'actions.sos': 'SOS',
    'actions.health': 'בריאות',
    'actions.growth': 'מעקב גדילה',
    'actions.milestones': 'אבני דרך',
    'actions.magicMoments': 'רגעים קסומים',
    'actions.tools': 'כלים',
    'actions.teeth': 'שיניים',
    'actions.nightLight': 'פנס לילה',
    'actions.custom': 'הוספה',
    'actions.active.food': 'מאכילה',
    'actions.active.sleep': 'ישנ/ה',
    
    // Age
    'age.days': '{count} ימים',
    'age.months': '{count} חודשים',
    'age.years': '{count} שנה',
    'age.yearsMonths': '{count} שנה ו-{months} חודשים',
    
    // Stats Details
    'stats.comparison.yesterday': 'השוואה לאתמול',
    'stats.comparison.lastWeek': 'השוואה לשבוע שעבר',
    'stats.comparison.lastMonth': 'השוואה לחודש שעבר',
    'stats.goals.daily': 'יעדים יומיים',
    'stats.goals.weekly': 'יעדים שבועיים',
    'stats.goals.monthly': 'יעדים חודשיים',
    'stats.streak': '{count} ימים רצופים',
    
    // Tools
    'tools.title': 'ארגז כלים',
    'tools.sleepCalculator': 'מחשבון שינה',
    'tools.sleepCalculator.subtitle': 'מתי להשכיב לישון?',
    'tools.checklist': 'צ\'קליסט הרגעה',
    'tools.checklist.subtitle': 'תינוק בוכה? בוא נבדוק',
    
    // Account
    'account.title': 'חשבון',
    'account.family': 'משפחה',
    'account.inviteFamily': 'הזמן למשפחה',
    'account.inviteFamily.subtitle': 'קוד לגישה מלאה לכל הילדים',
    'account.inviteGuest': 'הזמן אורח',
    'account.inviteGuest.subtitle': 'קוד לגישה ל-24 שעות בלבד',
    'account.joinWithCode': 'הצטרף עם קוד',
    'account.joinWithCode.subtitle': 'המערכת מזהה אוטומטית את סוג הקוד',
    
    // Empty States
    'empty.noChild': 'בחר ילד לצפייה בסטטיסטיקות',
    'empty.noEvents': 'אין אירועים להצגה',
    
    // Date/Time
    'date.today': 'היום',
    'date.yesterday': 'אתמול',
    'date.custom': 'מותאם',
    'date.range': '{start} - {end}',
    
    // Feed Types
    'feed.bottle': 'בקבוק',
    'feed.breast': 'הנקה',
    'feed.pumping': 'שאיבה',
    'feed.solids': 'מוצקים',
    'feed.amount': '{amount} מ"ל',
    
    // Sleep
    'sleep.duration': '{hours} שע\' {minutes} דק\'',
    'sleep.minutes': '{minutes} דקות',
    
    // Diaper
    'diaper.wet': 'רטוב',
    'diaper.dirty': 'מלוכלך',
    'diaper.mixed': 'מעורב',
    
    // Tracking Modal
    'tracking.food.title': 'תיעוד אוכל',
    'tracking.sleep.title': 'תיעוד שינה',
    'tracking.diaper.title': 'החלפת חיתול',
    'tracking.breast': 'הנקה',
    'tracking.bottle': 'בקבוק',
    'tracking.solids': 'מזון לתינוקות',
    'tracking.pumping': 'שאיבה',
    'tracking.today': 'היום',
    'tracking.start': 'התחלה',
    'tracking.end': 'סיום',
    'tracking.done': 'אישור',
    'tracking.howMuch': 'כמה אכלנו?',
    'tracking.left': 'שמאל',
    'tracking.right': 'ימין',
    'tracking.total': 'סה"כ',
    'tracking.pumpingAmount': 'כמה נשאב?',
    'tracking.whatAte': 'מה אכלנו?',
    'tracking.note': 'הערה (אופציונלי)',
    'tracking.hours': 'שעות',
    'tracking.duration': 'משך',
    'tracking.timer': 'טיימר',
    'tracking.minutes': 'דקות',
    'tracking.whatHappened': 'מה היה?',
    'tracking.both': 'שניהם',
    'tracking.saveError': 'לא ניתן לשמור את הנתונים. אנא נסה שנית.',
    
    // Account/Settings
    'account.editFamilyName': 'ערוך שם משפחה',
    'account.enterNewFamilyName': 'הזן שם חדש למשפחה',
    'account.editFamilyNameIOS': 'הפונקציה זמינה רק ב-iOS',
    'account.error': 'שגיאה',
    'account.couldNotSavePhoto': 'לא הצלחנו לשמור את התמונה',
    'account.couldNotSaveName': 'לא הצלחנו לשמור את השם',
    'account.upgradePremium': 'שדרג ל-Premium',
    'account.premiumSubtitle': 'גישה לכל התכונות ודוחות',
    'account.monthly': 'חודשי',
    'account.perMonth': 'לחודש',
    'account.save40': 'חסכון 40%',
    'account.yearly': 'שנתי',
    'account.perYear': 'לשנה (₪11.60/חודש)',
    'account.maybeLater': 'אולי אחר כך',
    'account.deleteAccount': 'מחיקת חשבון',
    'account.deleteAccountWarning': 'פעולה זו בלתי הפיכה',
    'account.theChild': 'הילד',
    
    // Days of week
    'weekday.sun': 'א',
    'weekday.mon': 'ב',
    'weekday.tue': 'ג',
    'weekday.wed': 'ד',
    'weekday.thu': 'ה',
    'weekday.fri': 'ו',
    'weekday.sat': 'ש',
    
    // Premium Features
    'premium.detailedReports': 'דוחות מפורטים ותובנות חכמות',
    'premium.exportData': 'ייצוא נתונים ל-PDF ואקסל',
    'premium.unlimitedSharing': 'שיתוף ללא הגבלה למשפחה ובייביסיטר',
    'premium.autoBackup': 'גיבוי אוטומטי ותמיכה VIP',
    'premium.noAds': 'ללא פרסומות לעולם',
    'premium.comingSoon': 'בקרוב!',
    'premium.comingSoonMessage': 'רכישת Premium תתאפשר בקרוב 🎉',
    'premium.subscribeYearly': 'הירשם ל-Premium שנתי',
    'premium.subscribeMonthly': 'הירשם ל-Premium חודשי',
    'premium.members': 'חברים',
    'premium.familyOf': 'משפחת',
    'account.myUser': 'המשתמש שלי',
    
    // Tracking Modal Additional
    'tracking.notSpecified': 'לא צוין',
    'tracking.ml': 'מ"ל',
    'tracking.leftColon': 'שמאל',
    'tracking.rightColon': 'ימין',
    'tracking.pumpingTime': 'זמן שאיבה',
    'tracking.solidsFood': 'מזון מוצקים',
    'tracking.newSleep': 'שינה חדשה',
    'tracking.sleepDuration': 'משך שינה',
    'tracking.pressToStop': 'לחץ לעצור',
    'tracking.pressToStart': 'לחץ להתחיל',
    'tracking.enterAmount': 'הזן כמות',
    'tracking.example': 'לדוגמה',
    'tracking.forExample': 'למשל',
    
    // Settings Screen
    'settings.title': 'הגדרות',
    'settings.notifications': 'התראות ותזכורות',
    'settings.notificationsEnabled': 'התראות מופעלות',
    'settings.feedReminder': 'תזכורת אוכל',
    'settings.supplementsReminder': 'תזכורת תוספים',
    'settings.dailySummary': 'סיכום יומי',
    'settings.display': 'תצוגה והתנהגות',
    'settings.nightMode': 'מצב לילה',
    'settings.biometric': 'כניסה ביומטרית',
    'settings.privacy': 'פרטיות ותמיכה',
    'settings.privacyPolicy': 'מדיניות פרטיות',
    'settings.termsOfService': 'תנאי שימוש',
    'settings.contact': 'צור קשר',
    'settings.contactSubtitle': 'שלח מייל לצוות',
    'settings.shareFriends': 'שתף חברים',
    'settings.dangerZone': 'אזור מסוכן',
    'settings.changePassword': 'שינוי סיסמה',
    'settings.changePasswordSubtitle': 'שלח מייל לאיפוס',
    'settings.deleteCurrentChild': 'מחיקת ילד נוכחי',
    'settings.logout': 'התנתקות',
    'settings.sendMessage': 'שלח הודעה',
    'settings.hours': 'שעות',
    
    // Alerts
    'alerts.notAvailable': 'לא זמין',
    'alerts.biometricNotSupported': 'המכשיר לא תומך ב-Face ID/Touch ID או שלא הוגדר קוד גישה.',
    'alerts.authError': 'אירעה שגיאה בתהליך האימות',
    'alerts.passwordReset': 'איפוס סיסמה',
    'alerts.passwordResetQuestion': 'האם לשלוח מייל לאיפוס סיסמה לכתובת:',
    'alerts.sendEmail': 'שלח מייל',
    'alerts.sentSuccessfully': 'נשלח בהצלחה!',
    'alerts.checkEmail': 'בדוק/י את תיבת המייל שלך (גם בספאם).',
    'alerts.couldNotSendEmail': 'לא הצלחנו לשלוח את המייל.',
    'alerts.messageTooShort': 'ההודעה חייבת להכיל לפחות 10 תווים',
    'alerts.messageSent': 'קיבלנו את פנייתך ונחזור אלייך בהקדם.',
    'alerts.couldNotSendMessage': 'לא הצלחנו לשלוח את ההודעה. נסה שוב.',
    'alerts.logoutTitle': 'התנתקות',
    'alerts.logoutQuestion': 'האם את/ה בטוח/ה שברצונך להתנתק?',
    'alerts.yesLogout': 'כן, התנתק',
    'alerts.noChildSelected': 'אין ילד נבחר',
    'alerts.deleteChild': 'מחיקת',
    'alerts.deleteChildWarning': 'פעולה זו תמחק את כל הנתונים של הילד: תמונות, סטטיסטיקות, אירועים.',
    'alerts.areYouSure': 'אתה בטוח לחלוטין?',
    'alerts.irreversible': 'פעולה זו בלתי הפיכה! לא ניתן לשחזר את',
    'alerts.yesDeleteAll': 'כן, מחק הכל',
    'alerts.deleted': 'נמחק',
    'alerts.deletedAddNew': 'נמחק. הוסף ילד חדש.',
    'alerts.deletedSwitched': 'נמחק. עבר ל-',
    'alerts.couldNotDeleteChild': 'לא ניתן למחוק את הילד',
    'alerts.deleteAccountError': 'אירעה שגיאה במחיקת החשבון. נסה שוב מאוחר יותר.',
    'alerts.confirm': 'אישור',
    'alerts.lastUpdated': 'עדכון אחרון: דצמבר 2024',
    
    // Privacy Policy
    'privacy.intro': '1. מבוא',
    'privacy.collection': '2. איסוף מידע',
    'privacy.usage': '3. שימוש במידע',
    'privacy.security': '4. אבטחת מידע',
    'privacy.sharing': '5. שיתוף מידע',
    'privacy.contact': '6. יצירת קשר',
    
    // Terms of Service
    'terms.agreement': '1. הסכמה לתנאים',
    'terms.serviceDescription': '2. תיאור השירות',
    'terms.userAccount': '3. חשבון משתמש',
    'terms.allowedUse': '4. שימוש מותר',
    'terms.liability': '5. הגבלת אחריות',
    'terms.intellectualProperty': '6. קניין רוחני',
    'terms.changes': '7. שינויים בתנאים',
    'terms.contact': '8. יצירת קשר',
    
    // Timeline
    'timeline.title': 'סדר היום',
    'timeline.noRecordsToday': 'אין תיעודים להיום',
    'timeline.showLess': 'הצג פחות',
    'timeline.showMore': 'הצג {count} נוספים',
    'timeline.yesterday': 'אתמול',
    'timeline.bottle': 'בקבוק',
    'timeline.breast': 'הנקה',
    'timeline.pumping': 'שאיבה',
    'timeline.food': 'אוכל',
    'timeline.sleep': 'שינה',
    'timeline.supplement': 'תוסף',
    'timeline.iron': 'ברזל',
    'timeline.probiotic': 'פרוביוטיקה',
    
    // Header Section
    'header.galleryPermission': 'נדרשת הרשאה לגלריה',
    'header.addChild': 'הוסף ילד',
    'header.addChildTitle': 'הוספת ילד',
    'header.registerNewChild': 'רישום ילד חדש',
    'header.registerNewChildSubtitle': 'צור פרופיל חדש לילד',
    'header.joinWithCode': 'הצטרפות עם קוד',
    'header.joinWithCodeSubtitle': 'קיבלת קוד מהשותף?',
    
    // Share
    'share.message': 'היי! אני משתמש/ת ב-CalmParent וזה ממש עוזר לי לנהל את הטיפול בבייבי. ממליץ/ה בחום! 👶📱',
  },
  en: {
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
    
    // Home Screen
    'home.greeting.morning': 'Good Morning',
    'home.greeting.afternoon': 'Good Afternoon',
    'home.greeting.evening': 'Good Evening',
    'home.greeting.night': 'Good Night',
    'home.quickActions': 'Quick Actions',
    'home.dailyTimeline': 'Daily Timeline',
    'home.shareSummary': 'Share Daily Summary',
    
    // Stats
    'stats.title': 'Statistics',
    'stats.feedings': 'Feedings',
    'stats.sleep': 'Sleep Hours',
    'stats.diapers': 'Diapers',
    'stats.supplements': 'Supplements',
    'stats.editOrder': 'Edit Order',
    'stats.comparison': 'Comparison to Last Week',
    'stats.goals': 'Weekly Goals',
    
    // Settings
    'settings.language': 'Language',
    'settings.selectLanguage': 'Select Language',
    'settings.hebrew': 'עברית',
    'settings.english': 'English',
    
    // Notifications
    'notifications.feedReminder': 'Time to Feed!',
    'notifications.lastFeed': 'Last Feeding',
    'notifications.firstFeed': 'First Feeding',
    'notifications.notYetToday': 'Not recorded today yet',
    'notifications.vitaminD': 'Vitamin D',
    'notifications.iron': 'Iron',
    
    // Timeline
    'timeline.empty': 'No events to display',
    'timeline.loading': 'Loading timeline...',
    
    // Time
    'time.now': 'Now',
    'time.minutesAgo': '{count} minutes ago',
    'time.hoursAgo': '{count} hours ago',
    'time.daysAgo': '{count} days ago',
    'time.yesterday': 'Yesterday',
    'time.at': 'at',
    
    // Quick Actions
    'actions.food': 'Food',
    'actions.sleep': 'Sleep',
    'actions.diaper': 'Diaper',
    'actions.supplements': 'Supplements',
    'actions.whiteNoise': 'White Noise',
    'actions.sos': 'SOS',
    'actions.health': 'Health',
    'actions.growth': 'Growth',
    'actions.milestones': 'Milestones',
    'actions.magicMoments': 'Magic Moments',
    'actions.tools': 'Tools',
    'actions.teeth': 'Teeth',
    'actions.nightLight': 'Night Light',
    'actions.custom': 'Add',
    'actions.active.food': 'Feeding',
    'actions.active.sleep': 'Sleeping',
    
    // Age
    'age.days': '{count} days',
    'age.months': '{count} months',
    'age.years': '{count} year',
    'age.yearsMonths': '{count} year and {months} months',
    
    // Stats Details
    'stats.comparison.yesterday': 'Comparison to Yesterday',
    'stats.comparison.lastWeek': 'Comparison to Last Week',
    'stats.comparison.lastMonth': 'Comparison to Last Month',
    'stats.goals.daily': 'Daily Goals',
    'stats.goals.weekly': 'Weekly Goals',
    'stats.goals.monthly': 'Monthly Goals',
    'stats.streak': '{count} days streak',
    
    // Tools
    'tools.title': 'Toolbox',
    'tools.sleepCalculator': 'Sleep Calculator',
    'tools.sleepCalculator.subtitle': 'When to put to sleep?',
    'tools.checklist': 'Calming Checklist',
    'tools.checklist.subtitle': 'Baby crying? Let\'s check',
    
    // Account
    'account.title': 'Account',
    'account.family': 'Family',
    'account.inviteFamily': 'Invite to Family',
    'account.inviteFamily.subtitle': 'Code for full access to all children',
    'account.inviteGuest': 'Invite Guest',
    'account.inviteGuest.subtitle': 'Code for 24-hour access only',
    'account.joinWithCode': 'Join with Code',
    'account.joinWithCode.subtitle': 'System automatically detects code type',
    
    // Empty States
    'empty.noChild': 'Select a child to view statistics',
    'empty.noEvents': 'No events to display',
    
    // Date/Time
    'date.today': 'Today',
    'date.yesterday': 'Yesterday',
    'date.custom': 'Custom',
    'date.range': '{start} - {end}',
    
    // Feed Types
    'feed.bottle': 'Bottle',
    'feed.breast': 'Breast',
    'feed.pumping': 'Pumping',
    'feed.solids': 'Solids',
    'feed.amount': '{amount} ml',
    
    // Sleep
    'sleep.duration': '{hours}h {minutes}m',
    'sleep.minutes': '{minutes} minutes',
    
    // Diaper
    'diaper.wet': 'Wet',
    'diaper.dirty': 'Dirty',
    'diaper.mixed': 'Mixed',
    
    // Tracking Modal
    'tracking.food.title': 'Log Food',
    'tracking.sleep.title': 'Log Sleep',
    'tracking.diaper.title': 'Change Diaper',
    'tracking.breast': 'Breast',
    'tracking.bottle': 'Bottle',
    'tracking.solids': 'Baby Food',
    'tracking.pumping': 'Pumping',
    'tracking.today': 'Today',
    'tracking.start': 'Start',
    'tracking.end': 'End',
    'tracking.done': 'Done',
    'tracking.howMuch': 'How much did we eat?',
    'tracking.left': 'Left',
    'tracking.right': 'Right',
    'tracking.total': 'Total',
    'tracking.pumpingAmount': 'How much pumped?',
    'tracking.whatAte': 'What did we eat?',
    'tracking.note': 'Note (optional)',
    'tracking.hours': 'Hours',
    'tracking.duration': 'Duration',
    'tracking.timer': 'Timer',
    'tracking.minutes': 'Minutes',
    'tracking.whatHappened': 'What happened?',
    'tracking.both': 'Both',
    'tracking.saveError': 'Could not save data. Please try again.',
    
    // Account/Settings
    'account.editFamilyName': 'Edit Family Name',
    'account.enterNewFamilyName': 'Enter new family name',
    'account.editFamilyNameIOS': 'This feature is only available on iOS',
    'account.error': 'Error',
    'account.couldNotSavePhoto': 'Could not save photo',
    'account.couldNotSaveName': 'Could not save name',
    'account.upgradePremium': 'Upgrade to Premium',
    'account.premiumSubtitle': 'Access to all features and reports',
    'account.monthly': 'Monthly',
    'account.perMonth': 'per month',
    'account.save40': 'Save 40%',
    'account.yearly': 'Yearly',
    'account.perYear': 'per year (₪11.60/month)',
    'account.maybeLater': 'Maybe Later',
    'account.deleteAccount': 'Delete Account',
    'account.deleteAccountWarning': 'This action is irreversible',
    'account.theChild': 'The Child',
    
    // Days of week
    'weekday.sun': 'S',
    'weekday.mon': 'M',
    'weekday.tue': 'T',
    'weekday.wed': 'W',
    'weekday.thu': 'T',
    'weekday.fri': 'F',
    'weekday.sat': 'S',
    
    // Premium Features
    'premium.detailedReports': 'Detailed reports and smart insights',
    'premium.exportData': 'Export data to PDF and Excel',
    'premium.unlimitedSharing': 'Unlimited sharing with family and babysitters',
    'premium.autoBackup': 'Automatic backup and VIP support',
    'premium.noAds': 'No ads ever',
    'premium.comingSoon': 'Coming Soon!',
    'premium.comingSoonMessage': 'Premium purchase will be available soon 🎉',
    'premium.subscribeYearly': 'Subscribe to Yearly Premium',
    'premium.subscribeMonthly': 'Subscribe to Monthly Premium',
    'premium.members': 'members',
    'premium.familyOf': 'Family of',
    'account.myUser': 'My User',
    
    // Tracking Modal Additional
    'tracking.notSpecified': 'Not specified',
    'tracking.ml': 'ml',
    'tracking.leftColon': 'Left',
    'tracking.rightColon': 'Right',
    'tracking.pumpingTime': 'Pumping time',
    'tracking.solidsFood': 'Solid food',
    'tracking.newSleep': 'New sleep',
    'tracking.sleepDuration': 'Sleep duration',
    'tracking.pressToStop': 'Press to stop',
    'tracking.pressToStart': 'Press to start',
    'tracking.enterAmount': 'Enter amount',
    'tracking.example': 'For example',
    'tracking.forExample': 'For example',
    
    // Settings Screen
    'settings.title': 'Settings',
    'settings.notifications': 'Notifications & Reminders',
    'settings.notificationsEnabled': 'Notifications Enabled',
    'settings.feedReminder': 'Feed Reminder',
    'settings.supplementsReminder': 'Supplements Reminder',
    'settings.dailySummary': 'Daily Summary',
    'settings.display': 'Display & Behavior',
    'settings.nightMode': 'Night Mode',
    'settings.biometric': 'Biometric Login',
    'settings.privacy': 'Privacy & Support',
    'settings.privacyPolicy': 'Privacy Policy',
    'settings.termsOfService': 'Terms of Service',
    'settings.contact': 'Contact Us',
    'settings.contactSubtitle': 'Send email to team',
    'settings.shareFriends': 'Share with Friends',
    'settings.dangerZone': 'Danger Zone',
    'settings.changePassword': 'Change Password',
    'settings.changePasswordSubtitle': 'Send email to reset',
    'settings.deleteCurrentChild': 'Delete Current Child',
    'settings.logout': 'Logout',
    'settings.sendMessage': 'Send Message',
    'settings.hours': 'hours',
    
    // Alerts
    'alerts.notAvailable': 'Not Available',
    'alerts.biometricNotSupported': 'Device does not support Face ID/Touch ID or passcode is not set up.',
    'alerts.authError': 'An error occurred during authentication',
    'alerts.passwordReset': 'Password Reset',
    'alerts.passwordResetQuestion': 'Send password reset email to:',
    'alerts.sendEmail': 'Send Email',
    'alerts.sentSuccessfully': 'Sent Successfully!',
    'alerts.checkEmail': 'Check your email inbox (including spam).',
    'alerts.couldNotSendEmail': 'Could not send email.',
    'alerts.messageTooShort': 'Message must contain at least 10 characters',
    'alerts.messageSent': 'We received your message and will get back to you soon.',
    'alerts.couldNotSendMessage': 'Could not send message. Please try again.',
    'alerts.logoutTitle': 'Logout',
    'alerts.logoutQuestion': 'Are you sure you want to logout?',
    'alerts.yesLogout': 'Yes, Logout',
    'alerts.noChildSelected': 'No child selected',
    'alerts.deleteChild': 'Delete',
    'alerts.deleteChildWarning': 'This action will delete all child data: photos, statistics, events.',
    'alerts.areYouSure': 'Are you absolutely sure?',
    'alerts.irreversible': 'This action is irreversible! Cannot recover',
    'alerts.yesDeleteAll': 'Yes, Delete All',
    'alerts.deleted': 'Deleted',
    'alerts.deletedAddNew': 'deleted. Add a new child.',
    'alerts.deletedSwitched': 'deleted. Switched to',
    'alerts.couldNotDeleteChild': 'Could not delete child',
    'alerts.deleteAccountError': 'An error occurred while deleting account. Please try again later.',
    'alerts.confirm': 'OK',
    'alerts.lastUpdated': 'Last Updated: December 2024',
    
    // Privacy Policy
    'privacy.intro': '1. Introduction',
    'privacy.collection': '2. Information Collection',
    'privacy.usage': '3. Information Usage',
    'privacy.security': '4. Information Security',
    'privacy.sharing': '5. Information Sharing',
    'privacy.contact': '6. Contact',
    
    // Terms of Service
    'terms.agreement': '1. Agreement to Terms',
    'terms.serviceDescription': '2. Service Description',
    'terms.userAccount': '3. User Account',
    'terms.allowedUse': '4. Permitted Use',
    'terms.liability': '5. Liability Limitation',
    'terms.intellectualProperty': '6. Intellectual Property',
    'terms.changes': '7. Changes to Terms',
    'terms.contact': '8. Contact',
    
    // Timeline
    'timeline.title': 'Daily Timeline',
    'timeline.noRecordsToday': 'No records for today',
    'timeline.showLess': 'Show Less',
    'timeline.showMore': 'Show {count} More',
    'timeline.yesterday': 'Yesterday',
    'timeline.bottle': 'Bottle',
    'timeline.breast': 'Breast',
    'timeline.pumping': 'Pumping',
    'timeline.food': 'Food',
    'timeline.sleep': 'Sleep',
    'timeline.supplement': 'Supplement',
    'timeline.iron': 'Iron',
    'timeline.probiotic': 'Probiotic',
    
    // Header Section
    'header.galleryPermission': 'Gallery permission required',
    'header.addChild': 'Add Child',
    'header.addChildTitle': 'Add Child',
    'header.registerNewChild': 'Register New Child',
    'header.registerNewChildSubtitle': 'Create a new child profile',
    'header.joinWithCode': 'Join with Code',
    'header.joinWithCodeSubtitle': 'Received a code from partner?',
    
    // Share
    'share.message': 'Hey! I\'m using CalmParent and it really helps me manage baby care. Highly recommend! 👶📱',
    
    // Time Labels
    'time.every': 'Every',
    'time.startTime': 'Start Time',
    'time.intakeTime': 'Intake Time',
    'time.summaryTime': 'Summary Time',
    'time.hour': 'hour',
    'time.hours': 'hours',
    'time.minute': 'minute',
    'time.minutes': 'minutes',
    
    // Delete Account
    'account.deletePermanent': 'Permanent Account Deletion ⚠️',
    'account.deletePermanentWarning': 'This action is irreversible and will permanently delete all your data. Are you sure?',
    'account.finalConfirmation': 'Final Confirmation',
    'account.finalConfirmationMessage': 'After deletion, the account and data cannot be recovered. Continue?',
    'account.deletePermanently': 'Delete Permanently',
    'account.reauthRequired': 'Re-authentication Required',
    'account.reauthRequiredMessage': 'For security reasons, please logout and login again before deleting the account.',
    'account.logoutNow': 'Logout Now',
    
    // Biometric
    'biometric.authenticate': 'Authenticate to enable biometric protection',
    'biometric.usePassword': 'Use Password',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('he');

  // Load language from storage and DB
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // Try AsyncStorage first
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored && (stored === 'he' || stored === 'en')) {
          setLanguageState(stored as Language);
          return;
        }

        // Try Firebase
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            const lang = data.settings?.language;
            if (lang === 'he' || lang === 'en') {
              setLanguageState(lang as Language);
              await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
              return;
            }
          }
        }
      } catch (error) {
        if (__DEV__) console.error('Error loading language:', error);
      }
    };

    loadLanguage();
  }, []);

  // Save language to storage and DB
  const setLanguage = useCallback(async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);

      // Save to Firebase
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          settings: {
            language: lang,
          },
        }, { merge: true });
      }
    } catch (error) {
      if (__DEV__) console.error('Error saving language:', error);
    }
  }, []);

  // Translation function
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = translations[language]?.[key] || key;
    
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(`{${paramKey}}`, String(paramValue));
      }, translation);
    }
    
    return translation;
  }, [language]);

  const isRTL = language === 'he';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

