import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
  Moon, Sun, Droplets, Utensils, Clock, Plus, Thermometer, Baby, 
  ChevronLeft, X, Play, Pause, Save, CheckCircle
} from 'lucide-react-native';
import { auth, db } from '../services/firebaseConfig';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const SMART_TIPS: Record<string, string> = {
  '0': 'מגע עור-לעור הוא קריטי. הוא מווסת חום גוף ומרגיע את התינוק.',
  '1': 'התינוק מתחיל לעקוב אחרי חפצים. נסו להזיז רעשן לאט מול עיניו.',
  'default': 'סמכו על האינטואיציה. אתם ההורים הכי טובים לילד שלכם.'
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  
  // נתונים
  const [babyData, setBabyData] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [currentTip, setCurrentTip] = useState(SMART_TIPS['default']);
  const [todayStats, setTodayStats] = useState({ food: 0, diapers: 0, sleep: 0 });
  const [lastAction, setLastAction] = useState('ממתין לפעילות...');
  const [greeting, setGreeting] = useState(''); // ברכה דינמית

  // מודלים
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isFeedingModalVisible, setFeedingModalVisible] = useState(false);
  const [isDiaperModalVisible, setDiaperModalVisible] = useState(false);
  
  // האכלה
  const [feedingType, setFeedingType] = useState<'bottle' | 'breast'>('bottle');
  const [bottleAmount, setBottleAmount] = useState('');
  
  // הנקה (צדדים)
  const [activeBreastSide, setActiveBreastSide] = useState<'left' | 'right' | null>(null);
  const [leftTimer, setLeftTimer] = useState(0);
  const [rightTimer, setRightTimer] = useState(0);
  
  // החתלה
  const [diaperType, setDiaperType] = useState<'pee' | 'poo' | 'both'>('pee');

  const [loadingSave, setLoadingSave] = useState(false);
  
  // טיימר שינה ראשי
  const [isSleeping, setIsSleeping] = useState(false);
  const [sleepTimer, setSleepTimer] = useState(0);

  // עיצוב דינמי
  const currentHour = new Date().getHours();
  // לילה נחשב מ-19:00 עד 06:00 בבוקר
  const isNight = currentHour >= 19 || currentHour < 6;

  const gradientColors = isNight 
    ? ['#1e1b4b', '#4338ca', '#6366f1'] // לילה עמוק
    : ['#2563eb', '#3b82f6', '#60a5fa']; // כחול יום

  const textColor = '#ffffff';
  const subTextColor = '#e2e8f0';
  const cardBg = 'rgba(255, 255, 255, 0.15)';

  // --- טיימרים ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSleeping) interval = setInterval(() => setSleepTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isSleeping]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeBreastSide === 'left') {
      interval = setInterval(() => setLeftTimer(t => t + 1), 1000);
    } else if (activeBreastSide === 'right') {
      interval = setInterval(() => setRightTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeBreastSide]);

  // --- טעינת נתונים וחישוב זמן ---
  useFocusEffect(
    useCallback(() => {
      calculateGreeting(); // חישוב ברכה בכל כניסה
      
      let isActive = true;
      const loadAll = async () => {
        if (!auth.currentUser) return;
        try {
          const docRef = doc(db, 'users', auth.currentUser.uid);
          const snap = await getDoc(docRef);
          if (isActive && snap.exists()) {
            const data = snap.data();
            const profile = data.babyProfile || {};
            setBabyData({
              name: profile.name || data.displayName || 'הבייבי שלי',
              photoURL: profile.photoURL || data.photoURL,
              birthDate: profile.birthDate
            });
            if (profile.birthDate) calculateSmartTip(profile.birthDate);
          }
          getLocationAndWeather();
        } catch (e) { console.log(e); }
      };
      loadAll();
      return () => { isActive = false; };
    }, [])
  );

  // לוגיקה מדויקת לשעות היום בישראל
  const calculateGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('בוקר טוב ☀️');
    else if (hour >= 12 && hour < 17) setGreeting('צהריים טובים 🌤️');
    else if (hour >= 17 && hour < 21) setGreeting('ערב טוב ✨');
    else setGreeting('לילה טוב 🌙');
  };

  const calculateSmartTip = (birthDateString: string) => {
    if (!birthDateString) return;
    const parts = birthDateString.split('/');
    const birthDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    const now = new Date();
    const months = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
    setCurrentTip(SMART_TIPS[months.toString()] || SMART_TIPS['default']);
  };

  const getLocationAndWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&current_weather=true`);
      const data = await res.json();
      setWeather(data.current_weather);
    } catch (e) {}
  };

  // --- שמירה ---
  const handleSaveFeeding = async () => {
    const totalBreastTime = leftTimer + rightTimer;
    if (feedingType === 'bottle' && !bottleAmount) return Alert.alert('חסר מידע', 'כמה מ"ל אכל?');
    if (feedingType === 'breast' && totalBreastTime === 0) return Alert.alert('לא נרשם זמן', 'הטיימרים על 0');

    setLoadingSave(true);
    try {
      await addDoc(collection(db, 'events'), {
        userId: auth.currentUser?.uid,
        type: 'feeding',
        subType: feedingType,
        timestamp: new Date(),
        amount: feedingType === 'bottle' ? parseInt(bottleAmount) : 0,
        durationLeft: feedingType === 'breast' ? leftTimer : 0,
        durationRight: feedingType === 'breast' ? rightTimer : 0,
        totalDuration: totalBreastTime
      });
      
      setTodayStats(prev => ({ ...prev, food: prev.food + (feedingType === 'bottle' ? parseInt(bottleAmount) : 0) }));
      const actionText = feedingType === 'bottle' ? `בקבוק ${bottleAmount} מ"ל` : `הנקה ${formatTime(totalBreastTime)}`;
      setLastAction(actionText);
      
      setFeedingModalVisible(false);
      setMenuVisible(false);
      setBottleAmount('');
      setActiveBreastSide(null);
      setLeftTimer(0);
      setRightTimer(0);
    } catch (error) { Alert.alert('שגיאה', 'לא נשמר'); } 
    finally { setLoadingSave(false); }
  };

  const handleSaveDiaper = async () => {
    setLoadingSave(true);
    try {
      await addDoc(collection(db, 'events'), {
        userId: auth.currentUser?.uid,
        type: 'diaper',
        subType: diaperType,
        timestamp: new Date()
      });
      setTodayStats(prev => ({ ...prev, diapers: prev.diapers + 1 }));
      const typeText = diaperType === 'pee' ? 'פיפי' : diaperType === 'poo' ? 'קקי' : 'מלא';
      setLastAction(`החלפת חיתול (${typeText})`);
      setDiaperModalVisible(false);
      setMenuVisible(false);
    } catch (error) { Alert.alert('שגיאה', 'לא נשמר'); } 
    finally { setLoadingSave(false); }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleBreastSide = (side: 'left' | 'right') => {
    if (activeBreastSide === side) setActiveBreastSide(null);
    else setActiveBreastSide(side);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} start={{x:0, y:0}} end={{x:1, y:1}} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: subTextColor }]}>{greeting}</Text>
            <Text style={[styles.babyName, { color: textColor }]}>
              {babyData?.name || 'טוען...'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('פרופיל')} activeOpacity={0.8} style={styles.profileImageContainer}>
             {babyData?.photoURL ? (
               <Image source={{ uri: babyData.photoURL }} style={styles.profileImage} />
             ) : (
               <Baby size={28} color="#fff" />
             )}
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
          <View style={styles.heroHeader}>
            <View style={[styles.statusBadge, { backgroundColor: isSleeping ? '#818cf8' : '#fbbf24' }]}>
              <Text style={[styles.statusText, { color: isSleeping ? '#fff' : '#78350f' }]}>
                {isSleeping ? 'בשינה 😴' : 'זמן ערות 👶'}
              </Text>
            </View>
            {/* אייקון משתנה לפי לילה/יום */}
            {isNight ? <Moon size={24} color="#a5b4fc" /> : <Sun size={24} color="#fcd34d" />}
          </View>
          
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: '#fff' }]}>
              {isSleeping ? formatTime(sleepTimer) : lastAction}
            </Text>
            <Text style={[styles.timerLabel, { color: subTextColor }]}>
              {isSleeping ? 'זמן שינה נוכחי' : 'הפעילות האחרונה שנרשמה'}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => { setIsSleeping(!isSleeping); if (!isSleeping) setSleepTimer(0); }}
          >
            <Text style={styles.actionButtonText}>
              {isSleeping ? 'התעורר/ה? סיום שינה' : 'הולכים לישון'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* סטטיסטיקה */}
        <Text style={[styles.sectionTitle, { color: textColor }]}>היום עד כה</Text>
        <View style={styles.statsRow}>
          <View style={[styles.glassCard, { backgroundColor: cardBg }]}>
            <Utensils size={24} color="#f472b6" />
            <Text style={[styles.statValue, { color: textColor }]}>{todayStats.food}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>מ"ל אוכל</Text>
          </View>
          <View style={[styles.glassCard, { backgroundColor: cardBg }]}>
            <Droplets size={24} color="#38bdf8" />
            <Text style={[styles.statValue, { color: textColor }]}>{todayStats.diapers}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>חיתולים</Text>
          </View>
          <View style={[styles.glassCard, { backgroundColor: cardBg }]}>
            <Moon size={24} color="#a78bfa" />
            <Text style={[styles.statValue, { color: textColor }]}>{todayStats.sleep}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>שעות שינה</Text>
          </View>
        </View>

        {/* מזג אוויר וטיפ */}
        <View style={[styles.wideCard, { backgroundColor: cardBg, marginTop: 20 }]}>
          <View style={styles.iconCircle}>
            <Thermometer size={24} color="#34d399" />
          </View>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={[styles.widgetTitle, { color: textColor }]}>
              {weather ? `${weather.temperature}° בחוץ` : 'טוען...'}
            </Text>
            <Text style={[styles.widgetText, { color: subTextColor }]}>
              {weather && weather.temperature < 20 ? 'קריר, מומלץ ארוך' : 'נעים וכיפי בחוץ'}
            </Text>
          </View>
        </View>

        <View style={[styles.wideCard, { backgroundColor: cardBg, marginTop: 16, marginBottom: 100 }]}>
          <View style={{ width: '100%' }}>
            <Text style={[styles.widgetTitle, { color: textColor }]}>💡 הטיפ היומי</Text>
            <Text style={[styles.widgetText, { color: subTextColor }]}>{currentTip}</Text>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setMenuVisible(true)} activeOpacity={0.8}>
        <Plus size={32} color="white" />
      </TouchableOpacity>

      {/* Modals - Action Sheet */}
      <Modal visible={isMenuVisible} transparent animationType="slide" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle}>הוספת פעילות</Text>
            <TouchableOpacity style={styles.actionItem} onPress={() => { setMenuVisible(false); setTimeout(() => setFeedingModalVisible(true), 100); }}>
              <View style={[styles.actionIcon, { backgroundColor: '#fce7f3' }]}><Utensils size={24} color="#db2777" /></View>
              <Text style={styles.actionText}>האכלה / הנקה</Text>
              <ChevronLeft size={20} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => { setMenuVisible(false); setTimeout(() => setDiaperModalVisible(true), 100); }}>
              <View style={[styles.actionIcon, { backgroundColor: '#e0f2fe' }]}><Droplets size={24} color="#0284c7" /></View>
              <Text style={styles.actionText}>החלפת חיתול</Text>
              <ChevronLeft size={20} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMenuVisible(false)}>
              <Text style={styles.closeButtonText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modals - Feeding */}
      <Modal visible={isFeedingModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.feedingModalOverlay}>
            <View style={styles.feedingModalContent}>
              <View style={styles.modalHeaderRow}>
                <TouchableOpacity onPress={() => setFeedingModalVisible(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
                <Text style={styles.feedingTitle}>רישום האכלה</Text>
                <View style={{width: 24}}/> 
              </View>
              <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabButton, feedingType === 'bottle' && styles.activeTab]} onPress={() => setFeedingType('bottle')}>
                  <Text style={[styles.tabText, feedingType === 'bottle' && styles.activeTabText]}>בקבוק</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabButton, feedingType === 'breast' && styles.activeTab]} onPress={() => setFeedingType('breast')}>
                  <Text style={[styles.tabText, feedingType === 'breast' && styles.activeTabText]}>הנקה</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                {feedingType === 'bottle' ? (
                  <View style={styles.bottleContainer}>
                    <Text style={styles.inputLabel}>כמות (מ"ל)</Text>
                    <TextInput style={styles.amountInput} value={bottleAmount} onChangeText={setBottleAmount} keyboardType="numeric" placeholder="0" autoFocus />
                  </View>
                ) : (
                  <View style={styles.breastContainer}>
                    <View style={styles.breastTimersRow}>
                      <TouchableOpacity style={[styles.breastSideCard, activeBreastSide === 'right' && styles.activeBreastCard]} onPress={() => toggleBreastSide('right')}>
                        <Text style={[styles.breastSideLabel, activeBreastSide === 'right' && styles.activeBreastText]}>צד ימין</Text>
                        <Text style={[styles.breastTimerText, activeBreastSide === 'right' && styles.activeBreastText]}>{formatTime(rightTimer)}</Text>
                        <View style={styles.breastIcon}>{activeBreastSide === 'right' ? <Pause size={20} color="white" /> : <Play size={20} color="#6b7280" />}</View>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.breastSideCard, activeBreastSide === 'left' && styles.activeBreastCard]} onPress={() => toggleBreastSide('left')}>
                        <Text style={[styles.breastSideLabel, activeBreastSide === 'left' && styles.activeBreastText]}>צד שמאל</Text>
                        <Text style={[styles.breastTimerText, activeBreastSide === 'left' && styles.activeBreastText]}>{formatTime(leftTimer)}</Text>
                        <View style={styles.breastIcon}>{activeBreastSide === 'left' ? <Pause size={20} color="white" /> : <Play size={20} color="#6b7280" />}</View>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.totalTimeLabel}>סה״כ: {formatTime(leftTimer + rightTimer)}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.saveFeedingBtn} onPress={handleSaveFeeding}>
                {loadingSave ? <ActivityIndicator color="white" /> : <Text style={styles.saveFeedingText}>שמירה</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modals - Diaper */}
      <Modal visible={isDiaperModalVisible} transparent animationType="slide">
        <View style={styles.feedingModalOverlay}>
          <View style={styles.feedingModalContent}>
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity onPress={() => setDiaperModalVisible(false)}><X size={24} color="#6b7280" /></TouchableOpacity>
              <Text style={styles.feedingTitle}>רישום החתלה</Text>
              <View style={{width: 24}}/> 
            </View>
            <View style={styles.diaperOptionsContainer}>
              <TouchableOpacity style={[styles.diaperOption, diaperType === 'pee' && styles.activeDiaperOption]} onPress={() => setDiaperType('pee')}>
                <Droplets size={32} color={diaperType === 'pee' ? '#fff' : '#0ea5e9'} />
                <Text style={[styles.diaperText, diaperType === 'pee' && styles.activeDiaperText]}>פיפי</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.diaperOption, diaperType === 'poo' && styles.activeDiaperOption, {borderColor: '#b45309'}]} onPress={() => setDiaperType('poo')}>
                <View style={{width:32, height:32, borderRadius:16, backgroundColor: diaperType === 'poo' ? '#fff' : '#b45309'}} />
                <Text style={[styles.diaperText, diaperType === 'poo' && styles.activeDiaperText, {color: diaperType === 'poo' ? '#fff' : '#b45309'}]}>קקי</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.diaperOption, diaperType === 'both' && styles.activeDiaperOption, {borderColor: '#8b5cf6'}]} onPress={() => setDiaperType('both')}>
                <CheckCircle size={32} color={diaperType === 'both' ? '#fff' : '#8b5cf6'} />
                <Text style={[styles.diaperText, diaperType === 'both' && styles.activeDiaperText, {color: diaperType === 'both' ? '#fff' : '#8b5cf6'}]}>גם וגם</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveFeedingBtn} onPress={handleSaveDiaper}>
              {loadingSave ? <ActivityIndicator color="white" /> : <Text style={styles.saveFeedingText}>שמירה</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 16, fontWeight: '500', textAlign: 'right' },
  babyName: { fontSize: 32, fontWeight: '800', textAlign: 'right' },
  profileImageContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  profileImage: { width: 46, height: 46, borderRadius: 23 },
  heroCard: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 24, padding: 24, marginBottom: 30 },
  heroHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 14, fontWeight: '700' },
  timerContainer: { alignItems: 'center', marginBottom: 24 },
  timerText: { fontSize: 40, fontWeight: '800', textAlign: 'center' },
  timerLabel: { fontSize: 14, fontWeight: '500' },
  actionButton: { backgroundColor: '#ffffff', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  actionButtonText: { color: '#1e3a8a', fontSize: 18, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'right' },
  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  glassCard: { width: width / 3.6, height: 110, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  wideCard: { flexDirection: 'row-reverse', alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 22, fontWeight: '800', marginVertical: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  widgetTitle: { fontSize: 16, fontWeight: '700', textAlign: 'right', marginBottom: 4 },
  widgetText: { fontSize: 14, textAlign: 'right', lineHeight: 20 },
  fab: { position: 'absolute', bottom: 110, left: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 24 },
  actionItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  actionText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#374151', textAlign: 'right' },
  closeButton: { marginTop: 24, paddingVertical: 16, backgroundColor: '#f3f4f6', borderRadius: 16, alignItems: 'center' },
  closeButtonText: { fontSize: 16, fontWeight: '700', color: '#4b5563' },
  
  feedingModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  feedingModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, minHeight: 350 },
  modalHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  feedingTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  tabsContainer: { flexDirection: 'row-reverse', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 },
  tabButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontWeight: '600', color: '#6b7280' },
  activeTabText: { color: '#2563eb', fontWeight: '800' },
  modalBody: { alignItems: 'center', marginBottom: 30 },
  bottleContainer: { width: '100%', alignItems: 'center' },
  inputLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#374151' },
  amountInput: { fontSize: 40, fontWeight: '800', color: '#2563eb', textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#e5e7eb', width: 100, paddingBottom: 8 },
  
  breastContainer: { width: '100%', alignItems: 'center' },
  breastTimersRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 15, marginBottom: 20 },
  breastSideCard: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 16, padding: 15, alignItems: 'center', justifyContent: 'center', height: 120 },
  activeBreastCard: { backgroundColor: '#2563eb', shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  breastSideLabel: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginBottom: 5 },
  breastTimerText: { fontSize: 24, fontWeight: '800', color: '#111827', fontVariant: ['tabular-nums'], marginBottom: 5 },
  activeBreastText: { color: 'white' },
  breastIcon: { marginTop: 5 },
  totalTimeLabel: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 10 },

  saveFeedingBtn: { backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16 },
  saveFeedingText: { color: 'white', fontSize: 16, fontWeight: '700' },

  diaperOptionsContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', width: '100%', marginBottom: 30, gap: 10 },
  diaperOption: { flex: 1, height: 100, borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', gap: 8 },
  activeDiaperOption: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  diaperText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  activeDiaperText: { color: 'white' }
});