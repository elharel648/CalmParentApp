import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Share2, Anchor, Activity, Moon, Utensils, Layers, Sparkles } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../services/firebaseConfig';
import { getLastEvent, formatTimeFromTimestamp, saveEventToFirebase, getRecentHistory } from '../services/firebaseService';
import { getAIPrediction } from '../services/geminiService';

import CalmModeModal from '../components/CalmModeModal';
import TrackingModal from '../components/TrackingModal';

export default function HomeScreen({ navigation }: any) {
  const [isCalmModeOpen, setIsCalmModeOpen] = useState(false);
  const [trackingModalType, setTrackingModalType] = useState<'food' | 'sleep' | 'diaper' | null>(null);

  // סטייטים לנתונים
  const [lastFeedTime, setLastFeedTime] = useState('--:--');
  const [lastSleepTime, setLastSleepTime] = useState('--:--');
  
  // סטייטים ל-AI
  const [aiTip, setAiTip] = useState('אוסף נתונים לניתוח חכם...');
  const [loadingAI, setLoadingAI] = useState(false);

  const user = auth.currentUser;

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        if (user) {
          // 1. שליפת זמנים למבט מהיר
          const lastFeed = await getLastEvent(user.uid, 'food');
          const lastSleep = await getLastEvent(user.uid, 'sleep');
          setLastFeedTime(formatTimeFromTimestamp(lastFeed?.timestamp));
          setLastSleepTime(formatTimeFromTimestamp(lastSleep?.timestamp));

          // 2. הפעלת ה-AI (רק אם אין עדיין טיפ או עבר זמן)
          generateInsight();
        }
      };
      fetchData();
    }, [user])
  );

  const generateInsight = async () => {
    if (!user) return;
    setLoadingAI(true);
    try {
      // מביאים היסטוריה
      const history = await getRecentHistory(user.uid);
      // שולחים ל-Gemini
      const prediction = await getAIPrediction(history);
      setAiTip(prediction.tip);
    } catch (e) {
      console.log('AI Failed', e);
      setAiTip("לא הצלחתי לנתח את הנתונים כרגע.");
    } finally {
      setLoadingAI(false);
    }
  };

  const shareStatus = async () => {
    try {
      const message = `
👶 *עדכון סטטוס בייבי - CalmParent*
זמן אמת:
🍼 *ארוחה אחרונה:* ${lastFeedTime}
😴 *שינה אחרונה:* ${lastSleepTime}
💡 *טיפ יומי:* ${aiTip}

נשלח מאפליקציית CalmParent
      `.trim();
      await Share.share({ message: message });
    } catch (error) { console.log(error); }
  };

  const handleQuickAction = (actionType: 'food' | 'sleep' | 'diaper') => {
    setTrackingModalType(actionType);
  };

  const handleSaveTracking = async (data: any) => {
      if (!user) return;
      try {
          await saveEventToFirebase(user.uid, data); 
          Alert.alert("נשמר בהצלחה", "התיעוד נוסף וה-AI מתעדכן...");
          
          // רענון נתונים + AI מחדש אחרי שמירה
          const lastFeed = await getLastEvent(user.uid, 'food');
          const lastSleep = await getLastEvent(user.uid, 'sleep');
          setLastFeedTime(formatTimeFromTimestamp(lastFeed?.timestamp));
          setLastSleepTime(formatTimeFromTimestamp(lastSleep?.timestamp));
          generateInsight(); // בקשת טיפ חדש על בסיס המידע החדש

      } catch (error) {
          Alert.alert("שגיאה", "לא ניתן היה לשמור את התיעוד");
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>צהריים טובים,</Text>
            <Text style={styles.subGreeting}>הכל בשליטה 💪</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <Bell size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.sosButton} onPress={() => setIsCalmModeOpen(true)} activeOpacity={0.9}>
            <View style={styles.sosIconCircle}><Anchor size={32} color="#fff" /></View>
            <View>
                <Text style={styles.sosTitle}>מצב רוגע (SOS)</Text>
                <Text style={styles.sosSubtitle}>התינוק בוכה? לחץ להרגעה</Text>
            </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>תיעוד מהיר</Text>
        <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEF3C7' }]} onPress={() => handleQuickAction('food')}>
                <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}><Utensils size={28} color="#fff" /></View>
                <Text style={styles.actionText}>אוכל</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E0E7FF' }]} onPress={() => handleQuickAction('sleep')}>
                <View style={[styles.actionIcon, { backgroundColor: '#6366F1' }]}><Moon size={28} color="#fff" /></View>
                <Text style={styles.actionText}>שינה</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => handleQuickAction('diaper')}>
                <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}><Layers size={28} color="#fff" /></View>
                <Text style={styles.actionText}>חיתול</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.handoffButton} onPress={shareStatus}>
            <Share2 size={20} color="#4f46e5" />
            <Text style={styles.handoffText}>שתף סטטוס משמרת (לוואטסאפ)</Text>
        </TouchableOpacity>

        {/* --- כרטיסיית AI חכמה ומחוברת --- */}
        <View style={styles.aiCard}>
             <View style={styles.aiHeader}>
                <Sparkles size={20} color="#7c3aed" />
                <Text style={styles.aiTitle}>תובנה יומית (AI)</Text>
             </View>
             {loadingAI ? (
               <ActivityIndicator size="small" color="#7c3aed" />
             ) : (
               <Text style={styles.aiText}>{aiTip}</Text>
             )}
        </View>

        <Text style={styles.sectionTitle}>מבט מהיר</Text>
        <View style={styles.statsGrid}>
            <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}><Utensils size={24} color="#F59E0B" /></View>
                <Text style={styles.statLabel}>ארוחה אחרונה</Text>
                <Text style={styles.statValue}>{lastFeedTime}</Text>
            </View>
            <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: '#E0E7FF' }]}><Moon size={24} color="#6366F1" /></View>
                <Text style={styles.statLabel}>שינה אחרונה</Text>
                <Text style={styles.statValue}>{lastSleepTime}</Text>
            </View>
        </View>

      </ScrollView>

      <CalmModeModal visible={isCalmModeOpen} onClose={() => setIsCalmModeOpen(false)} />
      <TrackingModal visible={!!trackingModalType} type={trackingModalType} onClose={() => setTrackingModalType(null)} onSave={handleSaveTracking} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { padding: 24, paddingBottom: 120 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'right' },
  subGreeting: { fontSize: 18, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  iconBtn: { padding: 12, backgroundColor: '#fff', borderRadius: 50, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sosButton: { flexDirection: 'row-reverse', backgroundColor: '#4f46e5', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 40, shadowColor: "#4f46e5", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 },
  sosIconCircle: { width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginLeft: 20 },
  sosTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'right' },
  sosSubtitle: { color: '#e0e7ff', fontSize: 14, marginTop: 4, textAlign: 'right' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20, textAlign: 'right' },
  actionsGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 40, gap: 16 },
  actionBtn: { flex: 1, aspectRatio: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  actionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  handoffButton: { flexDirection: 'row-reverse', backgroundColor: '#fff', padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 40, borderWidth: 2, borderColor: '#e5e7eb' },
  handoffText: { color: '#4f46e5', fontSize: 16, fontWeight: '700', marginRight: 12 },
  aiCard: { backgroundColor: '#f5f3ff', borderRadius: 24, padding: 24, marginBottom: 40, borderWidth: 2, borderColor: '#ddd6fe', minHeight: 100, justifyContent: 'center' },
  aiHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12 },
  aiTitle: { fontSize: 18, fontWeight: 'bold', color: '#7c3aed', marginRight: 10 },
  aiText: { color: '#5b21b6', fontSize: 16, lineHeight: 24, textAlign: 'right' },
  statsGrid: { flexDirection: 'row-reverse', gap: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statLabel: { fontSize: 14, color: '#6b7280', marginBottom: 8, fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' }
});