import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Moon, Milk, Droplets, Calendar, ChevronRight, ChevronLeft, 
  Clock, Utensils, CheckCircle
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#4f46e5',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1e293b',
  subText: '#64748b',
  food: '#ec4899',   
  sleep: '#8b5cf6',  
  diaper: '#0ea5e9'  
};

export default function ReportsScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState({ food: 0, sleep: 0, diapers: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- שליפת נתונים ---
  const fetchEventsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const start = startOfDay(date);
      const end = endOfDay(date);

      // שאילתה מורכבת: דורשת אינדקס ב-Firebase!
      const q = query(
        collection(db, 'events'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedEvents: any[] = [];
      let stats = { food: 0, sleep: 0, diapers: 0 };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp);
        
        fetchedEvents.push({ id: doc.id, ...data, dateObj });

        // חישובים
        if (data.type === 'feeding') {
          stats.food += data.amount || 0;
        } else if (data.type === 'diaper') {
          stats.diapers += 1;
        }
      });

      setEvents(fetchedEvents);
      setDailyStats(stats);

    } catch (error: any) {
      console.log("Error fetching events:", error);
      // אם השגיאה היא על חוסר באינדקס, נציג הודעה ברורה
      if (error.message.includes('index')) {
        Alert.alert(
          'חסר אינדקס ב-Firebase',
          'כדי להציג את הדוחות, פיירבייס דורש יצירת אינדקס.\n\nהסתכל בטרמינל (במחשב), יש שם לינק שמתחיל ב-https://console.firebase...\n\nלחץ עליו וצור את האינדקס.',
          [{ text: 'הבנתי' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEventsForDate(selectedDate);
  }, [selectedDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEventsForDate(selectedDate);
  }, [selectedDate]);

  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  // --- רכיב פריט ביומן ---
  const TimelineItem = ({ item, index, isLast }: any) => {
    let IconComponent = Clock; // ברירת מחדל
    let color = COLORS.primary;
    let title = 'פעילות';
    let subtitle = '';
    let badgeColor = '#e0e7ff';

    if (item.type === 'feeding') {
      IconComponent = Utensils;
      color = COLORS.food;
      badgeColor = '#fce7f3';
      title = item.subType === 'bottle' ? 'האכלה (בקבוק)' : 'הנקה';
      subtitle = item.subType === 'bottle' ? `${item.amount} מ"ל` : `משך: ${formatTime(item.totalDuration || item.duration || 0)}`;
    } else if (item.type === 'diaper') {
      IconComponent = Droplets;
      color = COLORS.diaper;
      badgeColor = '#e0f2fe';
      title = 'החלפת חיתול';
      const typeMap: any = { 'pee': 'פיפי', 'poo': 'קקי', 'both': 'גם וגם' };
      subtitle = typeMap[item.subType] || 'החלפה';
    } else if (item.type === 'sleep') {
      IconComponent = Moon;
      color = COLORS.sleep;
      badgeColor = '#ede9fe';
      title = 'שינה';
      subtitle = 'שינה נעימה';
    }

    const timeString = format(item.dateObj, 'HH:mm');

    return (
      <View style={styles.timelineItem}>
        <View style={styles.timeColumn}>
          <Text style={styles.timeText}>{timeString}</Text>
        </View>
        
        <View style={styles.lineColumn}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          {!isLast && <View style={styles.line} />}
        </View>

        <View style={styles.cardColumn}>
          <View style={styles.eventCard}>
            <View style={[styles.iconBox, { backgroundColor: badgeColor }]}>
              <IconComponent size={20} color={color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} דק'`;
  };

  const SummaryCard = ({ icon: Icon, title, value, unit, color }: any) => (
    <View style={styles.summaryCard}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Icon size={20} color={color} />
      </View>
      <View>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={[styles.summaryValue, { color }]}>{value} <Text style={styles.unit}>{unit}</Text></Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.headerContainer}>
        <LinearGradient colors={['#4f46e5', '#3730a3']} style={StyleSheet.absoluteFill} />
        <Text style={styles.headerTitle}>היומן של עלמא</Text>
        
        <View style={styles.datePickerRow}>
          <TouchableOpacity onPress={() => setSelectedDate(subDays(selectedDate, 1))} style={styles.arrowBtn}>
            <ChevronLeft size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
            <Calendar size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.dateText}>
              {format(selectedDate, 'EEEE, d MMMM', { locale: he })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setSelectedDate(addDays(selectedDate, 1))} 
            style={[styles.arrowBtn, isSameDay(selectedDate, new Date()) && { opacity: 0.5 }]}
            disabled={isSameDay(selectedDate, new Date())}
          >
            <ChevronRight size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <CheckCircle size={18} color="#10b981" />
            <Text style={styles.insightTitle}>סיכום יומי</Text>
          </View>
          <Text style={styles.insightText}>
             {events.length > 0 ? `סה״כ נרשמו ${events.length} פעילויות היום.` : 'לא נרשמה פעילות בתאריך זה.'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard icon={Utensils} title="אוכל" value={dailyStats.food} unit='מ"ל' color={COLORS.food} />
          <SummaryCard icon={Droplets} title="חיתולים" value={dailyStats.diapers} unit='יח' color={COLORS.diaper} />
          <SummaryCard icon={Moon} title="שינה" value="--" unit='שעות' color={COLORS.sleep} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}><Clock size={40} color="#cbd5e1" /></View>
            <Text style={styles.emptyTitle}>אין פעילות בתאריך זה</Text>
            <Text style={styles.emptySub}>הוסיפו רישום דרך מסך הבית</Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <TimelineItem item={item} index={index} isLast={index === events.length - 1} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
          locale="he-IL"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  headerContainer: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: 20 },
  datePickerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  dateButton: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  dateText: { color: 'white', fontSize: 16, fontWeight: '700' },
  arrowBtn: { padding: 8 },
  contentContainer: { flex: 1, paddingHorizontal: 20, marginTop: -20 },
  insightCard: { backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  insightHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 },
  insightTitle: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  insightText: { fontSize: 16, color: '#1e293b', textAlign: 'right' },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 20 },
  summaryCard: { width: width / 3.5, backgroundColor: 'white', borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryTitle: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  unit: { fontSize: 12, fontWeight: '500' },
  listContent: { paddingBottom: 100 },
  timelineItem: { flexDirection: 'row-reverse', minHeight: 80 },
  timeColumn: { width: 50, alignItems: 'flex-end', paddingTop: 18 },
  timeText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  lineColumn: { width: 40, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 22, borderWidth: 3, borderColor: '#f1f5f9', zIndex: 2 },
  line: { width: 2, flex: 1, backgroundColor: '#e2e8f0', position: 'absolute', top: 30, bottom: -10, zIndex: 1 },
  cardColumn: { flex: 1, paddingBottom: 16 },
  eventCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 16 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 2, textAlign: 'right' },
  cardSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'right' },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 4 },
  emptySub: { fontSize: 14, color: '#94a3b8' }
});