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
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { X, TrendingUp, TrendingDown, ChevronRight, Share2, Download, Calendar, Activity, Moon, Utensils, Droplets, Pill, RefreshCw, Trophy, Award, Clock, BarChart2, Check, GripVertical, Edit2, Baby } from 'lucide-react-native';
import StatsEditModal, { DEFAULT_STATS_ORDER, STATS_ORDER_KEY, StatKey } from '../components/Reports/StatsEditModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay, subWeeks, subMonths, differenceInDays, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import { useActiveChild } from '../context/ActiveChildContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useBabyProfile } from '../hooks/useBabyProfile';
import * as Haptics from 'expo-haptics';
import ChildPicker from '../components/Home/ChildPicker';
import { LiquidGlassBackground } from '../components/LiquidGlass';
import { AIInsightHeader, PremiumStatCard, SkiaBezierChart, MilestoneBadge } from '../components/Reports/PremiumReportComponents';
import { LiquidGlassLineChart, LiquidGlassBarChart } from '../components/Reports/LiquidGlassCharts';
import GlassBarChartPerfect from '../components/Reports/GlassBarChart';
import DetailedStatsScreen from '../components/Reports/DetailedStatsScreen';
import DetailedGrowthScreen from '../components/Reports/DetailedGrowthScreen';
import GrowthStatCube from '../components/Reports/GrowthStatCube';
import GrowthModal from '../components/Home/GrowthModal';
import {
  PremiumInsightCard,
  AITipCard,
  MilestoneCard,
  ShareSummaryButton,
  generateAIInsights,
} from '../components/Reports/PremiumInsights';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// TypeScript interfaces
interface DailyStats {
  food: number;
  foodCount: number;
  sleep: number;
  sleepCount: number;
  diapers: number;
  supplements: number;
  feedingTypes: { bottle: number; breast: number; pumping: number; solids: number };
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
type TabName = 'summary';
type MetricType = 'sleep' | 'food' | 'diapers' | 'supplements' | null;

export default function ReportsScreen() {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { activeChild } = useActiveChild();
  const { baby } = useBabyProfile(activeChild?.childId);

  // Calculate baby age in months
  const babyAgeMonths = useMemo(() => {
    if (!baby?.birthDate) return 6; // Default to 6 months if not set
    // Handle both Firestore Timestamp and Date objects
    const birthDate = baby.birthDate.seconds
      ? new Date(baby.birthDate.seconds * 1000)
      : new Date(baby.birthDate);
    const now = new Date();
    const months = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    return isNaN(months) ? 6 : months;
  }, [baby?.birthDate]);

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
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(null);

  const [dailyStats, setDailyStats] = useState<DailyStats>({
    food: 0, foodCount: 0,
    sleep: 0, sleepCount: 0,
    diapers: 0, supplements: 0,
    feedingTypes: { bottle: 0, breast: 0, pumping: 0, solids: 0 }
  });

  const [prevWeekStats, setPrevWeekStats] = useState<DailyStats | null>(null);
  const [timeInsights, setTimeInsights] = useState<TimeInsights | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData>({ labels: [], food: [], sleep: [], diapers: [] });
  const [dayBreakdown, setDayBreakdown] = useState<{ [day: string]: DailyStats }>({});

  // Stats Order
  const [statsOrder, setStatsOrder] = useState<StatKey[]>(DEFAULT_STATS_ORDER);
  const [showStatsEdit, setShowStatsEdit] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [showGrowthScreen, setShowGrowthScreen] = useState(false);

  // Load stats order
  useEffect(() => {
    AsyncStorage.getItem(STATS_ORDER_KEY).then(json => {
      if (json) {
        setStatsOrder(JSON.parse(json));
      }
    }).catch(() => { });
  }, []);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<{
    sleepDaysGoal: number;
    sleepDaysMet: number;
    docDaysGoal: number;
    docDaysMet: number;
    streak: number;
  }>({ sleepDaysGoal: 7, sleepDaysMet: 0, docDaysGoal: 7, docDaysMet: 0, streak: 0 });

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

      // Main query - optimized with order and limit
      const q = query(
        collection(db, 'events'),
        where('childId', '==', activeChild.childId),
        where('timestamp', '>=', Timestamp.fromDate(start)),
        where('timestamp', '<=', Timestamp.fromDate(end)),
        orderBy('timestamp', 'desc'),
        limit(500) // Safety limit for very active users
      );

      const querySnapshot = await getDocs(q);
      const events: any[] = [];

      const stats: DailyStats = {
        food: 0, foodCount: 0, sleep: 0, sleepCount: 0,
        diapers: 0, supplements: 0,
        feedingTypes: { bottle: 0, breast: 0, pumping: 0, solids: 0 }
      };

      // Day breakdown for charts
      const dayMap: { [key: string]: DailyStats } = {};
      for (let i = daysInRange - 1; i >= 0; i--) {
        const d = subDays(end, i);
        const key = format(d, 'dd/MM');
        dayMap[key] = {
          food: 0, foodCount: 0, sleep: 0, sleepCount: 0,
          diapers: 0, supplements: 0,
          feedingTypes: { bottle: 0, breast: 0, pumping: 0, solids: 0 }
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
          // Parse amount - handle string formats like "120 מ"ל" or just numbers
          let amount = 0;
          if (data.amount) {
            const parsed = parseInt(String(data.amount).replace(/[^\d]/g, ''));
            amount = isNaN(parsed) ? 0 : parsed;
          }

          stats.food += amount;
          stats.foodCount += 1;

          // Count by subType
          if (data.subType === 'bottle') stats.feedingTypes.bottle += 1;
          else if (data.subType === 'breast') stats.feedingTypes.breast += 1;
          else if (data.subType === 'pumping') stats.feedingTypes.pumping += 1;
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

      // Calculate real weekly goals
      const dayKeys = Object.keys(dayMap);
      let sleepDaysMet = 0;
      let docDaysMet = 0;
      let currentStreak = 0;
      let streakBroken = false;

      // Check each day (from most recent to oldest)
      const reversedDays = [...dayKeys].reverse();
      for (const dayKey of reversedDays) {
        const day = dayMap[dayKey];
        const hasDocumentation = day.foodCount > 0 || day.sleepCount > 0 || day.diapers > 0 || day.supplements > 0;

        // Sleep goal: 8+ hours total that day
        if (day.sleep >= 8) sleepDaysMet++;

        // Documentation goal: any entry that day
        if (hasDocumentation) docDaysMet++;

        // Calculate streak (consecutive days with documentation from today)
        if (hasDocumentation && !streakBroken) {
          currentStreak++;
        } else if (!hasDocumentation) {
          streakBroken = true;
        }
      }

      setWeeklyGoals({
        sleepDaysGoal: Math.min(daysInRange, dayKeys.length),
        sleepDaysMet,
        docDaysGoal: Math.min(daysInRange, dayKeys.length),
        docDaysMet,
        streak: currentStreak,
      });

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
          feedingTypes: { bottle: 0, breast: 0, pumping: 0, solids: 0 }
        };

        prevSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === 'feeding' || data.type === 'food') {
            // Parse amount - same logic as main stats
            let amount = 0;
            if (data.amount) {
              const parsed = parseInt(String(data.amount).replace(/[^\d]/g, ''));
              amount = isNaN(parsed) ? 0 : parsed;
            }
            prevStats.food += amount;
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

    } catch (error) {
      if (__DEV__) console.error('ReportsScreen fetchData error:', error);
      // Silent fail - don't show error to user
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
  }, [activeChild?.childId, timeRange, selectedDate, customStartDate, customEndDate]);

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

  // Generate AI Insight
  const aiInsight = useMemo(() => {
    if (!activeChild?.childName || dailyStats.foodCount === 0) return null;

    const avgSleepPerFeeding = dailyStats.sleepCount > 0 && dailyStats.foodCount > 0
      ? (dailyStats.sleep / dailyStats.foodCount).toFixed(1)
      : null;

    const insights = [
      comparison?.sleepChange && comparison.sleepChange > 10
        ? `${activeChild.childName} ישן/ה ${comparison.sleepChange}% יותר השבוע! `
        : null,
      avgSleepPerFeeding && parseFloat(avgSleepPerFeeding) > 0.5
        ? `בממוצע, ${activeChild.childName} ישן/ה ${avgSleepPerFeeding} שעות אחרי כל האכלה`
        : null,
      dailyStats.feedingTypes.solids > dailyStats.feedingTypes.bottle
        ? `${activeChild.childName} אוכל/ת יותר מוצקים מבקבוקים - התקדמות יפה!`
        : null,
      timeInsights?.biggestFeeding && timeInsights.biggestFeeding > 150
        ? `האכלה גדולה של ${timeInsights.biggestFeeding} מ"ל - תיאבון בריא!`
        : null,
    ].filter(Boolean);

    return insights[0] || `${activeChild.childName} ביום טוב! המשיכו כך `;
  }, [activeChild, dailyStats, comparison, timeInsights]);

  // ========== COMPONENTS ==========

  // Minimalist Stat Card with Trend - Colored Icons (Now Clickable!)
  const StatCard = ({ icon: Icon, value, label, subValue, change, iconColor, iconBg, onPress }: any) => (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: theme.card }]}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconWrap, { backgroundColor: iconBg || theme.cardSecondary }]}>
        <Icon size={20} color={iconColor || theme.textSecondary} strokeWidth={1.5} />
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
        {change !== undefined && change !== 0 && (
          <View style={[styles.trendBadge, { backgroundColor: change > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
            {change > 0 ? (
              <TrendingUp size={12} color="#059669" />
            ) : (
              <TrendingDown size={12} color="#DC2626" />
            )}
            <Text style={{ fontSize: 10, color: change > 0 ? '#059669' : '#DC2626', fontWeight: '600' }}>
              {Math.abs(change)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      {subValue && <Text style={[styles.statSubValue, { color: theme.textSecondary }]}>{subValue}</Text>}
      <ChevronRight size={16} color={theme.textSecondary} style={styles.cardChevron} />
    </TouchableOpacity>
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
      {(['summary', 'insights'] as TabName[]).map((tab) => (
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

  // State for single day mode
  const [isSingleDayMode, setSingleDayMode] = useState(false);
  const [activePickerField, setActivePickerField] = useState<'start' | 'end' | null>(null);

  // Temporary dates for modal - prevents continuous fetching while scrolling
  const [tempStartDate, setTempStartDate] = useState(customStartDate);
  const [tempEndDate, setTempEndDate] = useState(customEndDate);

  // Sync temp dates when modal opens
  useEffect(() => {
    if (showRangeModal) {
      setTempStartDate(customStartDate);
      setTempEndDate(customEndDate);
    }
  }, [showRangeModal]);

  // Date Range Modal with inline calendar
  const DateRangeModal = () => (
    <Modal visible={showRangeModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.rangeModal, { backgroundColor: theme.card }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowRangeModal(false); setActivePickerField(null); }}>
              <X size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>בחר תאריכים</Text>
            <TouchableOpacity onPress={() => {
              // Commit temp dates to actual state
              if (isSingleDayMode) {
                setCustomStartDate(tempStartDate);
                setCustomEndDate(tempStartDate);
              } else {
                setCustomStartDate(tempStartDate);
                setCustomEndDate(tempEndDate);
              }
              setTimeRange('custom');
              setShowRangeModal(false);
              setActivePickerField(null);
            }}>
              <Check size={22} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {/* Toggle: Single Day vs Range */}
          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, isSingleDayMode && { backgroundColor: '#6366F1' }]}
              onPress={() => {
                setSingleDayMode(true);
                setActivePickerField('start');
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.modeToggleText, isSingleDayMode && { color: '#fff' }]}>יום בודד</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleBtn, !isSingleDayMode && { backgroundColor: '#6366F1' }]}
              onPress={() => {
                setSingleDayMode(false);
                setActivePickerField('start');
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.modeToggleText, !isSingleDayMode && { color: '#fff' }]}>טווח תאריכים</Text>
            </TouchableOpacity>
          </View>

          {/* Date Selection Buttons - now showing temp dates */}
          {isSingleDayMode ? (
            <View style={styles.singleDatePicker}>
              <TouchableOpacity
                style={[styles.datePickerBtn, styles.singleDateBtn, { backgroundColor: activePickerField === 'start' ? '#EEF2FF' : theme.cardSecondary }]}
                onPress={() => setActivePickerField('start')}
              >
                <Calendar size={18} color="#6366F1" />
                <Text style={[styles.datePickerValue, { color: theme.textPrimary }]}>
                  {format(tempStartDate, 'd MMMM yyyy', { locale: he })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerItem}>
                <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>מתאריך</Text>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: activePickerField === 'start' ? '#EEF2FF' : theme.cardSecondary }]}
                  onPress={() => setActivePickerField('start')}
                >
                  <Text style={[styles.datePickerValue, { color: theme.textPrimary }]}>
                    {format(tempStartDate, 'd/M/yy')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerItem}>
                <Text style={[styles.datePickerLabel, { color: theme.textSecondary }]}>עד תאריך</Text>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: activePickerField === 'end' ? '#EEF2FF' : theme.cardSecondary }]}
                  onPress={() => setActivePickerField('end')}
                >
                  <Text style={[styles.datePickerValue, { color: theme.textPrimary }]}>
                    {format(tempEndDate, 'd/M/yy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Inline Calendar - uses temp dates to avoid continuous fetching */}
          {activePickerField && (
            <View style={styles.inlineCalendarContainer}>
              <DateTimePicker
                value={activePickerField === 'start' ? tempStartDate : tempEndDate}
                mode="date"
                display="inline"
                onChange={(event, date) => {
                  if (date) {
                    if (activePickerField === 'start') {
                      setTempStartDate(date);
                      if (!isSingleDayMode && date > tempEndDate) {
                        setTempEndDate(date);
                      }
                    } else {
                      setTempEndDate(date);
                    }
                  }
                }}
                maximumDate={activePickerField === 'start' ? (isSingleDayMode ? new Date() : tempEndDate) : new Date()}
                minimumDate={activePickerField === 'end' ? tempStartDate : undefined}
                locale="he"
                themeVariant="light"
                accentColor="#6366F1"
                style={styles.inlineCalendar}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const FeedingPieChart = () => {
    const total = dailyStats.feedingTypes.bottle + dailyStats.feedingTypes.breast + dailyStats.feedingTypes.pumping + dailyStats.feedingTypes.solids;
    if (total === 0) return null;

    const items = [
      { name: 'בקבוק 🍼', value: dailyStats.feedingTypes.bottle, color: '#818CF8' },
      { name: 'הנקה 🤱', value: dailyStats.feedingTypes.breast, color: '#A78BFA' },
      { name: 'שאיבה 🥛', value: dailyStats.feedingTypes.pumping, color: '#F472B6' },
      { name: 'מוצקים 🥣', value: dailyStats.feedingTypes.solids, color: '#C4B5FD' }
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
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Animated.View
        entering={FadeInUp.duration(500).delay(100).springify().damping(15)}
        style={[styles.statsGrid, { position: 'relative' }]}
      >
        {statsOrder.map((key) => {
          if (key === 'food') return (
            <StatCard
              key="food"
              icon={Utensils}
              value={dailyStats.foodCount}
              label="האכלות"
              subValue={`${dailyStats.food} מ"ל`}
              change={comparison?.feedingChange}
              iconColor="#F59E0B"
              iconBg="#FEF3C7"
              onPress={() => setSelectedMetric('food')}
            />
          );
          if (key === 'sleep') return (
            <StatCard
              key="sleep"
              icon={Moon}
              value={`${dailyStats.sleep.toFixed(1)}`}
              label="שעות שינה"
              change={comparison?.sleepChange}
              iconColor="#8B5CF6"
              iconBg="#EDE9FE"
              onPress={() => setSelectedMetric('sleep')}
            />
          );
          if (key === 'diapers') return (
            <StatCard
              key="diapers"
              icon={Droplets}
              value={dailyStats.diapers}
              label="חיתולים"
              change={comparison?.diaperChange}
              iconColor="#14B8A6"
              iconBg="#CCFBF1"
              onPress={() => setSelectedMetric('diapers')}
            />
          );
          if (key === 'supplements') return (
            <StatCard
              key="supplements"
              icon={Pill}
              value={dailyStats.supplements}
              label="תוספים"
              iconColor="#EC4899"
              iconBg="#FCE7F3"
              onPress={() => setSelectedMetric('supplements')}
            />
          );
          return null;
        })}

        {/* Growth Cube with Sparkline */}
        <GrowthStatCube
          childId={activeChild?.childId}
          onPress={() => setShowGrowthScreen(true)}
        />

        <TouchableOpacity
          style={styles.editStatsBtn}
          onPress={() => setShowStatsEdit(true)}
        >
          <Edit2 size={16} color={theme.textSecondary} />
          <Text style={[styles.editStatsText, { color: theme.textSecondary }]}>{t('stats.editOrder')}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Weekly Comparison - Enhanced */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(200).springify().damping(15)}
        style={[styles.comparisonSection, { backgroundColor: theme.card }]}
      >
        <View style={styles.goalsSectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {timeRange === 'day' ? t('stats.comparison.yesterday') : timeRange === 'month' ? t('stats.comparison.lastMonth') : t('stats.comparison.lastWeek')}
          </Text>
        </View>

        <View style={styles.comparisonGrid}>
          {/* Sleep Comparison */}
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>שינה</Text>
            <Text style={[styles.comparisonValue, { color: comparison?.sleepChange && comparison.sleepChange >= 0 ? '#10B981' : '#EF4444' }]}>
              {comparison?.sleepChange !== undefined ? (comparison.sleepChange >= 0 ? '+' : '') + comparison.sleepChange + '%' : '--'}
            </Text>
          </View>

          {/* Food Comparison */}
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>האכלות</Text>
            <Text style={[styles.comparisonValue, { color: comparison?.feedingChange && comparison.feedingChange >= 0 ? '#10B981' : '#EF4444' }]}>
              {comparison?.feedingChange !== undefined ? (comparison.feedingChange >= 0 ? '+' : '') + comparison.feedingChange + '%' : '--'}
            </Text>
          </View>

          {/* Diapers Comparison */}
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>חיתולים</Text>
            <Text style={[styles.comparisonValue, { color: comparison?.diaperChange && comparison.diaperChange >= 0 ? '#10B981' : '#EF4444' }]}>
              {comparison?.diaperChange !== undefined ? (comparison.diaperChange >= 0 ? '+' : '') + comparison.diaperChange + '%' : '--'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Weekly Goals & Streaks - Enhanced */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(300).springify().damping(15)}
        style={[styles.goalsSection, { backgroundColor: theme.card }]}
      >
        <View style={styles.goalsSectionHeader}>
          <View style={styles.goalsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {timeRange === 'day' ? t('stats.goals.daily') : timeRange === 'month' ? t('stats.goals.monthly') : t('stats.goals.weekly')}
            </Text>
          </View>
        </View>

        {/* Sleep Goal */}
        <View style={styles.goalItem}>
          <View style={styles.goalItemHeader}>
            <Text style={[styles.goalItemTitle, { color: theme.textPrimary }]}>שינה של 8+ שעות</Text>
            <Text style={[styles.goalItemProgress, { color: theme.textSecondary }]}>
              {weeklyGoals.sleepDaysMet}/{weeklyGoals.sleepDaysGoal}
            </Text>
          </View>
          <View style={[styles.goalProgressBar, { backgroundColor: theme.cardSecondary }]}>
            <View
              style={[
                styles.goalProgressFill,
                {
                  width: `${weeklyGoals.sleepDaysGoal > 0 ? (weeklyGoals.sleepDaysMet / weeklyGoals.sleepDaysGoal) * 100 : 0}%`,
                  backgroundColor: '#10B981'
                }
              ]}
            />
          </View>
        </View>

        {/* Documentation Goal */}
        <View style={styles.goalItem}>
          <View style={styles.goalItemHeader}>
            <Text style={[styles.goalItemTitle, { color: theme.textPrimary }]}>ימים עם תיעוד</Text>
            <Text style={[styles.goalItemProgress, { color: theme.textSecondary }]}>
              {weeklyGoals.docDaysMet}/{weeklyGoals.docDaysGoal}
            </Text>
          </View>
          <View style={[styles.goalProgressBar, { backgroundColor: theme.cardSecondary }]}>
            <View
              style={[
                styles.goalProgressFill,
                {
                  width: `${weeklyGoals.docDaysGoal > 0 ? (weeklyGoals.docDaysMet / weeklyGoals.docDaysGoal) * 100 : 0}%`,
                  backgroundColor: '#10B981'
                }
              ]}
            />
          </View>
        </View>

        {/* Streak with icon */}
        {weeklyGoals.streak > 0 && (
          <View style={styles.streakRow}>
            <Check size={16} color="#10B981" strokeWidth={2.5} />
            <Text style={[styles.streakSimple, { color: '#10B981' }]}>
              {weeklyGoals.streak} ימים רצופים
            </Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );


  // Generate AI Insights
  const aiInsights = useMemo(() => {
    return generateAIInsights({
      dailyStats,
      timeInsights,
      weeklyData,
      prevWeekStats,
      childName: activeChild?.childName,
    });
  }, [dailyStats, timeInsights, weeklyData, prevWeekStats, activeChild?.childName]);

  // Premium Insights Tab
  const InsightsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {/* Insights Section */}
      <View style={styles.sectionTitleRow}>
        <Trophy size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>תובנות</Text>
      </View>
      {aiInsights.tips.slice(0, 2).map((tipData, index) => (
        <AITipCard
          key={index}
          tip={tipData.tip}
          category={tipData.category}
          delay={index * 100}
        />
      ))}

      {/* Achievements Section */}
      <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
        <Award size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>הישגים</Text>
      </View>
      <View style={styles.insightsList}>
        <PremiumInsightCard
          icon={Moon}
          title="שינה ארוכה ביותר"
          value={`${timeInsights?.longestSleep || 0} שעות`}
          color="#8B5CF6"
          delay={0}
        />
        <PremiumInsightCard
          icon={Utensils}
          title="האכלה גדולה ביותר"
          value={`${timeInsights?.biggestFeeding || 0} מ"ל`}
          color="#F59E0B"
          delay={50}
        />
        <PremiumInsightCard
          icon={Clock}
          title="זמן ממוצע בין האכלות"
          value={`${timeInsights?.avgFeedingInterval || 0} שעות`}
          color="#10B981"
          delay={100}
        />
      </View>

      {/* Patterns Section */}
      {aiInsights.patterns.length > 0 && (
        <>
          <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
            <Activity size={16} color="#6366F1" strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>דפוסים</Text>
          </View>
          <View style={styles.insightsList}>
            {aiInsights.patterns.map((pattern, index) => (
              <PremiumInsightCard
                key={index}
                icon={pattern.icon}
                title={pattern.label}
                value={pattern.value}
                color={pattern.color}
                delay={index * 50}
              />
            ))}
          </View>
        </>
      )}

      {/* Milestones Section */}
      <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
        <TrendingUp size={16} color="#6366F1" strokeWidth={1.5} />
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stats.goals')}</Text>
      </View>
      {aiInsights.milestones.map((milestone, index) => (
        <MilestoneCard
          key={index}
          title={milestone.title}
          current={milestone.current}
          target={milestone.target}
          unit={milestone.unit}
          delay={index * 100}
        />
      ))}

      {/* Comparison Section */}
      {comparison && (
        <>
          <View style={[styles.sectionTitleRow, { marginTop: 20 }]}>
            <BarChart2 size={16} color="#6366F1" strokeWidth={1.5} />
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('stats.comparison')}</Text>
          </View>
          <View style={styles.insightsList}>
            <PremiumInsightCard
              icon={Moon}
              title="שינה"
              value={`${comparison.sleepChange >= 0 ? '+' : ''}${comparison.sleepChange}%`}
              subtitle={comparison.sleepChange >= 0 ? 'יותר שינה' : 'פחות שינה'}
              trend={comparison.sleepChange >= 0 ? 'up' : 'down'}
              color="#8B5CF6"
              delay={0}
            />
            <PremiumInsightCard
              icon={Utensils}
              title="האכלות"
              value={`${comparison.feedingChange >= 0 ? '+' : ''}${comparison.feedingChange}%`}
              trend={comparison.feedingChange >= 0 ? 'up' : 'down'}
              color="#F59E0B"
              delay={50}
            />
          </View>
        </>
      )}

      {/* Share Button */}
      <ShareSummaryButton
        dailyStats={dailyStats}
        childName={activeChild?.childName}
      />
    </ScrollView>
  );

  // Charts Tab - Premium Glass Bar Charts
  const ChartsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
      {weeklyData.sleep.some(v => v > 0) && (
        <GlassBarChartPerfect
          data={weeklyData.sleep}
          labels={weeklyData.labels}
          title="שינה (שעות)"
          unit="ש'"
          gradientColors={['#8B5CF6', '#8B5CF620']}
          height={260}
          yAxisSteps={[0, 4, 8, 12, 16]}
        />
      )}

      {weeklyData.food.some(v => v > 0) && (
        <GlassBarChartPerfect
          data={weeklyData.food}
          labels={weeklyData.labels}
          title={'אוכל (מ"ל)'}
          unit={'מ"ל'}
          gradientColors={['#3B82F6', '#3B82F620']}
          height={260}
        />
      )}

      {weeklyData.diapers.some(v => v > 0) && (
        <GlassBarChartPerfect
          data={weeklyData.diapers}
          labels={weeklyData.labels}
          title="חיתולים"
          gradientColors={['#10B981', '#10B98120']}
          height={220}
          yAxisSteps={[0, 3, 6, 9, 12]}
        />
      )}
    </ScrollView>
  );

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

  const mainContent = (
    <View style={styles.container}>
      {/* Enhanced Background - Minimalist Apple Style */}
      <LinearGradient
        colors={isDarkMode
          ? ['#0A0A0F', '#0F0F18', '#0C0C12', '#0A0A0F']
          : ['#FAFAFA', '#F7F7F7', '#F3F3F3', '#FAFAFA']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Dot Pattern Texture */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        preserveAspectRatio="none"
      >
        <Defs>
          <Pattern
            id="dotPatternReports"
            patternUnits="userSpaceOnUse"
            width={28}
            height={28}
          >
            <Circle
              cx={14}
              cy={14}
              r={1.5}
              fill={isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)'}
            />
          </Pattern>
        </Defs>
        <Rect width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#dotPatternReports)" />
      </Svg>

      {/* Radial Glow at Top */}
      <LinearGradient
        colors={isDarkMode
          ? ['rgba(79, 70, 229, 0.15)', 'transparent']
          : ['rgba(79, 70, 229, 0.08)', 'transparent']
        }
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header - Enhanced */}
      <Animated.View
        entering={FadeInDown.duration(400).springify().damping(15)}
        style={[styles.header, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', borderBottomColor: theme.border }]}
      >
        <View style={styles.headerTop}>
          <ChildPicker compact />
          <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
            <Download size={20} color={theme.textSecondary} strokeWidth={1.5} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('stats.title')}</Text>

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

        {/* Day navigation removed - use custom date picker instead */}

        {/* Custom range display */}
        {timeRange === 'custom' && (
          <TouchableOpacity onPress={() => setShowRangeModal(true)} style={styles.customRangeBtn}>
            <Text style={[styles.customRangeText, { color: theme.textSecondary }]}>
              {format(customStartDate, 'd/M')} - {format(customEndDate, 'd/M')}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : !activeChild?.childId ? (
        <View style={styles.emptyState}>
          <Baby size={48} color={theme.border} strokeWidth={1} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('empty.noChild')}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <SummaryTab />
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

      <StatsEditModal
        visible={showStatsEdit}
        onClose={() => setShowStatsEdit(false)}
        currentOrder={statsOrder}
        onOrderChange={setStatsOrder}
      />

      <GrowthModal
        visible={showGrowthModal}
        onClose={() => setShowGrowthModal(false)}
        childId={activeChild?.childId}
      />
    </View>
  );

  // If a metric is selected, show the detailed stats screen
  if (selectedMetric) {
    return (
      <DetailedStatsScreen
        onClose={() => setSelectedMetric(null)}
        metricType={selectedMetric}
        childId={activeChild?.childId || ''}
      />
    );
  }

  // If growth screen is selected, show the detailed growth screen
  if (showGrowthScreen) {
    return (
      <DetailedGrowthScreen
        onClose={() => setShowGrowthScreen(false)}
        childId={activeChild?.childId || ''}
        ageInMonths={babyAgeMonths}
        gender={baby?.gender || 'boy'}
      />
    );
  }

  return mainContent;
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
  tabContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500' },

  // Stats Grid - 2x2 Layout
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, justifyContent: 'space-between' },
  editStatsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 4 },
  editStatsText: { fontSize: 13 },
  statCard: { width: (SCREEN_WIDTH - 52) / 2, padding: 16, borderRadius: 20, alignItems: 'flex-end', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  statSubValue: { fontSize: 11, marginTop: 2 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  cardChevron: { position: 'absolute', left: 10, top: '50%', marginTop: -8 },

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
  modeToggleRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  modeToggleBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6' },
  modeToggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  singleDatePicker: { alignItems: 'center' },
  singleDateBtn: { flexDirection: 'row', gap: 10, paddingVertical: 14, paddingHorizontal: 20 },
  inlineCalendarContainer: { marginTop: 16, alignItems: 'center' },
  inlineCalendar: { width: '100%', height: 320 },

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

  // Goals Section
  goalsSection: { borderRadius: 20, padding: 20, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  goalsSectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 16 },
  goalItem: { marginBottom: 16 },
  goalItemHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
  goalIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goalItemTitle: { flex: 1, fontSize: 14, fontWeight: '500', textAlign: 'right' },
  goalItemProgress: { fontSize: 12 },
  goalProgressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  goalProgressFill: { height: '100%', borderRadius: 4 },
  streakBadge: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginTop: 8 },
  streakEmoji: { fontSize: 18 },
  streakText: { fontSize: 13, fontWeight: '600' },
  streakSimple: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },

  // Comparison Section
  comparisonSection: { borderRadius: 20, padding: 20, marginTop: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  comparisonGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 8 },
  comparisonItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  comparisonIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  comparisonLabel: { fontSize: 12, marginBottom: 4 },
  comparisonValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  comparisonValue: { fontSize: 18, fontWeight: '700' },

  // Growth Section
  growthSection: { borderRadius: 20, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  growthGrid: { flexDirection: 'row-reverse', justifyContent: 'space-around', gap: 12 },
  growthItem: { alignItems: 'center', flex: 1 },
  growthValue: { fontSize: 22, fontWeight: '700' },
  growthLabel: { fontSize: 12, marginTop: 4 },
});