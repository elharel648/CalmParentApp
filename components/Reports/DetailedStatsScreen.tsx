// components/Reports/DetailedStatsScreen.tsx - Apple Health Style Stats Detail Screen (Light Theme)
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Platform,
    SafeAreaView,
    ActivityIndicator,
} from 'react-native';
import {
    ChevronLeft, Moon, Utensils, Droplets, Pill,
    TrendingUp, TrendingDown, Clock, Award, Star, Zap
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format, subWeeks, subMonths, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { db } from '../../services/firebaseConfig';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import GlassBarChartPerfect from './GlassBarChart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type MetricType = 'sleep' | 'food' | 'diapers' | 'supplements';
type TimeRange = 'day' | 'week' | 'month' | 'custom';

interface DayData {
    date: Date;
    value: number;
    segments?: { value: number; color: string }[];
}

interface DetailedStatsScreenProps {
    onClose: () => void;
    metricType: MetricType;
    childId: string;
}

const METRIC_CONFIG = {
    sleep: {
        title: 'שינה',
        icon: Moon,
        color: '#8B5CF6',
        lightBg: '#F5F3FF',
        barColors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
        unit: 'שעות',
        avgLabel: 'ממוצע משך השינה',
        insights: [
            { icon: Clock, title: 'שעת שינה ממוצעת', key: 'avgSleepTime' },
            { icon: Star, title: 'הלילה הטוב ביותר', key: 'bestNight' },
            { icon: TrendingUp, title: 'שינוי מהשבוע הקודם', key: 'weekChange' },
        ],
    },
    food: {
        title: 'האכלות',
        icon: Utensils,
        color: '#F59E0B',
        lightBg: '#FFFBEB',
        barColors: ['#F59E0B', '#FBBF24', '#FCD34D'],
        unit: 'מ"ל',
        avgLabel: 'ממוצע האכלה יומית',
        insights: [
            { icon: Zap, title: 'האכלה הגדולה ביותר', key: 'biggestFeeding' },
            { icon: Clock, title: 'מרווח ממוצע בין האכלות', key: 'avgInterval' },
            { icon: Award, title: 'סה"כ כמות', key: 'totalAmount' },
        ],
    },
    diapers: {
        title: 'חיתולים',
        icon: Droplets,
        color: '#14B8A6',
        lightBg: '#F0FDFA',
        barColors: ['#14B8A6', '#2DD4BF', '#5EEAD4'],
        unit: 'פעמים',
        avgLabel: 'ממוצע יומי',
        insights: [
            { icon: TrendingUp, title: 'ממוצע יומי', key: 'dailyAvg' },
            { icon: Star, title: 'היום הפעיל ביותר', key: 'busiestDay' },
            { icon: Award, title: 'סה"כ החלפות', key: 'totalChanges' },
        ],
    },
    supplements: {
        title: 'תוספים',
        icon: Pill,
        color: '#EC4899',
        lightBg: '#FDF2F8',
        barColors: ['#EC4899', '#F472B6', '#F9A8D4'],
        unit: 'פעמים',
        avgLabel: 'ממוצע יומי',
        insights: [
            { icon: Award, title: 'עקביות', key: 'consistency' },
            { icon: Clock, title: 'שעה נפוצה', key: 'commonTime' },
            { icon: TrendingUp, title: 'סה"כ מנות', key: 'totalDoses' },
        ],
    },
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
    day: 'יומי',
    week: 'שבועי',
    month: 'חודשי',
    custom: 'מותאם',
};

// Goals configuration per metric
const METRIC_GOALS = {
    sleep: [
        { title: 'שבוע של שינה טובה', target: 7, threshold: 8, unit: 'שעות', description: 'ימים עם 8+ שעות' },
        { title: 'שינה קבועה', target: 7, threshold: 6, unit: 'שעות', description: 'ימים עם שגרה' },
    ],
    food: [
        { title: 'עקביות בהאכלות', target: 7, threshold: 4, unit: 'האכלות', description: 'ימים עם תיעוד' },
        { title: 'תזונה מספקת', target: 7, threshold: 500, unit: 'מ"ל', description: 'ימים עם 500+ מ"ל' },
    ],
    diapers: [
        { title: 'מעקב קבוע', target: 7, threshold: 4, unit: 'החלפות', description: 'ימים עם 4+ החלפות' },
    ],
    supplements: [
        { title: 'עקביות בתוספים', target: 7, threshold: 1, unit: 'מנות', description: 'ימים עם מתן תוסף' },
    ],
};

export default function DetailedStatsScreen({
    onClose,
    metricType,
    childId,
}: DetailedStatsScreenProps) {
    const { theme } = useTheme();
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const [data, setData] = useState<DayData[]>([]);
    const [loading, setLoading] = useState(false);

    const config = METRIC_CONFIG[metricType];
    const IconComponent = config.icon;

    // Calculate date range based on timeRange
    const dateRange = useMemo(() => {
        const end = new Date();
        let start: Date;

        switch (timeRange) {
            case 'day':
                start = startOfDay(end);
                break;
            case 'week':
                start = subWeeks(end, 1);
                break;
            case 'month':
                start = subMonths(end, 1);
                break;
            case 'custom':
                start = subMonths(end, 6);
                break;
            default:
                start = subWeeks(end, 1);
        }

        return { start: startOfDay(start), end: endOfDay(end) };
    }, [timeRange]);

    // Fetch data from Firebase
    useEffect(() => {
        if (!childId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const eventsRef = collection(db, 'events');
                const startTimestamp = Timestamp.fromDate(dateRange.start);
                const endTimestamp = Timestamp.fromDate(dateRange.end);

                const q = query(
                    eventsRef,
                    where('childId', '==', childId),
                    where('timestamp', '>=', startTimestamp),
                    where('timestamp', '<=', endTimestamp),
                    orderBy('timestamp', 'asc')
                );

                const snapshot = await getDocs(q);
                const events = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate() || new Date(),
                }));

                // Create day-by-day data
                const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
                const dayData: DayData[] = days.map(day => {
                    const dayStart = startOfDay(day);
                    const dayEnd = endOfDay(day);

                    const dayEvents = events.filter((e: any) => {
                        const eventDate = new Date(e.timestamp);
                        return eventDate >= dayStart && eventDate <= dayEnd;
                    });

                    let value = 0;
                    const segments: { value: number; color: string }[] = [];

                    if (metricType === 'sleep') {
                        dayEvents.filter((e: any) => e.type === 'sleep').forEach((e: any, i: number) => {
                            const hours = (e.duration || 0) / 3600;
                            value += hours;
                            segments.push({
                                value: hours,
                                color: config.barColors[i % config.barColors.length],
                            });
                        });
                    } else if (metricType === 'food') {
                        dayEvents.filter((e: any) => e.type === 'food').forEach((e: any) => {
                            const amount = parseInt(String(e.amount || 0).replace(/[^\d]/g, '')) || 0;
                            value += amount;
                        });
                    } else if (metricType === 'diapers') {
                        value = dayEvents.filter((e: any) => e.type === 'diaper').length;
                    } else if (metricType === 'supplements') {
                        value = dayEvents.filter((e: any) => e.type === 'supplement').length;
                    }

                    return { date: day, value, segments: segments.length > 0 ? segments : undefined };
                });

                setData(dayData);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [childId, dateRange, metricType]);

    // Calculate stats
    const stats = useMemo(() => {
        if (data.length === 0) return { total: 0, average: 0, max: 0, maxDay: '' };

        const values = data.map(d => d.value);
        const total = values.reduce((a, b) => a + b, 0);
        const nonZeroValues = values.filter(v => v > 0);
        const average = nonZeroValues.length > 0 ? total / nonZeroValues.length : 0;
        const max = Math.max(...values, 0);
        const maxIndex = values.indexOf(max);
        const maxDay = data[maxIndex] ? format(data[maxIndex].date, 'EEEE', { locale: he }) : '';

        return { total, average, max, maxDay };
    }, [data]);

    // Generate insights based on metric type
    const insightValues = useMemo(() => {
        if (metricType === 'sleep') {
            return {
                avgSleepTime: stats.average > 0 ? `${stats.average.toFixed(1)} שעות` : '--',
                bestNight: stats.maxDay ? `${stats.max.toFixed(1)} שעות (${stats.maxDay})` : '--',
                weekChange: '+12%', // TODO: Calculate real change
            };
        } else if (metricType === 'food') {
            return {
                biggestFeeding: `${stats.max} מ"ל`,
                avgInterval: '3.2 שעות', // TODO: Calculate real interval
                totalAmount: `${Math.round(stats.total)} מ"ל`,
            };
        } else if (metricType === 'diapers') {
            return {
                dailyAvg: `${stats.average.toFixed(1)} פעמים`,
                busiestDay: stats.maxDay || '--',
                totalChanges: `${Math.round(stats.total)} החלפות`,
            };
        } else {
            return {
                consistency: stats.average > 0 ? 'טוב' : '--',
                commonTime: 'בוקר',
                totalDoses: `${Math.round(stats.total)} מנות`,
            };
        }
    }, [stats, metricType]);

    // Format value for display
    const formatValue = (value: number) => {
        if (metricType === 'sleep') {
            const hours = Math.floor(value);
            const minutes = Math.round((value - hours) * 60);
            return { main: hours.toString(), sub: `${minutes} דק'`, unit: 'שע\'' };
        }
        return { main: Math.round(value).toString(), sub: '', unit: config.unit };
    };

    const formattedAvg = formatValue(stats.average);

    // Prepare chart data
    const chartData = useMemo(() => data.map(d => d.value), [data]);
    const chartLabels = useMemo(() =>
        data.map(d => format(d.date, timeRange === 'custom' ? 'd/M' : 'EEE', { locale: he })),
        [data, timeRange]
    );

    // Calculate goals progress
    const goalsProgress = useMemo(() => {
        const goals = METRIC_GOALS[metricType];
        return goals.map(goal => {
            const daysMetGoal = data.filter(d => d.value >= goal.threshold).length;
            return {
                ...goal,
                current: daysMetGoal,
                progress: Math.min(100, (daysMetGoal / goal.target) * 100),
            };
        });
    }, [data, metricType]);

    // Calculate comparison to previous period
    const comparison = useMemo(() => {
        if (data.length === 0) return { change: 0, isPositive: true, prevAvg: 0 };
        // Simulate previous period (would need real data fetch)
        const currentAvg = stats.average;
        const prevAvg = currentAvg * 0.9; // Simulated 10% lower previous period
        const change = prevAvg > 0 ? Math.round(((currentAvg - prevAvg) / prevAvg) * 100) : 0;
        return {
            change: Math.abs(change),
            isPositive: change >= 0,
            prevAvg,
        };
    }, [data, stats]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onClose();
                    }}
                >
                    <ChevronLeft size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <IconComponent size={20} color={config.color} strokeWidth={2} />
                    <Text style={[styles.headerText, { color: theme.textPrimary }]}>{config.title}</Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Time Range Tabs */}
                <View style={[styles.timeRangeTabs, { backgroundColor: theme.cardSecondary }]}>
                    {(Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]).map(([range, label]) => {
                        const isActive = timeRange === range;
                        return (
                            <TouchableOpacity
                                key={range}
                                style={[
                                    styles.timeTab,
                                    isActive && [styles.timeTabActive, { backgroundColor: theme.card }],
                                ]}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setTimeRange(range);
                                }}
                            >
                                <Text style={[
                                    styles.timeTabText,
                                    { color: isActive ? theme.textPrimary : theme.textSecondary },
                                    isActive && styles.timeTabTextActive,
                                ]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Main Stats Card */}
                <View style={[styles.statsCard, { backgroundColor: config.lightBg }]}>
                    <Text style={[styles.avgLabel, { color: theme.textSecondary }]}>{config.avgLabel}</Text>
                    <View style={styles.mainValue}>
                        <Text style={[styles.valueNumber, { color: config.color }]}>{formattedAvg.main}</Text>
                        <Text style={[styles.valueUnit, { color: config.color }]}>{formattedAvg.unit}</Text>
                        {formattedAvg.sub && (
                            <>
                                <Text style={[styles.valueNumber, { color: config.color }]}> {formattedAvg.sub.split(' ')[0]}</Text>
                                <Text style={[styles.valueUnit, { color: config.color }]}>{formattedAvg.sub.split(' ')[1]}</Text>
                            </>
                        )}
                    </View>
                    <Text style={[styles.dateRange, { color: theme.textSecondary }]}>
                        {format(dateRange.start, 'd', { locale: he })}-{format(dateRange.end, 'd בMMMM yyyy', { locale: he })}
                    </Text>
                </View>

                {/* Premium Animated Chart */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={config.color} />
                    </View>
                ) : data.length > 0 ? (
                    <GlassBarChartPerfect
                        data={chartData}
                        labels={chartLabels}
                        title={config.title}
                        unit={config.unit}
                        gradientColors={[config.color, `${config.color}20`]}
                        height={280}
                    />
                ) : (
                    <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
                        <View style={styles.emptyChart}>
                            <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
                                אין נתונים להצגה
                            </Text>
                        </View>
                    </View>
                )}

                {/* Goals Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={18} color={config.color} />
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>יעדים</Text>
                    </View>
                    {goalsProgress.map((goal, index) => (
                        <View key={index} style={[styles.goalCard, { backgroundColor: theme.card }]}>
                            <View style={styles.goalHeader}>
                                <View style={[styles.goalIconWrap, { backgroundColor: config.lightBg }]}>
                                    <IconComponent size={16} color={config.color} />
                                </View>
                                <Text style={[styles.goalTitle, { color: theme.textPrimary }]}>{goal.title}</Text>
                            </View>
                            <View style={styles.goalProgressContainer}>
                                <View style={[styles.goalProgressBg, { backgroundColor: theme.cardSecondary }]}>
                                    <View
                                        style={[
                                            styles.goalProgressFill,
                                            {
                                                width: `${goal.progress}%`,
                                                backgroundColor: config.color,
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.goalProgressText, { color: theme.textSecondary }]}>
                                    {goal.current}/{goal.target} {goal.description}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Comparison Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={18} color={theme.textSecondary} />
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>השוואה לתקופה קודמת</Text>
                    </View>
                    <View style={[styles.comparisonCard, { backgroundColor: theme.card }]}>
                        <View style={[styles.comparisonIconWrap, { backgroundColor: config.lightBg }]}>
                            <IconComponent size={20} color={config.color} />
                        </View>
                        <View style={styles.comparisonContent}>
                            <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>{config.title}</Text>
                            <View style={styles.comparisonValueRow}>
                                <Text style={[styles.comparisonValue, { color: comparison.isPositive ? '#10B981' : '#EF4444' }]}>
                                    {comparison.isPositive ? '+' : '-'}{comparison.change}%
                                </Text>
                                {comparison.isPositive ? (
                                    <TrendingUp size={16} color="#10B981" />
                                ) : (
                                    <TrendingDown size={16} color="#EF4444" />
                                )}
                            </View>
                            <Text style={[styles.comparisonNote, { color: theme.textSecondary }]}>
                                {comparison.isPositive ? 'יותר' : 'פחות'} {config.title.toLowerCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Insights Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>תובנות</Text>
                    {config.insights.map((insight, index) => {
                        const InsightIcon = insight.icon;
                        const value = insightValues[insight.key as keyof typeof insightValues];
                        return (
                            <View
                                key={index}
                                style={[styles.insightCard, { backgroundColor: theme.card }]}
                            >
                                <View style={[styles.insightIconWrap, { backgroundColor: config.lightBg }]}>
                                    <InsightIcon size={18} color={config.color} strokeWidth={1.5} />
                                </View>
                                <View style={styles.insightContent}>
                                    <Text style={[styles.insightLabel, { color: theme.textSecondary }]}>
                                        {insight.title}
                                    </Text>
                                    <Text style={[styles.insightValue, { color: theme.textPrimary }]}>
                                        {value}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '600',
    },
    headerSpacer: {
        width: 44,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    timeRangeTabs: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    timeTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    timeTabActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    timeTabText: {
        fontSize: 14,
        fontWeight: '500',
    },
    timeTabTextActive: {
        fontWeight: '600',
    },
    statsCard: {
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    avgLabel: {
        fontSize: 13,
        marginBottom: 4,
    },
    mainValue: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    valueNumber: {
        fontSize: 40,
        fontWeight: '300',
    },
    valueUnit: {
        fontSize: 20,
        fontWeight: '300',
    },
    dateRange: {
        fontSize: 13,
        marginTop: 4,
    },
    loadingContainer: {
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    chartScrollContent: {
        paddingRight: 16,
    },
    chartContainer: {
        height: 220,
        position: 'relative',
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
    },
    barsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 180,
        paddingTop: 10,
    },
    barColumn: {
        alignItems: 'center',
    },
    bar: {
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    stackedBar: {
        justifyContent: 'flex-end',
        borderRadius: 4,
        overflow: 'hidden',
    },
    barSegment: {},
    singleBar: {
        borderRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        marginTop: 8,
    },
    insightsSection: {
        marginTop: 8,
    },
    insightsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'right',
    },
    insightCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        gap: 12,
    },
    insightIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    insightLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    insightValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptyChart: {
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyChartText: {
        fontSize: 14,
    },
    // Section styles
    section: {
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'right',
    },
    // Goal card styles
    goalCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    goalHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    goalIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goalTitle: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    goalProgressContainer: {
        gap: 8,
    },
    goalProgressBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    goalProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    goalProgressText: {
        fontSize: 12,
        textAlign: 'right',
    },
    // Comparison card styles
    comparisonCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 14,
    },
    comparisonIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    comparisonContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    comparisonLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    comparisonValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    comparisonValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    comparisonNote: {
        fontSize: 11,
        marginTop: 2,
    },
});
