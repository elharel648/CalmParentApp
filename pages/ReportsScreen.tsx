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
  ScrollView,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Moon, Milk, Droplets, Calendar, ChevronRight, ChevronLeft, 
  Clock, Utensils, CheckCircle, TrendingUp, BarChart2, Activity
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay, subWeeks } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#4f46e5',
  secondary: '#818cf8',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1e293b',
  subText: '#64748b',
  food: '#ec4899',   
  sleep: '#8b5cf6',  
  diaper: '#0ea5e9',
  success: '#10b981'
};

const CHART_CONFIG = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  decimalPlaces: 0,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  propsForBackgroundLines: {
      strokeDasharray: "", // קו רציף, פותר בעיות רינדור מסוימות
      stroke: "#e3e3e3"
  }
};

export default function ReportsScreen() {
  const [viewMode, setViewMode] = useState('daily'); 
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [events, setEvents] = useState([]);
  const [dailyStats, setDailyStats] = useState({ food: 0, sleep: 0, diapers: 0 });
  // אתחול עם נתוני דמה (אפסים) כדי למנוע קריסה בטעינה הראשונה
  const [weeklyData, setWeeklyData] = useState({ 
      labels: ['א','ב','ג','ד','ה','ו','ש'], 
      food: [0,0,0,0,0,0,0], 
      sleep: [0,0,0,0,0,0,0] 
  });
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- Daily Logic (נשאר אותו דבר) ---
  const fetchDailyData = async (date) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const start = startOfDay(date);
      const end = endOfDay(date);

      const q = query(
        collection(db, 'events'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', start),
        where('timestamp', '<=', end),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedEvents = [];
      let stats = { food: 0, sleep: 0, diapers: 0 };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp);
        fetchedEvents.push({ id: doc.id, ...data, dateObj });

        if (data.type === 'feeding') stats.food += (parseInt(data.amount) || 0);
        if (data.type === 'diaper') stats.diapers += 1;
        if (data.type === 'sleep' && data.duration) stats.sleep += (data.duration / 60); 
      });

      setEvents(fetchedEvents);
      setDailyStats(stats);
    } catch (error) {
      console.log("Error Daily:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- Weekly Logic (המתוקן!) ---
  const fetchWeeklyTrends = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const end = endOfDay(new Date());
      const start = startOfDay(subDays(new Date(), 6)); 

      const q = query(
        collection(db, 'events'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', start),
        orderBy('timestamp', 'asc')
      );

      const querySnapshot = await getDocs(q);
      
      const daysMap = {};
      // יצירת מפת ימים עם ערכי 0 כברירת מחדל
      for (let i = 0; i < 7; i++) {
        const d = subDays(new Date(), i);
        const key = format(d, 'dd/MM');
        daysMap[key] = { food: 0, sleep: 0 };
      }

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const dateObj = data.timestamp.toDate();
        const key = format(dateObj, 'dd/MM');

        if (daysMap[key]) {
          if (data.type === 'feeding') daysMap[key].food += (parseInt(data.amount) || 0);
          // המרה לשעות, מוודאים שזה מספר
          if (data.type === 'sleep' && data.duration) {
              const hours = data.duration / 3600;
              if (!isNaN(hours)) daysMap[key].sleep += hours;
          }
        }
      });

      const labels = Object.keys(daysMap).reverse();
      
      // ✅ תיקון קריטי: מוודאים שאין NaN או Infinity במערכים
      const foodData = labels.map(l => {
          const val = daysMap[l].food;
          return (isNaN(val) || !isFinite(val)) ? 0 : val;
      });
      
      const sleepData = labels.map(l => {
          const val = parseFloat(daysMap[l].sleep.toFixed(1));
          return (isNaN(val) || !isFinite(val)) ? 0 : val;
      });

      // אם כל הנתונים הם 0, הגרף לפעמים קורס. נוסיף ערך פיקטיבי זעיר אם הכל 0 (טריק ידוע)
      // או פשוט נסמוך על התיקון למעלה. במקרה הכי גרוע, נציג הודעה "אין נתונים".
      
      setWeeklyData({ labels, food: foodData, sleep: sleepData });

    } catch (e) {
      console.log("Error Weekly:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'daily') fetchDailyData(selectedDate);
    else fetchWeeklyTrends();
  }, [selectedDate, viewMode]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (viewMode === 'daily') fetchDailyData(selectedDate);
    else fetchWeeklyTrends();
  }, [selectedDate, viewMode]);

  // --- קומפוננטות ---

  const InsightBadge = ({ type, value, avg }) => {
    const diff = value - avg;
    const isHigher = diff > 0;
    const percent = avg > 0 ? Math.round((Math.abs(diff) / avg) * 100) : 0;
    
    let text = "בממוצע הרגיל";
    let color = COLORS.subText;

    if (percent > 10) {
      text = isHigher ? `${percent}% מעל הממוצע` : `${percent}% מתחת לממוצע`;
      color = isHigher ? COLORS.success : COLORS.food; 
    }

    return (
      <View style={[styles.insightBadge, { backgroundColor: color + '15' }]}>
        <TrendingUp size={14} color={color} style={{ transform: [{ scaleY: isHigher ? 1 : -1 }]}} />
        <Text style={[styles.insightBadgeText, { color }]}>{text}</Text>
      </View>
    );
  };

  const TimelineItem = ({ item, index, isLast }) => {
    let IconComponent = Clock;
    let color = COLORS.primary;
    let title = 'פעילות';
    let subtitle = '';
    
    if (item.type === 'feeding') {
      IconComponent = Utensils;
      color = COLORS.food;
      title = item.subType === 'bottle' ? 'בקבוק' : 'הנקה';
      subtitle = `${item.amount || '-'} מ"ל`;
    } else if (item.type === 'diaper') {
      IconComponent = Droplets;
      color = COLORS.diaper;
      title = 'חיתול';
      subtitle = item.subType === 'pee' ? 'פיפי' : 'קקי';
    } else if (item.type === 'sleep') {
      IconComponent = Moon;
      color = COLORS.sleep;
      title = 'שינה';
      subtitle = `${Math.round((item.duration || 0) / 60)} דק'`;
    }

    return (
      <View style={styles.timelineRow}>
        <Text style={styles.timeLabel}>{format(item.dateObj, 'HH:mm')}</Text>
        <View style={styles.timelineLineContainer}>
          <View style={[styles.timelineDot, { backgroundColor: color }]} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>
        <View style={styles.timelineCard}>
          <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
            <IconComponent size={18} color={color} />
          </View>
          <View>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
    );
  };

  const TrendsView = () => {
      // בדיקת תקינות לפני רינדור
      const isFoodEmpty = weeklyData.food.every(v => v === 0);
      const isSleepEmpty = weeklyData.sleep.every(v => v === 0);

      return (
        <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          
          {/* גרף אוכל */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>🍼 צריכת אוכל שבועית (מ״ל)</Text>
            {isFoodEmpty ? (
                <View style={styles.emptyChartState}>
                    <Text style={styles.emptyChartText}>אין נתוני האכלה השבוע</Text>
                </View>
            ) : (
                <BarChart
                data={{
                    labels: weeklyData.labels,
                    datasets: [{ data: weeklyData.food }]
                }}
                width={width - 48}
                height={220}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                    ...CHART_CONFIG,
                    color: (opacity = 1) => COLORS.food,
                }}
                style={styles.chart}
                showValuesOnTopOfBars
                fromZero // חשוב! מתחיל את הגרף מ-0 תמיד
                />
            )}
            <Text style={styles.chartInsight}>סה״כ השבוע: {weeklyData.food.reduce((a,b)=>a+b,0)} מ״ל</Text>
          </View>

          {/* גרף שינה */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>😴 שעות שינה (שעות)</Text>
            {isSleepEmpty ? (
                <View style={styles.emptyChartState}>
                    <Text style={styles.emptyChartText}>אין נתוני שינה השבוע</Text>
                </View>
            ) : (
                <LineChart
                data={{
                    labels: weeklyData.labels,
                    datasets: [{ data: weeklyData.sleep }]
                }}
                width={width - 48}
                height={220}
                chartConfig={{
                    ...CHART_CONFIG,
                    color: (opacity = 1) => COLORS.sleep,
                    propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.sleep }
                }}
                style={styles.chart}
                bezier
                fromZero // חשוב!
                />
            )}
            <Text style={styles.chartInsight}>ממוצע יומי: {(weeklyData.sleep.reduce((a,b)=>a+b,0)/7).toFixed(1)} שעות</Text>
          </View>
        </ScrollView>
      );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.headerContainer}>
        <LinearGradient colors={['#4f46e5', '#6366f1']} style={StyleSheet.absoluteFill} />
        <Text style={styles.headerTitle}>מרכז הבקרה 📊</Text>
        
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'daily' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('daily')}
          >
            <Text style={[styles.toggleText, viewMode === 'daily' && styles.toggleTextActive]}>יומי</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'trends' && styles.toggleBtnActive]} 
            onPress={() => setViewMode('trends')}
          >
            <Text style={[styles.toggleText, viewMode === 'trends' && styles.toggleTextActive]}>מגמות</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'daily' && (
          <View style={styles.dateNav}>
            <TouchableOpacity onPress={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
              <Calendar color="white" size={18} style={{marginRight: 8}}/>
              <Text style={styles.dateText}>{format(selectedDate, 'EEEE, d MMMM', { locale: he })}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))} disabled={isSameDay(selectedDate, new Date())}>
              <ChevronRight color="white" size={24} style={{opacity: isSameDay(selectedDate, new Date()) ? 0.5 : 1}} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
        ) : viewMode === 'daily' ? (
          <>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={[styles.iconCircle, {backgroundColor: '#fce7f3'}]}><Utensils size={20} color={COLORS.food}/></View>
                <Text style={styles.summaryValue}>{dailyStats.food}</Text>
                <Text style={styles.summaryLabel}>מ״ל אוכל</Text>
                <InsightBadge type="food" value={dailyStats.food} avg={600} /> 
              </View>
              <View style={styles.summaryCard}>
                <View style={[styles.iconCircle, {backgroundColor: '#e0f2fe'}]}><Droplets size={20} color={COLORS.diaper}/></View>
                <Text style={styles.summaryValue}>{dailyStats.diapers}</Text>
                <Text style={styles.summaryLabel}>חיתולים</Text>
                <InsightBadge type="diaper" value={dailyStats.diapers} avg={6} />
              </View>
            </View>

            <FlatList
              data={events}
              keyExtractor={item => item.id}
              renderItem={({item, index}) => <TimelineItem item={item} index={index} isLast={index === events.length - 1} />}
              contentContainerStyle={{paddingBottom: 100}}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDailyData(selectedDate)} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Activity size={40} color="#cbd5e1" />
                  <Text style={styles.emptyText}>אין פעילות בתאריך זה</Text>
                </View>
              }
            />
          </>
        ) : (
          <TrendsView />
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker value={selectedDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setSelectedDate(d); }} maximumDate={new Date()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerContainer: { height: 200, paddingTop: 50, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 15 },
  toggleContainer: { flexDirection: 'row-reverse', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4, marginBottom: 15 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  toggleTextActive: { color: COLORS.primary, fontWeight: '700' },
  dateNav: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  dateBtn: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  dateText: { color: 'white', fontWeight: '600' },
  contentContainer: { flex: 1, paddingHorizontal: 20, marginTop: -20 },
  summaryGrid: { flexDirection: 'row-reverse', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  summaryLabel: { fontSize: 13, color: '#64748b', fontWeight: '500', marginBottom: 6 },
  insightBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  insightBadgeText: { fontSize: 10, fontWeight: '700' },
  
  timelineRow: { flexDirection: 'row-reverse', marginBottom: 0 },
  timeLabel: { width: 45, textAlign: 'left', fontSize: 12, color: '#94a3b8', fontWeight: '600', paddingTop: 18 },
  timelineLineContainer: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 20, zIndex: 2, borderWidth: 2, borderColor: '#f8fafc' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginTop: -2, marginBottom: -10 },
  timelineCard: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 16, marginBottom: 12, marginRight: 10, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#334155' },
  cardSubtitle: { fontSize: 13, color: '#64748b' },
  emptyState: { alignItems: 'center', marginTop: 50, gap: 10 },
  emptyText: { color: '#94a3b8', fontSize: 16 },

  chartCard: { backgroundColor: 'white', borderRadius: 24, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, alignItems: 'center' },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 15, alignSelf: 'flex-end' },
  chart: { borderRadius: 16, marginVertical: 8 },
  chartInsight: { fontSize: 12, color: '#64748b', marginTop: 10, fontWeight: '500' },
  emptyChartState: { height: 220, width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16 },
  emptyChartText: { color: '#94a3b8', fontWeight: '600' }
});