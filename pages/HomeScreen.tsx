import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Anchor, Moon, Sun, Utensils, Layers, Sparkles, User, CheckCircle, Share2, Music, Droplets, Trophy } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

import { auth } from '../services/firebaseConfig';
// 🔑 ייבוא פונקציות מעודכנות
import { getLastEvent, formatTimeFromTimestamp, saveEventToFirebase, getRecentHistory, getChildProfile } from '../services/firebaseService';
import { getAIPrediction } from '../services/geminiService';
// 🔑 ייבוא פונקציות מעודכנות
import { isPremiumUser, getMaxSharedUsers } from '../services/subscriptionService'; 

import DailyTimeline from '../components/DailyTimeline';
import CalmModeModal from '../components/CalmModeModal';
import TrackingModal from '../components/TrackingModal';
import WhiteNoiseModal from '../components/WhiteNoiseModal';

const WEATHER_API_KEY = "bd5e378503939ddaee76f12ad7a97608";
const BABY_BIRTH_DATE = new Date('2023-09-12'); // ברירת מחדל אם אין פרופיל

// --- 💡 ממשק לפרופיל הילד ---
interface ChildProfile {
    id: string; // ה-childId
    name: string;
    birthDate: Date;
    ageMonths: number;
}

// --- 💡 פרופיל ילד ברירת מחדל ---
const DEFAULT_CHILD_PROFILE: ChildProfile = {
    id: 'alma_default_id', // מזהה כללי לילד יחיד
    name: 'עלמא',
    birthDate: BABY_BIRTH_DATE,
    ageMonths: 0, 
};


export default function HomeScreen({ navigation }: any) {
  const [isNightMode, setIsNightMode] = useState(false);
  const [isCalmModeOpen, setIsCalmModeOpen] = useState(false);
  const [isWhiteNoiseOpen, setIsWhiteNoiseOpen] = useState(false);
  const [trackingModalType, setTrackingModalType] = useState<'food' | 'sleep' | 'diaper' | null>(null);

  const [lastFeedTime, setLastFeedTime] = useState('--:--');
  const [lastSleepTime, setLastSleepTime] = useState('--:--');
  const [babyStatus, setBabyStatus] = useState<'sleeping' | 'awake'>('awake');
  const [currentGuardian, setCurrentGuardian] = useState('אבא');
  const [greeting, setGreeting] = useState('שלום');
  
  const [childProfile, setChildProfile] = useState<ChildProfile>(DEFAULT_CHILD_PROFILE);
  const [maxSharedUsers, setMaxSharedUsers] = useState(2); // ברירת מחדל חינם (הורה + 1)
  
  const [meds, setMeds] = useState({ vitaminD: false, iron: false });
  const [weather, setWeather] = useState({ temp: 24, city: 'תל אביב', recommendation: 'יום נעים בחוץ ☀️', loading: false });
  const [aiTip, setAiTip] = useState('אוסף נתונים...');
  const [loadingAI, setLoadingAI] = useState(false);
  const [isPremium, setIsPremium] = useState(false); 

  const user = auth.currentUser;

  useEffect(() => {
    // עדכון גיל הילד וברכה
    const now = new Date();
    const months = (now.getFullYear() - childProfile.birthDate.getFullYear()) * 12 + (now.getMonth() - childProfile.birthDate.getMonth());
    setChildProfile(p => ({ ...p, ageMonths: months }));

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('בוקר טוב ☀️');
    else if (hour >= 12 && hour < 18) setGreeting('צהריים טובים 🌤️');
    else setGreeting('ערב טוב 🌙');
    
    // טעינת פרופיל מהשרת
    const loadProfile = async () => {
        if (user) {
            const profile = await getChildProfile(user.uid);
            if (profile) {
                // 🔑 עדכון כל שדות הפרופיל, כולל ה-ID מה-DB
                setChildProfile({
                    id: profile.childId,
                    name: profile.name,
                    birthDate: profile.birthDate,
                    ageMonths: months, 
                });
            }
        }
    }
    loadProfile();
  }, [user, childProfile.birthDate]); 

  // טעינת מזג אוויר
  useEffect(() => {
    // ... לוגיקת מזג אוויר נשארה ללא שינוי ...
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return; 
        
        let location = await Location.getCurrentPositionAsync({});
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${location.coords.latitude}&lon=${location.coords.longitude}&appid=${WEATHER_API_KEY}&units=metric&lang=he`
        );
        
        if (!response.ok) return;
        const data = await response.json();
        const temp = Math.round(data.main.temp);
        
        let rec = 'נעים בחוץ';
        if (temp >= 25) rec = 'חם ☀️ שכבה דקה.';
        else if (temp >= 20) rec = 'נעים 😎 שכבה ארוכה.';
        else if (temp >= 15) rec = 'קריר 🍃 שתי שכבות.';
        else rec = 'קר 🥶 לחמם טוב!';

        setWeather({ temp, city: data.name || 'כאן', recommendation: rec, loading: false });
      } catch (e) { 
          // שגיאה שקטה
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (user && childProfile.id) {
          
          // 🔑 בדיקת מנוי והגבלת משתמשים
          const premium = await isPremiumUser(user.uid);
          setIsPremium(premium);
          const maxUsers = await getMaxSharedUsers(user.uid);
          setMaxSharedUsers(maxUsers);
          
          // 🔑 שימוש ב-childId ולא ב-userId
          const lastFeed = await getLastEvent(childProfile.id, 'food');
          const lastSleep = await getLastEvent(childProfile.id, 'sleep');
          setLastFeedTime(formatTimeFromTimestamp(lastFeed?.timestamp));
          setLastSleepTime(formatTimeFromTimestamp(lastSleep?.timestamp));
          
          generateInsight();
        }
      };
      fetchData();
    }, [user, childProfile.id]) // הוספת childProfile.id כ-dependency
  );

  const generateInsight = async () => {
    if (!user || !childProfile.id) return;
    setLoadingAI(true);
    try {
      // 🔑 שליפת היסטוריה לפי childId
      const history = await getRecentHistory(childProfile.id); 
      
      const profileData = {
          name: childProfile.name,
          ageMonths: childProfile.ageMonths,
      };
      
      const prediction = await getAIPrediction(history, user.uid, profileData); 
      setAiTip(prediction.tip);
    } catch (e) { setAiTip("לא הצלחתי לנתח כרגע."); } finally { setLoadingAI(false); }
  };

  const handleQuickAction = (actionType: 'food' | 'sleep' | 'diaper') => {
    setTrackingModalType(actionType);
  };

  const handleSaveTracking = async (data: any) => {
      if (!user || !childProfile.id) return;
      try {
          // 🔑 שמירת אירוע עם childId
          await saveEventToFirebase(user.uid, childProfile.id, data); 
          Alert.alert("נשמר!", "התיעוד עודכן בהצלחה");
          
          if (data.type === 'food') setLastFeedTime(formatTimeFromTimestamp(data.timestamp));
          if (data.type === 'sleep') setLastSleepTime(formatTimeFromTimestamp(data.timestamp));

          generateInsight(); 
      } catch (error) { Alert.alert("שגיאה בשמירה"); }
  };

  const shareStatus = async () => {
    try {
      const message = `👶 סטטוס ${childProfile.name}: ${babyStatus === 'sleeping' ? 'ישנה' : 'ערה'} | 🌡️ ${weather.temp}° | 💡 הטיפ היומי: ${aiTip}`;
      await Share.share({ message: message });
    } catch (error) { console.log(error); }
  };

  const dynamicStyles = {
      bg: isNightMode ? '#000000' : '#f9fafb',
      text: isNightMode ? '#EF4444' : '#111827',
      textSub: isNightMode ? '#7F1D1D' : '#6b7280',
      aiBg: isNightMode ? '#1A0000' : '#f5f3ff', 
      aiBorder: isNightMode ? '#550000' : '#ddd6fe',
      aiTextNight: isNightMode ? "#FCA5A5" : "#5b21b6",
  };

  const GUARDIAN_ROLES = ['אבא', 'אמא', 'סבתא', 'בייביסיטר'];
  const activeRoles = GUARDIAN_ROLES.slice(0, maxSharedUsers);
  
  // פונקציית רינדור ה-AI
  const renderAITipContent = () => {
      if (aiTip.includes('שדרגו לגרסת פרימיום') || aiTip.includes('**שדרגו לפרימיום**')) {
          return (
              <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.aiText, { color: dynamicStyles.aiTextNight, marginBottom: 10 }]}>
                    {`לפענוח "המוח השני" של ${childProfile.name} והפיכת הנתונים לתובנות. 🧠`}
                  </Text>
                  <TouchableOpacity 
                    style={styles.premiumButton} 
                    // 🚨 התיקון הקריטי 1: חזרה ל-navigate פשוט ליעד בתוך ה-Stack
                    onPress={() => navigation.navigate('Subscription' as never)}
                  >
                      <Trophy size={20} color="#fff" />
                      <Text style={styles.premiumButtonText}>שדרג ל"הורה רגוע+"</Text>
                  </TouchableOpacity>
                  <Text style={[styles.aiText, { color: dynamicStyles.aiTextNight, marginTop: 10, fontSize: 14 }]}>
                    (טיפ: זמין למנויי Premium / Family)
                  </Text>
              </View>
          );
      }
      
      if (loadingAI) {
          return <ActivityIndicator color={dynamicStyles.aiTextNight} />;
      }

      return (
          <Text style={[styles.aiText, { color: dynamicStyles.aiTextNight }]}>{aiTip}</Text>
      );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicStyles.bg }]}>
      <StatusBar barStyle={isNightMode ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
            <View>
                <Text style={[styles.greetingText, { color: dynamicStyles.text }]}>{greeting},</Text>
                {/* 🔑 עדכון תצוגת הגיל */}
                <Text style={[styles.parentName, { color: dynamicStyles.textSub }]}>{childProfile.name} בן/בת {childProfile.ageMonths} חודשים</Text>
            </View>
            <TouchableOpacity onPress={() => setIsNightMode(!isNightMode)} style={styles.nightModeBtn}>
                {isNightMode ? <Sun size={24} color="#EF4444" /> : <Moon size={24} color="#1f2937" />}
            </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, babyStatus === 'sleeping' ? styles.statusSleep : styles.statusAwake]}>
            <Text style={styles.statusText}>{babyStatus === 'sleeping' ? `${childProfile.name} ישנה 😴` : `${childProfile.name} ערה 😃`}</Text>
        </View>

        {/* Weather - נשאר ללא שינוי */}
        {!isNightMode && (
            <View style={styles.weatherCard}>
                <View style={styles.weatherIcon}>
                    {weather.loading ? <ActivityIndicator color="#F59E0B" /> : <Text style={styles.weatherTemp}>{weather.temp}°</Text>}
                </View>
                <View style={styles.weatherInfo}>
                    <Text style={styles.weatherTitle}>{weather.city}</Text>
                    <Text style={styles.weatherRec}>{weather.recommendation}</Text>
                </View>
            </View>
        )}

        {/* Guardian Section */}
        <View style={styles.guardianSection}>
            {/* 🔑 עדכון הודעת הפייוול */}
            <Text style={[styles.sectionTitleSmall, { color: dynamicStyles.text }]}>
                מי אחראי כרגע? {maxSharedUsers <= 2 && '(🔒 הוסף עוד מטפלים בפרימיום)'}
            </Text>
            <View style={styles.guardianRow}>
                {activeRoles.map((role) => ( // רינדור מוגבל לפי maxSharedUsers
                    <TouchableOpacity 
                        key={role} 
                        style={[styles.guardianChip, currentGuardian === role && styles.guardianActive]}
                        onPress={() => setCurrentGuardian(role)}
                    >
                        <User size={16} color={currentGuardian === role ? "#fff" : "#6B7280"} />
                        <Text style={[styles.guardianText, currentGuardian === role && styles.guardianTextActive]}>{role}</Text>
                        {currentGuardian === role && <CheckCircle size={14} color="#fff" style={{marginLeft: 4}} />}
                    </TouchableOpacity>
                ))}
                {maxSharedUsers <= 2 && (
                    <TouchableOpacity 
                        style={[styles.guardianChip, styles.premiumPlaceholder]} 
                        // 🚨 התיקון הסופי 2: שימוש ב-navigate פשוט ליעד בתוך ה-Stack
                        onPress={() => navigation.navigate('Subscription' as never)}
                    >
                        <Trophy size={16} color="#4f46e5" />
                        <Text style={styles.premiumPlaceholderText}>שדרג</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>

        {/* AI Insight */}
        <View style={[styles.aiCard, { backgroundColor: dynamicStyles.aiBg, borderColor: dynamicStyles.aiBorder }]}>
             <View style={styles.aiHeader}>
                <Sparkles size={20} color={isNightMode ? "#EF4444" : "#7c3aed"} />
                <Text style={[styles.aiTitle, { color: isNightMode ? "#EF4444" : "#7c3aed" }]}>תובנה יומית (AI)</Text>
             </View>
             {renderAITipContent()}
        </View>

        {/* Quick Actions Slider - נשאר ללא שינוי */}
        <Text style={[styles.sectionTitle, { color: dynamicStyles.text }]}>תיעוד מהיר</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsSlider}>
            
            {/* אוכל */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]} onPress={() => handleQuickAction('food')}>
                <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
                  <Utensils size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>אוכל</Text>
            </TouchableOpacity>

            {/* שינה */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E0E7FF' }]} onPress={() => handleQuickAction('sleep')}>
                <View style={[styles.actionIcon, { backgroundColor: '#6366F1' }]}>
                   <Moon size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>שינה</Text>
            </TouchableOpacity>

            {/* חיתול */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => handleQuickAction('diaper')}>
                <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                   <Layers size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>חיתול</Text>
            </TouchableOpacity>

            {/* רעש לבן */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3E8FF' }]} onPress={() => setIsWhiteNoiseOpen(true)}>
                <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
                   <Music size={28} color="#fff" />
                </View>
                <Text style={[styles.actionText, { color: '#5B21B6' }]}>רעש לבן</Text>
            </TouchableOpacity>

            {/* SOS */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FCE7F3' }]} onPress={() => setIsCalmModeOpen(true)}>
                <View style={[styles.actionIcon, { backgroundColor: '#F43F5E' }]}>
                  <Anchor size={28} color="#fff" />
                </View>
                <Text style={[styles.actionText, { color: '#BE123C' }]}>SOS</Text>
            </TouchableOpacity>

        </ScrollView>

        {/* Vitamins - נשאר ללא שינוי */}
        <View style={styles.medsContainer}>
            <Text style={[styles.sectionTitleSmall, { color: dynamicStyles.text }]}>מדד יומי (חובה!)</Text>
            <View style={styles.medsGrid}>
                <TouchableOpacity 
                    style={[styles.medBtn, meds.vitaminD && styles.medBtnActive]} 
                    onPress={() => setMeds(p => ({...p, vitaminD: !p.vitaminD}))}
                >
                    <Text style={[styles.medText, meds.vitaminD && styles.medTextActive]}>ויטמין D</Text>
                    {meds.vitaminD ? <CheckCircle size={20} color="#fff" /> : <Sun size={20} color="#F59E0B" />}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.medBtn, meds.iron && meds.iron]} 
                    onPress={() => setMeds(p => ({...p, iron: !p.iron}))}
                >
                    <Text style={[styles.medText, meds.iron && styles.medTextActive]}>ברזל</Text>
                    {meds.iron ? <CheckCircle size={20} color="#fff" /> : <Droplets size={20} color="#EF4444" />}
                </TouchableOpacity>
            </View>
        </View>

        {/* Share & Timeline - נשאר ללא שינוי */}
        <TouchableOpacity style={styles.handoffButton} onPress={shareStatus}>
            <Share2 size={20} color="#4f46e5" />
            <Text style={styles.handoffText}>שתף סטטוס משמרת (לוואטסאפ)</Text>
        </TouchableOpacity>

        {!isNightMode && <DailyTimeline />}

      </ScrollView>

      <CalmModeModal visible={isCalmModeOpen} onClose={() => setIsCalmModeOpen(false)} />
      <WhiteNoiseModal visible={isWhiteNoiseOpen} onClose={() => setIsWhiteNoiseOpen(false)} />
      <TrackingModal visible={!!trackingModalType} type={trackingModalType} onClose={() => setTrackingModalType(null)} onSave={handleSaveTracking} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 120 },
  headerContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: '800', textAlign: 'right' },
  parentName: { fontSize: 16, textAlign: 'right', marginTop: 4, color: '#6B7280' },
  nightModeBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 50 },
  
  statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 20, marginBottom: 20, backgroundColor: '#F3F4F6', alignSelf: 'flex-end' },
  statusSleep: { backgroundColor: '#E0E7FF' },
  statusAwake: { backgroundColor: '#FEF3C7' },
  statusText: { fontWeight: 'bold', color: '#1F2937' },

  weatherCard: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  weatherIcon: { alignItems: 'center', paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: '#f3f4f6' },
  weatherTemp: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 4 },
  weatherInfo: { flex: 1, paddingRight: 12 },
  weatherTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4, textAlign: 'right' },
  weatherRec: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'right' },

  guardianSection: { marginBottom: 24 },
  sectionTitleSmall: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 10, textAlign: 'right' },
  guardianRow: { flexDirection: 'row-reverse', gap: 10 },
  guardianChip: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: '#e5e7eb', gap: 6 },
  guardianActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  guardianText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  guardianTextActive: { color: '#fff', fontWeight: 'bold' },
  
  // 🔑 סטייל חדש לכפתור השדרוג של המטפלים
  premiumPlaceholder: { backgroundColor: '#F3E8FF', borderColor: '#C4B5FD', paddingHorizontal: 10 },
  premiumPlaceholderText: { color: '#5B21B6', fontWeight: '700', fontSize: 14, marginRight: 4 },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  actionsSlider: { flexDirection: 'row-reverse', gap: 16, paddingLeft: 20, paddingBottom: 20 },
  
  actionBtn: { 
    width: 100, 
    height: 100, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 6, 
    elevation: 3,
    marginBottom: 10
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  actionText: { fontSize: 16, fontWeight: '700', color: '#374151' },

  aiCard: { borderRadius: 24, padding: 24, marginBottom: 30, borderWidth: 1 },
  aiHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
  aiTitle: { fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  aiText: { fontSize: 16, lineHeight: 24, textAlign: 'right' },

  premiumButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#7c3aed',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },

  medsContainer: { marginBottom: 30 },
  medsGrid: { flexDirection: 'row-reverse', gap: 12 },
  medBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  medBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  medText: { fontSize: 16, fontWeight: '600', marginRight: 8, color: '#374151' },
  medTextActive: { color: '#fff' },
  handoffButton: { flexDirection: 'row-reverse', backgroundColor: '#fff', padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 30, borderWidth: 2, borderColor: '#e5e7eb' },
  handoffText: { color: '#4f46e5', fontSize: 16, fontWeight: '700', marginRight: 12 },
});