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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Moon, Droplets, Calendar, ChevronRight, ChevronLeft,
  Clock, Utensils, Activity, Baby, Pill, Sparkles
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useActiveChild } from '../context/ActiveChildContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Minimal color palette
const COLORS = {
  primary: '#6366F1',
  food: '#F59E0B',
  sleep: '#8B5CF6',
  diaper: '#06B6D4',
  supplement: '#10B981',
  text: '#1F2937',
  subText: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
};

export default function ReportsScreen() {
  const { theme } = useTheme();
  const { activeChild } = useActiveChild();

  const [viewMode, setViewMode] = useState<'daily' | 'trends'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [events, setEvents] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState({
    food: 0, foodCount: 0,
    sleep: 0, sleepCount: 0,
    diapers: 0,
    supplements: 0,
  });

  const [weeklyData, setWeeklyData] = useState({
    labels: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
    food: [0, 0, 0, 0, 0, 0, 0],
    sleep: [0, 0, 0, 0, 0, 0, 0],
    diapers: [0, 0, 0, 0, 0, 0, 0]
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch daily data
  const fetchDailyData = async (date: Date) => {
    if (!activeChild?.childId) return;

    setLoading(true);
    try {
      const start = startOfDay(date);
      const end = endOfDay(date);

      const q = query(
        collection(db, 'events'),
        where('childId', '==', activeChild.childId),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end))
      );

      const querySnapshot = await getDocs(q);
      const fetchedEvents: any[] = [];
      let stats = {
        food: 0, foodCount: 0,
        sleep: 0, sleepCount: 0,
        diapers: 0,
        supplements: 0
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp);
        fetchedEvents.push({ id: doc.id, ...data, dateObj });

        if (data.type === 'feeding' || data.type === 'food') {
          stats.food += (parseInt(data.amount) || 0);
          stats.foodCount += 1;
        }
        if (data.type === 'diaper') stats.diapers += 1;
        if (data.type === 'sleep' && data.duration) {
          stats.sleep += (data.duration / 60);
          stats.sleepCount += 1;
        }
        if (data.type === 'supplement') stats.supplements += 1;
      });

      fetchedEvents.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
      setEvents(fetchedEvents);
      setDailyStats(stats);
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch weekly trends
  const fetchWeeklyTrends = async () => {
    if (!activeChild?.childId) return;

    setLoading(true);
    try {
      const start = startOfDay(subDays(new Date(), 6));

      const q = query(
        collection(db, 'events'),
        where('childId', '==', activeChild.childId),
        where('timestamp', '>=', Timestamp.fromDate(start))
      );

      const querySnapshot = await getDocs(q);

      const daysMap: { [key: string]: { food: number; sleep: number; diapers: number } } = {};

      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const key = format(d, 'dd/MM');
        daysMap[key] = { food: 0, sleep: 0, diapers: 0 };
      }

      querySnapshot.forEach(doc => {
        const data = doc.data();
        const dateObj = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp);
        const key = format(dateObj, 'dd/MM');

        if (daysMap[key]) {
          if (data.type === 'feeding' || data.type === 'food') {
            daysMap[key].food += (parseInt(data.amount) || 0);
          }
          if (data.type === 'sleep' && data.duration) {
            const hours = data.duration / 3600;
            if (!isNaN(hours)) daysMap[key].sleep += hours;
          }
          if (data.type === 'diaper') daysMap[key].diapers += 1;
        }
      });

      const labels = Object.keys(daysMap);
      setWeeklyData({
        labels,
        food: labels.map(l => daysMap[l].food || 0),
        sleep: labels.map(l => parseFloat(daysMap[l].sleep.toFixed(1)) || 0),
        diapers: labels.map(l => daysMap[l].diapers || 0)
      });
    } catch (e) {
      console.log("Error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'daily') fetchDailyData(selectedDate);
    else fetchWeeklyTrends();
  }, [selectedDate, viewMode, activeChild?.childId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (viewMode === 'daily') fetchDailyData(selectedDate);
    else fetchWeeklyTrends();
  }, [selectedDate, viewMode, activeChild?.childId]);

  // ========== COMPONENTS ==========

  // Minimal Stat Card
  const StatCard = ({ icon: Icon, value, label, color, gradient }: any) => (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <View style={styles.statIconWrap}>
        <LinearGradient colors={gradient} style={styles.statIcon}>
          <Icon size={20} color="#fff" strokeWidth={2.5} />
        </LinearGradient>
      </View>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );

  // Timeline Item - RTL, Minimal
  const TimelineItem = ({ item, isLast }: { item: any; isLast: boolean }) => {
    let IconComp = Clock, color = COLORS.primary, title = 'פעילות', subtitle = '';

    if (item.type === 'feeding' || item.type === 'food') {
      IconComp = Utensils; color = COLORS.food;
      title = item.subType === 'bottle' ? 'בקבוק' : item.subType === 'breast' ? 'הנקה' : 'אוכל';
      subtitle = item.amount ? `${item.amount} מ"ל` : '';
    } else if (item.type === 'diaper') {
      IconComp = Droplets; color = COLORS.diaper;
      title = 'חיתול';
      subtitle = item.subType === 'pee' ? 'רטוב' : item.subType === 'poop' ? 'מלוכלך' : '';
    } else if (item.type === 'sleep') {
      IconComp = Moon; color = COLORS.sleep;
      title = 'שינה';
      const mins = Math.round((item.duration || 0) / 60);
      subtitle = `${mins} דק'`;
    } else if (item.type === 'supplement') {
      IconComp = Pill; color = COLORS.supplement;
      title = 'תוסף';
      subtitle = item.note || '';
    }

    return (
      <View style={styles.timelineItem}>
        {/* Right side - content card */}
        <View style={[styles.timelineCard, { backgroundColor: theme.card }]}>
          <View style={styles.timelineContent}>
            <Text style={[styles.timelineTitle, { color: theme.textPrimary }]}>{title}</Text>
            {subtitle ? <Text style={[styles.timelineSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
          </View>
          <View style={[styles.timelineIcon, { backgroundColor: color + '15' }]}>
            <IconComp size={18} color={color} strokeWidth={2.5} />
          </View>
        </View>

        {/* Center line */}
        <View style={styles.timelineMiddle}>
          <View style={[styles.timelineDot, { backgroundColor: color }]} />
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: COLORS.border }]} />}
        </View>

        {/* Left side - time */}
        <Text style={[styles.timelineTime, { color: theme.textSecondary }]}>
          {format(item.dateObj, 'HH:mm')}
        </Text>
      </View>
    );
  };

  // Daily View
  const DailyView = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Stats Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        <StatCard icon={Utensils} value={dailyStats.food} label="מ״ל אוכל" color={COLORS.food} gradient={['#FEF3C7', '#F59E0B'] as const} />
        <StatCard icon={Moon} value={Math.floor(dailyStats.sleep / 60)} label="שעות שינה" color={COLORS.sleep} gradient={['#EDE9FE', '#8B5CF6'] as const} />
        <StatCard icon={Droplets} value={dailyStats.diapers} label="חיתולים" color={COLORS.diaper} gradient={['#CFFAFE', '#06B6D4'] as const} />
        <StatCard icon={Pill} value={dailyStats.supplements} label="תוספים" color={COLORS.supplement} gradient={['#D1FAE5', '#10B981'] as const} />
      </ScrollView>

      {/* Timeline Header */}
      <View style={styles.sectionHeader}>
        <Sparkles size={18} color={COLORS.primary} strokeWidth={2.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>טיימליין יומי</Text>
      </View>

      {/* Timeline */}
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Activity size={40} color={COLORS.border} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>אין פעילות היום</Text>
        </View>
      ) : (
        events.map((item, index) => (
          <TimelineItem key={item.id} item={item} isLast={index === events.length - 1} />
        ))
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Trends View
  const TrendsView = () => {
    const chartConfig = {
      backgroundGradientFrom: "#fff",
      backgroundGradientTo: "#fff",
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
      labelColor: () => COLORS.subText,
      strokeWidth: 2,
      barPercentage: 0.6,
      propsForBackgroundLines: { stroke: COLORS.border }
    };

    const ChartCard = ({ title, icon: Icon, gradient, children }: any) => (
      <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
        <View style={styles.chartHeader}>
          <LinearGradient colors={gradient} style={styles.chartIconBadge}>
            <Icon size={18} color="#fff" strokeWidth={2.5} />
          </LinearGradient>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>{title}</Text>
        </View>
        {children}
      </View>
    );

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Food Chart */}
        <ChartCard title="צריכת אוכל שבועית" icon={Utensils} gradient={['#FEF3C7', '#F59E0B'] as const}>
          {weeklyData.food.every(v => v === 0) ? (
            <Text style={styles.noDataText}>אין נתונים השבוע</Text>
          ) : (
            <BarChart
              data={{ labels: weeklyData.labels, datasets: [{ data: weeklyData.food }] }}
              width={width - 64}
              height={160}
              yAxisLabel="" yAxisSuffix=""
              chartConfig={{ ...chartConfig, color: () => COLORS.food }}
              style={styles.chart}
              showValuesOnTopOfBars fromZero
            />
          )}
        </ChartCard>

        {/* Sleep Chart */}
        <ChartCard title="שעות שינה" icon={Moon} gradient={['#EDE9FE', '#8B5CF6'] as const}>
          {weeklyData.sleep.every(v => v === 0) ? (
            <Text style={styles.noDataText}>אין נתונים השבוע</Text>
          ) : (
            <LineChart
              data={{ labels: weeklyData.labels, datasets: [{ data: weeklyData.sleep }] }}
              width={width - 64}
              height={160}
              chartConfig={{ ...chartConfig, color: () => COLORS.sleep }}
              style={styles.chart}
              bezier fromZero
            />
          )}
        </ChartCard>

        {/* Diapers Chart */}
        <ChartCard title="החלפות חיתולים" icon={Droplets} gradient={['#CFFAFE', '#06B6D4'] as const}>
          {weeklyData.diapers.every(v => v === 0) ? (
            <Text style={styles.noDataText}>אין נתונים השבוע</Text>
          ) : (
            <BarChart
              data={{ labels: weeklyData.labels, datasets: [{ data: weeklyData.diapers }] }}
              width={width - 64}
              height={160}
              yAxisLabel="" yAxisSuffix=""
              chartConfig={{ ...chartConfig, color: () => COLORS.diaper }}
              style={styles.chart}
              showValuesOnTopOfBars fromZero
            />
          )}
        </ChartCard>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={['#6366F1', '#8B5CF6'] as const} style={styles.header}>
        {activeChild?.childName && (
          <View style={styles.childBadge}>
            <Baby size={14} color="#fff" />
            <Text style={styles.childName}>{activeChild.childName}</Text>
          </View>
        )}

        <Text style={styles.headerTitle}>מרכז הבקרה 📊</Text>

        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'daily' && styles.toggleActive]}
            onPress={() => setViewMode('daily')}
          >
            <Text style={[styles.toggleText, viewMode === 'daily' && styles.toggleTextActive]}>יומי</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'trends' && styles.toggleActive]}
            onPress={() => setViewMode('trends')}
          >
            <Text style={[styles.toggleText, viewMode === 'trends' && styles.toggleTextActive]}>מגמות</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker - Daily only */}
        {viewMode === 'daily' && (
          <View style={styles.dateRow}>
            <TouchableOpacity onPress={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronRight color="#fff" size={22} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateBtn}>
              <Calendar size={16} color="#fff" />
              <Text style={styles.dateText}>{format(selectedDate, 'd MMMM', { locale: he })}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedDate(addDays(selectedDate, 1))}
              disabled={isSameDay(selectedDate, new Date())}
            >
              <ChevronLeft color="#fff" size={22} style={{ opacity: isSameDay(selectedDate, new Date()) ? 0.3 : 1 }} />
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
        ) : !activeChild?.childId ? (
          <View style={styles.emptyState}>
            <Baby size={48} color={COLORS.border} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>אין ילד פעיל</Text>
          </View>
        ) : viewMode === 'daily' ? (
          <DailyView />
        ) : (
          <TrendsView />
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(e, d) => { setShowDatePicker(false); if (d) setSelectedDate(d); }}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  childBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    opacity: 0.9,
    marginBottom: 8,
  },
  childName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 16 },

  toggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleActive: { backgroundColor: '#fff' },
  toggleText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  toggleTextActive: { color: '#6366F1', fontWeight: '700' },

  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  dateText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Content
  content: { flex: 1, paddingTop: 16 },

  // Stats
  statsRow: { paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  statCard: {
    width: 100,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: { marginBottom: 8 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Section Header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  // Timeline
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 12 },
  timelineCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  timelineIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  timelineContent: { flex: 1, alignItems: 'flex-end' },
  timelineTitle: { fontSize: 15, fontWeight: '600' },
  timelineSubtitle: { fontSize: 13, marginTop: 2 },
  timelineMiddle: { width: 32, alignItems: 'center', paddingTop: 18 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { width: 2, flex: 1, marginTop: 4, marginBottom: -12 },
  timelineTime: { width: 45, textAlign: 'left', fontSize: 12, fontWeight: '600', paddingTop: 18 },

  // Charts
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  chartHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
  chartIconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chartTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'right' },
  chart: { borderRadius: 12, alignSelf: 'center' },
  noDataText: { textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 },

  // Empty
  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500' },
});