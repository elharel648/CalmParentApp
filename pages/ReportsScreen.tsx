// pages/ReportsScreen.tsx - Comprehensive Reports Dashboard
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Alert,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  Moon, Droplets, Calendar, ChevronRight, ChevronLeft,
  Utensils, Baby, Pill, TrendingUp, TrendingDown, Download,
  Clock, Award, BarChart2, Activity, Thermometer, X, Check, Trophy, Timer
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay, subWeeks, subMonths, differenceInDays, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useActiveChild } from '../context/ActiveChildContext';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import ChildPicker from '../components/Home/ChildPicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// TypeScript interfaces
interface DailyStats {
  food: number;
  foodCount: number;
  sleep: number;
  sleepCount: number;
  diapers: number;
  supplements: number;
  feedingTypes: { bottle: number; breast: number; solids: number };
}

interface TimeInsights {
  avgSleepTime: string;
  avgWakeTime: string;
  avgFeedingInterval: number;
  nightWakeups: number;
  longestSleep: number;
  biggestFeeding: number;
  bestSleepDay: string;
}

interface WeekComparison {
  sleepChange: number;
  feedingChange: number;
  diaperChange: number;
}

interface WeeklyData {
  labels: string[];
  food: number[];
  sleep: number[];
  diapers: number[];
}

type TimeRange = 'day' | 'week' | 'month' | 'custom';
type TabName = 'summary' | 'insights' | 'charts';

export default function ReportsScreen() {
  const { theme, isDarkMode } = useTheme();
  const { activeChild } = useActiveChild();

  // State
  const [activeTab, setActiveTab] = useState<TabName>('summary');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState(subWeeks(new Date(), 1));
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showRangeModal, setShowRangeModal] = useState(false);

  const [dailyStats, setDailyStats] = useState<DailyStats>({
    food: 0, foodCount: 0,
    sleep: 0, sleepCount: 0,
    diapers: 0, supplements: 0,
    feedingTypes: { bottle: 0, breast: 0, solids: 0 }
  });

  const [prevWeekStats, setPrevWeekStats] = useState<DailyStats | null>(null);
  const [timeInsights, setTimeInsights] = useState<TimeInsights | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData>({ labels: [], food: [], sleep: [], diapers: [] });
  const [dayBreakdown, setDayBreakdown] = useState<{ [day: string]: DailyStats }>({});

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allEvents, setAllEvents] = useState<any[]>([]);

  // Get date range
  const getDateRange = useCallback(() => {
    const end = endOfDay(new Date());
    let start: Date;

    switch (timeRange) {
      case 'day':
        start = startOfDay(selectedDate);
        return { start, end: endOfDay(selectedDate) };
      case 'week':
        start = startOfDay(subWeeks(new Date(), 1));
        break;
      case 'month':
        start = startOfDay(subMonths(new Date(), 1));
        break;
      case 'custom':
        return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
      default:
        start = startOfDay(subWeeks(new Date(), 1));
    }
    return { start, end };
  }, [timeRange, selectedDate, customStartDate, customEndDate]);

  // Fetch data
  const fetchData = async () => {
    if (!activeChild?.childId) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const daysInRange = differenceInDays(end, start) + 1;

      // Main query
      const q = query(
        collection(db, 'events'),
        where('childId', '==', activeChild.childId),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end))
      );

      const querySnapshot = await getDocs(q);
      const events: any[] = [];

      const stats: DailyStats = {
        food: 0, foodCount: 0, sleep: 0, sleepCount: 0,
        diapers: 0, supplements: 0,
        feedingTypes: { bottle: 0, breast: 0, solids: 0 }
      };

      // Day breakdown for charts
      const dayMap: { [key: string]: DailyStats } = {};
      for (let i = daysInRange - 1; i >= 0; i--) {
        const d = subDays(end, i);
        const key = format(d, 'dd/MM');
        dayMap[key] = {
          food: 0, foodCount: 0, sleep: 0, sleepCount: 0,
          diapers: 0, supplements: 0,
          feedingTypes: { bottle: 0, breast: 0, solids: 0 }
        };
      }

      // Time insights tracking
      const sleepTimes: number[] = [];
      const wakeTimes: number[] = [];
      const feedingTimes: number[] = [];
      let maxSleepDuration = 0;
      let maxFeedingAmount = 0;
      const sleepByDay: { [day: string]: number } = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.timestamp instanceof Timestamp
          ? data.timestamp.toDate()
          : new Date(data.timestamp);

        events.push({ id: doc.id, ...data, dateObj });
        const dayKey = format(dateObj, 'dd/MM');

        if (data.type === 'feeding' || data.type === 'food') {
          const amount = parseInt(data.amount) || 0;
          stats.food += amount;
          stats.foodCount += 1;
          if (data.subType === 'bottle') stats.feedingTypes.bottle += 1;
          else if (data.subType === 'breast') stats.feedingTypes.breast += 1;
          else if (data.subType === 'solids') stats.feedingTypes.solids += 1;

          if (dayMap[dayKey]) {
            dayMap[dayKey].food += amount;
            dayMap[dayKey].foodCount += 1;
          }

          feedingTimes.push(dateObj.getTime());
          if (amount > maxFeedingAmount) maxFeedingAmount = amount;
        }

        if (data.type === 'diaper') {
          stats.diapers += 1;
          if (dayMap[dayKey]) dayMap[dayKey].diapers += 1;
        }

        if (data.type === 'sleep' && data.duration) {
          const hours = data.duration / 3600;
          stats.sleep += hours;
          stats.sleepCount += 1;
          if (dayMap[dayKey]) {
            dayMap[dayKey].sleep += hours;
            dayMap[dayKey].sleepCount += 1;
          }

          // Track sleep patterns
          const hour = dateObj.getHours();
          if (hour >= 18 || hour < 6) sleepTimes.push(hour);
          if (data.duration > maxSleepDuration) maxSleepDuration = data.duration;

          const dayName = format(dateObj, 'EEEE', { locale: he });
          sleepByDay[dayName] = (sleepByDay[dayName] || 0) + hours;
        }

        if (data.type === 'supplement') {
          stats.supplements += 1;
          if (dayMap[dayKey]) dayMap[dayKey].supplements += 1;
        }
      });

      // Calculate time insights
      let avgFeedingInterval = 0;
      if (feedingTimes.length > 1) {
        feedingTimes.sort((a, b) => a - b);
        let totalInterval = 0;
        for (let i = 1; i < feedingTimes.length; i++) {
          totalInterval += feedingTimes[i] - feedingTimes[i - 1];
        }
        avgFeedingInterval = totalInterval / (feedingTimes.length - 1) / (1000 * 60 * 60); // Hours
      }

      // Best sleep day
      let bestDay = '';
      let bestSleep = 0;
      Object.entries(sleepByDay).forEach(([day, hours]) => {
        if (hours > bestSleep) {
          bestSleep = hours;
          bestDay = day;
        }
      });

      setTimeInsights({
        avgSleepTime: sleepTimes.length > 0 ? `${Math.round(sleepTimes.reduce((a, b) => a + b, 0) / sleepTimes.length)}:00` : '--:--',
        avgWakeTime: '--:--',
        avgFeedingInterval: Math.round(avgFeedingInterval * 10) / 10,
        nightWakeups: 0,
        longestSleep: Math.round(maxSleepDuration / 3600 * 10) / 10,
        biggestFeeding: maxFeedingAmount,
        bestSleepDay: bestDay || 'לא ידוע',
      });

      setDailyStats(stats);
      setDayBreakdown(dayMap);
      setAllEvents(events);

      // Weekly chart data
      const labels = Object.keys(dayMap);
      const displayLabels = daysInRange > 14
        ? labels.filter((_, i) => i % Math.ceil(daysInRange / 7) === 0)
        : labels;

      setWeeklyData({
        labels: displayLabels,
        food: labels.map(l => dayMap[l].food || 0),
        sleep: labels.map(l => parseFloat(dayMap[l].sleep.toFixed(1)) || 0),
        diapers: labels.map(l => dayMap[l].diapers || 0)
      });

      // Fetch previous period for comparison
      if (timeRange !== 'custom') {
        const prevStart = subDays(start, daysInRange);
        const prevEnd = subDays(start, 1);

        const prevQ = query(
          collection(db, 'events'),
          where('childId', '==', activeChild.childId),
          where('timestamp', '>=', Timestamp.fromDate(prevStart)),
          where('timestamp', '<=', Timestamp.fromDate(endOfDay(prevEnd)))
        );

        const prevSnapshot = await getDocs(prevQ);
        const prevStats: DailyStats = {
          food: 0, foodCount: 0, sleep: 0, sleepCount: 0,
          diapers: 0, supplements: 0,
          feedingTypes: { bottle: 0, breast: 0, solids: 0 }
        };

        prevSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === 'feeding' || data.type === 'food') {
            prevStats.food += (parseInt(data.amount) || 0);
            prevStats.foodCount += 1;
          }
          if (data.type === 'diaper') prevStats.diapers += 1;
          if (data.type === 'sleep' && data.duration) {
            prevStats.sleep += (data.duration / 3600);
            prevStats.sleepCount += 1;
          }
        });

        setPrevWeekStats(prevStats);
      }

    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, timeRange, activeChild?.childId, customStartDate, customEndDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedDate, timeRange, activeChild?.childId]);

  // Export report
  const handleExport = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const avgSleep = dailyStats.sleepCount > 0
      ? (dailyStats.sleep / dailyStats.sleepCount).toFixed(1)
      : '0';

    const report = `
📊 דוח ${activeChild?.childName || 'התינוק'}
📅 ${format(new Date(), 'd MMMM yyyy', { locale: he })}

🍼 האכלות: ${dailyStats.foodCount} (${dailyStats.food} מ"ל)
   בקבוק: ${dailyStats.feedingTypes.bottle}
   הנקה: ${dailyStats.feedingTypes.breast}
   מוצקים: ${dailyStats.feedingTypes.solids}

😴 שינה: ${dailyStats.sleep.toFixed(1)} שעות (ממוצע: ${avgSleep}ש')
   שינה ארוכה ביותר: ${timeInsights?.longestSleep || 0}ש'
   יום שינה הכי טוב: ${timeInsights?.bestSleepDay || 'לא ידוע'}

🧷 חיתולים: ${dailyStats.diapers}
💊 תוספים: ${dailyStats.supplements}

---
הורה רגוע 💜
        `.trim();

    try {
      await Share.share({ message: report });
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לשתף');
    }
  };

  // Calculate comparison
  const comparison: WeekComparison | null = useMemo(() => {
    if (!prevWeekStats) return null;
    return {
      sleepChange: prevWeekStats.sleep > 0
        ? Math.round((dailyStats.sleep - prevWeekStats.sleep) / prevWeekStats.sleep * 100)
        : 0,
      feedingChange: prevWeekStats.foodCount > 0
        ? Math.round((dailyStats.foodCount - prevWeekStats.foodCount) / prevWeekStats.foodCount * 100)
        : 0,
      diaperChange: prevWeekStats.diapers > 0
        ? Math.round((dailyStats.diapers - prevWeekStats.diapers) / prevWeekStats.diapers * 100)
        : 0,
    };
  }, [dailyStats, prevWeekStats]);

  // ========== COMPONENTS ==========

  // Minimalist Stat Card with Trend
  const StatCard = ({ icon: Icon, value, label, subValue, change }: any) => (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <View style={[styles.statIconWrap, { backgroundColor: theme.cardSecondary }]}>
        <Icon size={20} color={theme.textSecondary} strokeWidth={1.5} />
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
        {change !== undefined && change !== 0 && (
          <View style={[styles.trendBadge, { backgroundColor: change > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            {change > 0 ? (
              <TrendingUp size={10} color="#059669" />
            ) : (
              <TrendingDown size={10} color="#DC2626" />
            )}
            <Text style={{ fontSize: 10, color: change > 0 ? '#059669' : '#DC2626', fontWeight: '600' }}>
              {Math.abs(change)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      {subValue && <Text style={[styles.statSubValue, { color: theme.textSecondary }]}>{subValue}</Text>}
    </View>
  );

  // Insight Card
  const InsightCard = ({ icon: Icon, title, value, subtitle }: any) => (
    <View style={[styles.insightCard, { backgroundColor: theme.card }]}>
      <View style={[styles.insightIcon, { backgroundColor: theme.cardSecondary }]}>
        <Icon size={18} color={theme.textSecondary} strokeWidth={1.5} />
      </View>
      <View style={styles.insightContent}>
        <Text style={[styles.insightTitle, { color: theme.textSecondary }]}>{title}</Text>
        <Text style={[styles.insightValue, { color: theme.textPrimary }]}>{value}</Text>
        {subtitle && <Text style={[styles.insightSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
    </View>
  );

  // Tabs
  const TabBar = () => (
    <View style={[styles.tabBar, { backgroundColor: theme.cardSecondary }]}>
      {(['summary', 'insights', 'charts'] as TabName[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && [styles.tabActive, { backgroundColor: theme.card }]]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab(tab);
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === tab ? theme.textPrimary : theme.textSecondary }]}>
            {tab === 'summary' ? 'סיכום' : tab === 'insights' ? 'תובנות' : 'גרפים'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Date Range Modal
  const DateRangeModal = () => (
    <Modal visible={showRangeModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.rangeModal, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRangeModal(false)}>
              <X size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>בחר טווח תאריכים</Text>
            <TouchableOpacity onPress={() => { setTimeRange('custom'); setShowRangeModal(false); }}>
              <Check size={22} color="#6366F1" />
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerRow}>
            <View style={styles.datePickerItem}>
              <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>מתאריך</Text>
              <TouchableOpacity
                style={[styles.datePickerBtn, { backgroundColor: theme.cardSecondary }]}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={[styles.datePickerValue, { color: theme.textPrimary }]}>
                  {format(customStartDate, 'd/M/yy')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerItem}>
              <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>עד תאריך</Text>
              <TouchableOpacity
                style={[styles.datePickerBtn, { backgroundColor: theme.cardSecondary }]}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={[styles.datePickerValue, { color: theme.textPrimary }]}>
                  {format(customEndDate, 'd/M/yy')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Minimalistic Donut Chart for Feeding Types
  const FeedingPieChart = () => {
    const total = dailyStats.feedingTypes.bottle + dailyStats.feedingTypes.breast + dailyStats.feedingTypes.solids;
    if (total === 0) return null;

    const items = [
      { name: 'בקבוק', value: dailyStats.feedingTypes.bottle, color: '#818CF8' },
      { name: 'הנקה', value: dailyStats.feedingTypes.breast, color: '#A78BFA' },
      { name: 'מוצקים', value: dailyStats.feedingTypes.solids, color: '#C4B5FD' }
    ].filter(item => item.value > 0);

    // Calculate percentages for the progress bars
    const getPercentage = (value: number) => Math.round((value / total) * 100);

    return (
      <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>התפלגות האכלות</Text>

        <View style={styles.donutContainer}>
          {/* Simple circular indicator */}
          <View style={[styles.donutRing, { borderColor: theme.cardSecondary }]}>
            <Text style={[styles.donutTotal, { color: theme.textPrimary }]}>{total}</Text>
            <Text style={[styles.donutLabel, { color: theme.textSecondary }]}>סה״כ</Text>
          </View>

          {/* Legend with progress bars */}
          <View style={styles.donutLegend}>
            {items.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={styles.legendHeader}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={[styles.legendName, { color: theme.textSecondary }]}>{item.name}</Text>
                  <Text style={[styles.legendValue, { color: theme.textPrimary }]}>{item.value}</Text>
                </View>
                <View style={[styles.legendBar, { backgroundColor: theme.cardSecondary }]}>
                  <View style={[styles.legendBarFill, { width: `${getPercentage(item.value)}%`, backgroundColor: item.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: () => '#6B7280',
    labelColor: () => theme.textSecondary,
    barPercentage: 0.6,
    propsForBackgroundLines: { stroke: theme.border, strokeDasharray: '4,4' }
  };

  // Summary Tab
  const SummaryTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      <View style={styles.statsGrid}>
        <StatCard icon={Utensils} value={dailyStats.foodCount} label="האכלות" subValue={`${dailyStats.food} מ"ל`} change={comparison?.feedingChange} />
        <StatCard icon={Moon} value={`${dailyStats.sleep.toFixed(1)}`} label="שעות שינה" change={comparison?.sleepChange} />
        <StatCard icon={Droplets} value={dailyStats.diapers} label="חיתולים" change={comparison?.diaperChange} />
        <StatCard icon={Pill} value={dailyStats.supplements} label="תוספים" />
      </View>
      <FeedingPieChart />

      {/* Quick Stats */}
      <View style={[styles.quickStatsCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>ממוצעים</Text>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: theme.textPrimary }]}>
              {dailyStats.foodCount > 0 ? Math.round(dailyStats.food / dailyStats.foodCount) : 0}
            </Text>
            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>מ"ל להאכלה</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: theme.textPrimary }]}>
              {dailyStats.sleepCount > 0 ? (dailyStats.sleep / dailyStats.sleepCount).toFixed(1) : 0}
            </Text>
            <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>שעות לשינה</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Insights Tab
  const InsightsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {/* Achievements */}
      <View style={styles.sectionTitleRow}>
        <Trophy size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>הישגים</Text>
      </View>
      <View style={styles.insightsList}>
        <InsightCard icon={Moon} title="שינה ארוכה ביותר" value={`${timeInsights?.longestSleep || 0} שעות`} />
        <InsightCard icon={Utensils} title="האכלה גדולה ביותר" value={`${timeInsights?.biggestFeeding || 0} מ"ל`} />
        <InsightCard icon={Award} title="יום שינה הכי טוב" value={timeInsights?.bestSleepDay || 'לא ידוע'} />
      </View>

      {/* Time Insights */}
      <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
        <Timer size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>זמנים</Text>
      </View>
      <View style={styles.insightsList}>
        <InsightCard icon={Clock} title="זמן ממוצע בין האכלות" value={`${timeInsights?.avgFeedingInterval || 0} שעות`} />
        <InsightCard icon={Moon} title="שעת שינה ממוצעת" value={timeInsights?.avgSleepTime || '--:--'} />
      </View>

      {/* Comparison */}
      {comparison && (
        <>
          <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
            <TrendingUp size={16} color="#6366F1" strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>השוואה לתקופה קודמת</Text>
          </View>
          <View style={styles.insightsList}>
            <InsightCard
              icon={comparison.sleepChange >= 0 ? TrendingUp : TrendingDown}
              title="שינה"
              value={`${comparison.sleepChange >= 0 ? '+' : ''}${comparison.sleepChange}%`}
              subtitle={comparison.sleepChange >= 0 ? 'יותר שינה' : 'פחות שינה'}
            />
            <InsightCard
              icon={comparison.feedingChange >= 0 ? TrendingUp : TrendingDown}
              title="האכלות"
              value={`${comparison.feedingChange >= 0 ? '+' : ''}${comparison.feedingChange}%`}
            />
          </View>
        </>
      )}
    </ScrollView>
  );

  // Charts Tab
  const ChartsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {weeklyData.sleep.some(v => v > 0) && (
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>שינה</Text>
          <LineChart
            data={{ labels: weeklyData.labels, datasets: [{ data: weeklyData.sleep.length > 0 ? weeklyData.sleep : [0] }] }}
            width={SCREEN_WIDTH - 64}
            height={160}
            chartConfig={chartConfig}
            style={styles.chart}
            bezier
            fromZero
          />
        </View>
      )}

      {weeklyData.food.some(v => v > 0) && (
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>אוכל (מ"ל)</Text>
          <BarChart
            data={{ labels: weeklyData.labels, datasets: [{ data: weeklyData.food }] }}
            width={SCREEN_WIDTH - 64}
            height={160}
            yAxisLabel="" yAxisSuffix=""
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
          />
        </View>
      )}

      {weeklyData.diapers.some(v => v > 0) && (
        <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>חיתולים</Text>
          <BarChart
            data={{ labels: weeklyData.labels, datasets: [{ data: weeklyData.diapers }] }}
            width={SCREEN_WIDTH - 64}
            height={160}
            yAxisLabel="" yAxisSuffix=""
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
          />
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <ChildPicker compact />
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Download size={20} color={theme.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>דוחות</Text>

        {/* Time Range Pills */}
        <View style={styles.filterRow}>
          {(['day', 'week', 'month'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.filterPill, { backgroundColor: timeRange === range ? theme.textPrimary : 'transparent', borderColor: theme.border }]}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTimeRange(range);
              }}
            >
              <Text style={[styles.filterPillText, { color: timeRange === range ? theme.card : theme.textSecondary }]}>
                {range === 'day' ? 'יומי' : range === 'week' ? 'שבועי' : 'חודשי'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterPill, { backgroundColor: timeRange === 'custom' ? theme.textPrimary : 'transparent', borderColor: theme.border }]}
            onPress={() => setShowRangeModal(true)}
          >
            <Calendar size={14} color={timeRange === 'custom' ? theme.card : theme.textSecondary} />
            <Text style={[styles.filterPillText, { color: timeRange === 'custom' ? theme.card : theme.textSecondary }]}>
              מותאם
            </Text>
          </TouchableOpacity>
        </View>

        {/* Day picker for daily view */}
        {timeRange === 'day' && (
          <View style={styles.dateRow}>
            <TouchableOpacity onPress={() => setSelectedDate(subDays(selectedDate, 1))}>
              <ChevronRight color={theme.textSecondary} size={22} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateBtn, { backgroundColor: theme.cardSecondary }]}
            >
              <Text style={[styles.dateText, { color: theme.textPrimary }]}>
                {format(selectedDate, 'd MMMM', { locale: he })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedDate(addDays(selectedDate, 1))}
              disabled={isSameDay(selectedDate, new Date())}
            >
              <ChevronLeft color={theme.textSecondary} size={22} style={{ opacity: isSameDay(selectedDate, new Date()) ? 0.3 : 1 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Custom range display */}
        {timeRange === 'custom' && (
          <TouchableOpacity onPress={() => setShowRangeModal(true)} style={styles.customRangeBtn}>
            <Text style={[styles.customRangeText, { color: theme.textSecondary }]}>
              {format(customStartDate, 'd/M')} - {format(customEndDate, 'd/M')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Tab Bar */}
        <TabBar />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : !activeChild?.childId ? (
        <View style={styles.emptyState}>
          <Baby size={48} color={theme.border} strokeWidth={1} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>בחר ילד לצפייה בדוחות</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          {activeTab === 'summary' && <SummaryTab />}
          {activeTab === 'insights' && <InsightsTab />}
          {activeTab === 'charts' && <ChartsTab />}
        </View>
      )}

      {/* Date Pickers */}
      {showDatePicker && (
        <DateTimePicker value={selectedDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setSelectedDate(d); }} maximumDate={new Date()} />
      )}
      {showStartPicker && (
        <DateTimePicker value={customStartDate} mode="date" display="default" onChange={(e, d) => { setShowStartPicker(false); if (d) setCustomStartDate(d); }} maximumDate={customEndDate} />
      )}
      {showEndPicker && (
        <DateTimePicker value={customEndDate} mode="date" display="default" onChange={(e, d) => { setShowEndPicker(false); if (d) setCustomEndDate(d); }} minimumDate={customStartDate} maximumDate={new Date()} />
      )}

      <DateRangeModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', textAlign: 'right', marginBottom: 14 },
  exportBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Filters
  filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  filterPillText: { fontSize: 13, fontWeight: '500' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  dateText: { fontSize: 14, fontWeight: '500' },
  customRangeBtn: { alignSelf: 'center', marginBottom: 12 },
  customRangeText: { fontSize: 13 },

  // Tabs
  tabBar: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },

  // Content
  tabContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500' },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: (SCREEN_WIDTH - 44) / 2, padding: 14, borderRadius: 14, alignItems: 'flex-end' },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  statSubValue: { fontSize: 11, marginTop: 2 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },

  // Insights
  sectionTitle: { fontSize: 16, fontWeight: '600', textAlign: 'right', marginBottom: 12 },
  insightsList: { gap: 10 },
  insightCard: { flexDirection: 'row-reverse', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12 },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightContent: { flex: 1, alignItems: 'flex-end' },
  insightTitle: { fontSize: 12, marginBottom: 2 },
  insightValue: { fontSize: 18, fontWeight: '700' },
  insightSubtitle: { fontSize: 11, marginTop: 2 },

  // Quick Stats
  quickStatsCard: { borderRadius: 14, padding: 16, marginTop: 8 },
  quickStatsRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  quickStatItem: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: 24, fontWeight: '700' },
  quickStatLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  quickStatDivider: { width: 1, height: 36, marginHorizontal: 16 },

  // Charts
  chartCard: { borderRadius: 14, padding: 14, marginBottom: 14 },
  chartTitle: { fontSize: 15, fontWeight: '600', textAlign: 'right', marginBottom: 12 },
  chart: { borderRadius: 10, alignSelf: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  rangeModal: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  datePickerRow: { flexDirection: 'row-reverse', gap: 16 },
  datePickerItem: { flex: 1 },
  datePickerLabel: { fontSize: 12, marginBottom: 8, textAlign: 'right' },
  datePickerBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center' },
  datePickerValue: { fontSize: 16, fontWeight: '600' },

  // Donut Chart
  donutContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20, paddingVertical: 8 },
  donutRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  donutTotal: { fontSize: 22, fontWeight: '700' },
  donutLabel: { fontSize: 11 },
  donutLegend: { flex: 1, gap: 12 },
  legendItem: { gap: 6 },
  legendHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { fontSize: 13, flex: 1 },
  legendValue: { fontSize: 14, fontWeight: '600' },
  legendBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  legendBarFill: { height: '100%', borderRadius: 2 },
  sectionTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
});