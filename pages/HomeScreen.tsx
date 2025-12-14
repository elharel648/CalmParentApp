import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Anchor, Moon, Sun, Utensils, Layers, Sparkles, User, CheckCircle, Share2, Music, Droplets, Trophy } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from '../services/firebaseConfig';
import { getLastEvent, formatTimeFromTimestamp, saveEventToFirebase, getRecentHistory, getChildProfile } from '../services/firebaseService';
import { getAIPrediction } from '../services/geminiService';
import { isPremiumUser, getMaxSharedUsers } from '../services/subscriptionService'; 

import DailyTimeline from '../components/DailyTimeline';
import CalmModeModal from '../components/CalmModeModal';
import TrackingModal from '../components/TrackingModal';
import WhiteNoiseModal from '../components/WhiteNoiseModal';

const WEATHER_API_KEY = "bd5e378503939ddaee76f12ad7a97608";

interface ChildProfile {
    id: string;
    name: string;
    birthDate: Date;
    ageMonths: number;
}

const DEFAULT_CHILD_PROFILE: ChildProfile = {
    id: '', 
    name: 'הבייבי שלי',
    birthDate: new Date(),
    ageMonths: 0, 
};

export default function HomeScreen({ navigation }: any) {
  // --- States ---
  const [loading, setLoading] = useState(true); 
  const [isNightMode, setIsNightMode] = useState(false);
  
  // Modals
  const [isCalmModeOpen, setIsCalmModeOpen] = useState(false);
  const [isWhiteNoiseOpen, setIsWhiteNoiseOpen] = useState(false);
  const [trackingModalType, setTrackingModalType] = useState<'food' | 'sleep' | 'diaper' | null>(null);

  // Data Display
  const [lastFeedTime, setLastFeedTime] = useState('--:--');
  const [lastSleepTime, setLastSleepTime] = useState('--:--');
  const [babyStatus, setBabyStatus] = useState<'sleeping' | 'awake'>('awake');
  const [currentGuardian, setCurrentGuardian] = useState('אבא');
  const [greeting, setGreeting] = useState('שלום');
  
  // Profile & System
  const [childProfile, setChildProfile] = useState<ChildProfile>(DEFAULT_CHILD_PROFILE);
  const [maxSharedUsers, setMaxSharedUsers] = useState(2);
  const [isPremium, setIsPremium] = useState(false); 

  // Meds & Environment
  const [meds, setMeds] = useState({ vitaminD: false, iron: false });
  const [weather, setWeather] = useState({ temp: 24, city: 'תל אביב', recommendation: 'טוען...', loading: true });
  
  // AI
  const [aiTip, setAiTip] = useState('אוסף נתונים לניתוח...');
  const [loadingAI, setLoadingAI] = useState(false);

  const user = auth.currentUser;
  const GUARDIAN_ROLES = ['אבא', 'אמא', 'סבתא', 'בייביסיטר'];
  const activeRoles = GUARDIAN_ROLES.slice(0, maxSharedUsers);

  // --- Effects ---

  // 1. טעינת פרופיל וחישוב גיל
  useEffect(() => {
    const initData = async () => {
        if (!user) {
            setLoading(false); // ✅ תיקון: עצירת טעינה אם אין משתמש
            return;
        }
        
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting('בוקר טוב ☀️');
        else if (hour >= 12 && hour < 18) setGreeting('צהריים טובים 🌤️');
        else setGreeting('ערב טוב 🌙');

        try {
            const profile = await getChildProfile(user.uid);
            if (profile) {
                const now = new Date();
                const months = (now.getFullYear() - profile.birthDate.getFullYear()) * 12 + (now.getMonth() - profile.birthDate.getMonth());
                
                setChildProfile({
                    id: profile.childId,
                    name: profile.name,
                    birthDate: profile.birthDate,
                    ageMonths: Math.max(0, months), 
                });
            }
        } catch (e) {
            console.log("Error loading profile:", e);
        } finally {
            // אם לא מצאנו פרופיל, עדיין נאפשר למסך לעלות
            if (loading) setLoading(false);
        }
    };
    initData();
  }, [user]);

  // 2. טעינת מזג אוויר
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
             setWeather(prev => ({ ...prev, loading: false, recommendation: 'אין גישה למיקום' }));
             return;
        }
        
        let location = await Location.getCurrentPositionAsync({});
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${location.coords.latitude}&lon=${location.coords.longitude}&appid=${WEATHER_API_KEY}&units=metric&lang=he`
        );
        
        if (!response.ok) throw new Error("Weather Error");
        
        const data = await response.json();
        const temp = Math.round(data.main.temp);
        
        let rec = 'נעים בחוץ';
        if (temp >= 25) rec = 'חם ☀️ שכבה דקה.';
        else if (temp >= 20) rec = 'נעים 😎 שכבה ארוכה.';
        else if (temp >= 15) rec = 'קריר 🍃 שתי שכבות.';
        else rec = 'קר 🥶 לחמם טוב!';

        setWeather({ temp, city: data.name || 'איזורך', recommendation: rec, loading: false });
      } catch (e) { 
          setWeather({ temp: 25, city: 'תל אביב', recommendation: 'לא ניתן לטעון מזג אוויר', loading: false });
      }
    })();
  }, []);

  // 3. Focus Effect - רענון נתונים
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        // ✅ תיקון קריטי: אם חסר משהו, נעצור את הטעינה בכל זאת כדי לא להיתקע
        if (!user) {
            setLoading(false);
            return;
        }
        
        // אם אין עדיין ID לילד (אולי טעינה ראשונה), ננסה להמשיך או נעצור
        if (!childProfile.id) {
            setLoading(false); 
            return;
        }
        
        try {
            const premium = await isPremiumUser(user.uid);
            setIsPremium(premium);
            const maxUsers = await getMaxSharedUsers(user.uid);
            setMaxSharedUsers(maxUsers);
            
            const lastFeed = await getLastEvent(childProfile.id, 'food');
            const lastSleep = await getLastEvent(childProfile.id, 'sleep');
            setLastFeedTime(formatTimeFromTimestamp(lastFeed?.timestamp));
            setLastSleepTime(formatTimeFromTimestamp(lastSleep?.timestamp));
            
            await syncDailyStatus(childProfile.id);
            generateInsight();

        } catch (e) {
            console.log("Error in focus fetch:", e);
        } finally {
            setLoading(false); // ✅ תמיד עוצרים את הטעינה בסוף
        }
      };
      
      fetchData();
    }, [user, childProfile.id])
  );

  // --- Logic Functions ---

  const syncDailyStatus = async (childId: string) => {
      try {
          const childRef = doc(db, 'babies', childId);
          const snap = await getDoc(childRef);
          
          if (snap.exists()) {
              const data = snap.data();
              const todayStr = new Date().toDateString();
              if (data.medsDate === todayStr) {
                  setMeds(data.meds || { vitaminD: false, iron: false });
              } else {
                  setMeds({ vitaminD: false, iron: false });
                  await updateDoc(childRef, { meds: { vitaminD: false, iron: false }, medsDate: todayStr });
              }
              
              if (data.status) setBabyStatus(data.status);
          }
      } catch (e) { console.log("Sync Error", e); }
  };

  const updateRemoteStatus = async (field: string, value: any) => {
      if (!childProfile.id) return;
      try {
          const childRef = doc(db, 'babies', childProfile.id);
          if (field === 'meds') {
             await updateDoc(childRef, { [field]: value, medsDate: new Date().toDateString() });
          } else {
             await updateDoc(childRef, { [field]: value });
          }
      } catch (e) { console.log("Update Error", e); }
  };

  const toggleBabyStatus = () => {
      const newStatus = babyStatus === 'sleeping' ? 'awake' : 'sleeping';
      setBabyStatus(newStatus);
      updateRemoteStatus('status', newStatus);
  };

  const toggleMed = (type: 'vitaminD' | 'iron') => {
      const newMeds = { ...meds, [type]: !meds[type] };
      setMeds(newMeds);
      updateRemoteStatus('meds', newMeds);
  };

  const generateInsight = async () => {
    if (!user || !childProfile.id) return;
    setLoadingAI(true);
    try {
      const history = await getRecentHistory(childProfile.id); 
      const profileData = { name: childProfile.name, ageMonths: childProfile.ageMonths };
      const prediction = await getAIPrediction(history, user.uid, profileData); 
      setAiTip(prediction.tip);
    } catch (e) { setAiTip("לא הצלחתי לנתח כרגע."); } finally { setLoadingAI(false); }
  };

  const handleSaveTracking = async (data: any) => {
      if (!user || !childProfile.id) return;
      try {
          await saveEventToFirebase(user.uid, childProfile.id, data); 
          Alert.alert("מעולה!", "התיעוד נשמר בהצלחה ✅");
          
          if (data.type === 'food') setLastFeedTime(formatTimeFromTimestamp(data.timestamp));
          if (data.type === 'sleep') {
              setLastSleepTime(formatTimeFromTimestamp(data.timestamp));
              if (data.subType !== 'woke_up') {
                  setBabyStatus('sleeping');
                  updateRemoteStatus('status', 'sleeping');
              } else {
                  setBabyStatus('awake');
                  updateRemoteStatus('status', 'awake');
              }
          }

          generateInsight(); 
      } catch (error) { Alert.alert("שגיאה בשמירה"); }
  };

  const shareStatus = async () => {
    try {
      const statusText = babyStatus === 'sleeping' ? 'ישנה 😴' : 'ערה 😃';
      const message = `עדכון מ-CalmParent:\n👶 ${childProfile.name} כרגע ${statusText}\n🌡️ בחוץ: ${weather.temp}°\n🍼 אכלה לאחרונה: ${lastFeedTime}\n💡 הטיפ היומי: ${aiTip}`;
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

  // --- Render AI Content ---
  const renderAITipContent = () => {
      if (aiTip.includes('שדרגו') || aiTip.includes('פרימיום')) {
          return (
              <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.aiText, { color: dynamicStyles.aiTextNight, marginBottom: 10, textAlign: 'center' }]}>
                    {`רוצים לדעת מתי ${childProfile.name} תהיה עייפה? 🧠`}
                  </Text>
                  <TouchableOpacity 
                    style={styles.premiumButton} 
                    onPress={() => navigation.navigate('Subscription')}
                  >
                      <Trophy size={18} color="#fff" />
                      <Text style={styles.premiumButtonText}>גלה תובנות בפרימיום</Text>
                  </TouchableOpacity>
              </View>
          );
      }
      return loadingAI ? <ActivityIndicator color={dynamicStyles.aiTextNight} /> : <Text style={[styles.aiText, { color: dynamicStyles.aiTextNight }]}>{aiTip}</Text>;
  };

  if (loading) {
      return (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }]}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={{ marginTop: 10, color: '#666' }}>מכין את הבית...</Text>
          </View>
      );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dynamicStyles.bg }]}>
      <StatusBar barStyle={isNightMode ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
            <View>
                <Text style={[styles.greetingText, { color: dynamicStyles.text }]}>{greeting},</Text>
                <Text style={[styles.parentName, { color: dynamicStyles.textSub }]}>
                    {childProfile.name} {childProfile.ageMonths > 0 ? `בן/בת ${childProfile.ageMonths} חודשים` : 'הבייבי החדש'}
                </Text>
            </View>
            <TouchableOpacity onPress={() => setIsNightMode(!isNightMode)} style={styles.nightModeBtn}>
                {isNightMode ? <Sun size={24} color="#EF4444" /> : <Moon size={24} color="#1f2937" />}
            </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={toggleBabyStatus}
            style={[styles.statusBadge, babyStatus === 'sleeping' ? styles.statusSleep : styles.statusAwake]}
        >
            <Text style={styles.statusText}>
                {babyStatus === 'sleeping' ? `${childProfile.name} ישנה 😴` : `${childProfile.name} ערה 😃`}
            </Text>
            <Text style={styles.statusSubText}>(לחץ לשינוי)</Text>
        </TouchableOpacity>

        {/* Weather */}
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
            <Text style={[styles.sectionTitleSmall, { color: dynamicStyles.text }]}>
                מי אחראי כרגע?
            </Text>
            <View style={styles.guardianRow}>
                {activeRoles.map((role) => (
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
                {!isPremium && (
                    <TouchableOpacity style={[styles.guardianChip, styles.premiumPlaceholder]} onPress={() => navigation.navigate('Subscription')}>
                        <Trophy size={14} color="#4f46e5" />
                        <Text style={styles.premiumPlaceholderText}>הוסף</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>

        {/* AI Insight */}
        <View style={[styles.aiCard, { backgroundColor: dynamicStyles.aiBg, borderColor: dynamicStyles.aiBorder }]}>
             <View style={styles.aiHeader}>
                <Sparkles size={20} color={isNightMode ? "#EF4444" : "#7c3aed"} />
                <Text style={[styles.aiTitle, { color: isNightMode ? "#EF4444" : "#7c3aed" }]}>המוח של {childProfile.name} (AI)</Text>
             </View>
             {renderAITipContent()}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: dynamicStyles.text }]}>תיעוד מהיר</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsSlider}>
            
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]} onPress={() => setTrackingModalType('food')}>
                <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
                  <Utensils size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>אוכל</Text>
                <Text style={styles.lastTimeText}>{lastFeedTime}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E0E7FF' }]} onPress={() => setTrackingModalType('sleep')}>
                <View style={[styles.actionIcon, { backgroundColor: '#6366F1' }]}>
                   <Moon size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>שינה</Text>
                <Text style={styles.lastTimeText}>{lastSleepTime}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => setTrackingModalType('diaper')}>
                <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                   <Layers size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>חיתול</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3E8FF' }]} onPress={() => setIsWhiteNoiseOpen(true)}>
                <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
                   <Music size={28} color="#fff" />
                </View>
                <Text style={[styles.actionText, { color: '#5B21B6' }]}>רעש לבן</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FCE7F3' }]} onPress={() => setIsCalmModeOpen(true)}>
                <View style={[styles.actionIcon, { backgroundColor: '#F43F5E' }]}>
                  <Anchor size={28} color="#fff" />
                </View>
                <Text style={[styles.actionText, { color: '#BE123C' }]}>SOS</Text>
            </TouchableOpacity>
        </ScrollView>

        {/* Vitamins (Synced) */}
        <View style={styles.medsContainer}>
            <Text style={[styles.sectionTitleSmall, { color: dynamicStyles.text }]}>מדד יומי (מתאפס בלילה)</Text>
            <View style={styles.medsGrid}>
                <TouchableOpacity 
                    style={[styles.medBtn, meds.vitaminD && styles.medBtnActive]} 
                    onPress={() => toggleMed('vitaminD')}
                >
                    <Text style={[styles.medText, meds.vitaminD && styles.medTextActive]}>ויטמין D</Text>
                    {meds.vitaminD ? <CheckCircle size={20} color="#fff" /> : <Sun size={20} color="#F59E0B" />}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.medBtn, meds.iron && styles.medBtnActive]} 
                    onPress={() => toggleMed('iron')}
                >
                    <Text style={[styles.medText, meds.iron && styles.medTextActive]}>ברזל</Text>
                    {meds.iron ? <CheckCircle size={20} color="#fff" /> : <Droplets size={20} color="#EF4444" />}
                </TouchableOpacity>
            </View>
        </View>

        {/* Share & Timeline */}
        <TouchableOpacity style={styles.handoffButton} onPress={shareStatus}>
            <Share2 size={20} color="#4f46e5" />
            <Text style={styles.handoffText}>שתף סטטוס משמרת (וואטסאפ)</Text>
        </TouchableOpacity>

        {!isNightMode && <DailyTimeline />}

      </ScrollView>

      {/* Modals */}
      <CalmModeModal visible={isCalmModeOpen} onClose={() => setIsCalmModeOpen(false)} />
      <WhiteNoiseModal visible={isWhiteNoiseOpen} onClose={() => setIsWhiteNoiseOpen(false)} />
      <TrackingModal 
        visible={!!trackingModalType} 
        type={trackingModalType} 
        onClose={() => setTrackingModalType(null)} 
        onSave={handleSaveTracking} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 120 },
  
  // Header
  headerContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greetingText: { fontSize: 24, fontWeight: '800', textAlign: 'right' },
  parentName: { fontSize: 16, textAlign: 'right', marginTop: 4, color: '#6B7280' },
  nightModeBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 50 },
  
  // Status Badge
  statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, marginBottom: 20, width: '100%' },
  statusSleep: { backgroundColor: '#E0E7FF' },
  statusAwake: { backgroundColor: '#FEF3C7' },
  statusText: { fontWeight: 'bold', fontSize: 16, color: '#1F2937' },
  statusSubText: { fontSize: 12, color: '#6B7280' },

  // Weather
  weatherCard: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  weatherIcon: { alignItems: 'center', paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: '#f3f4f6', minWidth: 60 },
  weatherTemp: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginTop: 4 },
  weatherInfo: { flex: 1, paddingRight: 12 },
  weatherTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4, textAlign: 'right' },
  weatherRec: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'right' },

  // Guardian
  guardianSection: { marginBottom: 24 },
  sectionTitleSmall: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 10, textAlign: 'right' },
  guardianRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  guardianChip: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: '#e5e7eb', gap: 6 },
  guardianActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  guardianText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  guardianTextActive: { color: '#fff', fontWeight: 'bold' },
  premiumPlaceholder: { backgroundColor: '#F3E8FF', borderColor: '#C4B5FD', paddingHorizontal: 12 },
  premiumPlaceholderText: { color: '#5B21B6', fontWeight: '700', fontSize: 12, marginRight: 2 },

  // Quick Actions
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'right' },
  actionsSlider: { flexDirection: 'row-reverse', gap: 12, paddingLeft: 20, paddingBottom: 20 },
  actionBtn: { width: 105, height: 130, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  actionIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionText: { fontSize: 15, fontWeight: '700', color: '#374151' },
  lastTimeText: { fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: '500' },

  // AI
  aiCard: { borderRadius: 24, padding: 20, marginBottom: 30, borderWidth: 1 },
  aiHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
  aiTitle: { fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  aiText: { fontSize: 15, lineHeight: 22, textAlign: 'right' },
  premiumButton: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#7c3aed', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, marginTop: 8 },
  premiumButtonText: { color: '#fff', fontSize: 14, fontWeight: '700', marginRight: 8 },

  // Meds
  medsContainer: { marginBottom: 30 },
  medsGrid: { flexDirection: 'row-reverse', gap: 12 },
  medBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  medBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  medText: { fontSize: 16, fontWeight: '600', marginRight: 8, color: '#374151' },
  medTextActive: { color: '#fff' },

  // Handoff
  handoffButton: { flexDirection: 'row-reverse', backgroundColor: '#fff', padding: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 30, borderWidth: 2, borderColor: '#e5e7eb' },
  handoffText: { color: '#4f46e5', fontSize: 16, fontWeight: '700', marginRight: 10 },
});