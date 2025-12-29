// components/Reports/DetailedGrowthScreen.tsx - Production-Ready Growth Detail Screen
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    RefreshControl,
    Share,
    Alert,
} from 'react-native';
import {
    ChevronLeft, TrendingUp, Scale, Ruler, Activity,
    Plus, Info, Calendar, Edit3, Share2
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import {
    getMeasurementsForChart,
    getGrowthChange,
    GrowthMeasurement
} from '../../services/growthService';
import { calculatePercentile, getPercentileStatus } from '../../utils/whoGrowthStandards';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { Svg, Path, Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import GrowthModal from '../Home/GrowthModal';
import Animated, { FadeInUp, FadeOutDown, Layout } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DetailedGrowthScreenProps {
    onClose: () => void;
    childId: string;
    ageInMonths: number;
    gender: 'boy' | 'girl' | 'other';
}

// Growth Chart Component
const GrowthChart = ({
    data,
    color,
    title,
    unit
}: {
    data: { date: Date; value: number }[];
    color: string;
    title: string;
    unit: string;
}) => {
    const { theme } = useTheme();

    if (!data || data.length < 2) {
        return (
            <View style={[chartStyles.container, { backgroundColor: theme.card }]}>
                <Text style={[chartStyles.title, { color: theme.textPrimary }]}>{title}</Text>
                <View style={chartStyles.empty}>
                    <View style={[chartStyles.emptyIcon, { backgroundColor: `${color}15` }]}>
                        <TrendingUp size={24} color={color} strokeWidth={1.5} />
                    </View>
                    <Text style={[chartStyles.emptyText, { color: theme.textTertiary }]}>
                        נדרשות לפחות 2 מדידות
                    </Text>
                </View>
            </View>
        );
    }

    const width = SCREEN_WIDTH - 64;
    const height = 140;
    const padding = { top: 16, right: 16, bottom: 24, left: 44 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.value);
    const min = Math.min(...values) * 0.97;
    const max = Math.max(...values) * 1.03;
    const range = max - min || 1;

    const points = data.map((d, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartWidth,
        y: padding.top + chartHeight - ((d.value - min) / range) * chartHeight,
        value: d.value,
        date: d.date,
    }));

    const pathD = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = points[index - 1];
        const cpx = (prevPoint.x + point.x) / 2;
        return `${path} C ${cpx} ${prevPoint.y} ${cpx} ${point.y} ${point.x} ${point.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
    const yLabels = [min, max].map(v => v.toFixed(1));

    return (
        <View style={[chartStyles.container, { backgroundColor: theme.card }]}>
            <View style={chartStyles.header}>
                <Text style={[chartStyles.title, { color: theme.textPrimary }]}>{title}</Text>
                <Text style={[chartStyles.currentValue, { color }]}>
                    {data[data.length - 1].value.toFixed(1)} {unit}
                </Text>
            </View>
            <Svg width={width} height={height}>
                <Defs>
                    <LinearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={color} stopOpacity="0.25" />
                        <Stop offset="1" stopColor={color} stopOpacity="0" />
                    </LinearGradient>
                </Defs>

                {[0, 1].map((ratio, i) => (
                    <Line key={i}
                        x1={padding.left} y1={padding.top + chartHeight * ratio}
                        x2={width - padding.right} y2={padding.top + chartHeight * ratio}
                        stroke={theme.border} strokeWidth={1} strokeDasharray="4,4"
                    />
                ))}

                <Path d={areaD} fill={`url(#grad-${title})`} />
                <Path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />

                {points.map((point, i) => (
                    <Circle key={i} cx={point.x} cy={point.y} r={4}
                        fill="#fff" stroke={color} strokeWidth={2}
                    />
                ))}
            </Svg>

            <View style={chartStyles.yLabels}>
                {yLabels.reverse().map((label, i) => (
                    <Text key={i} style={[chartStyles.yLabel, { color: theme.textTertiary }]}>{label}</Text>
                ))}
            </View>
        </View>
    );
};

const chartStyles = StyleSheet.create({
    container: { borderRadius: 16, padding: 16, marginBottom: 12 },
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 15, fontWeight: '600', textAlign: 'right' },
    currentValue: { fontSize: 14, fontWeight: '700' },
    empty: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 13 },
    yLabels: { position: 'absolute', left: 20, top: 40, bottom: 48, justifyContent: 'space-between' },
    yLabel: { fontSize: 10 },
});

// Percentile Card
const PercentileCard = ({ icon: Icon, label, value, unit, percentile, change, color, bgColor }: {
    icon: any; label: string; value: number | null; unit: string;
    percentile: number; change?: number; color: string; bgColor: string;
}) => {
    const { theme } = useTheme();
    const status = getPercentileStatus(percentile);
    const hasValue = value !== null && value > 0;
    const hasChange = change !== undefined && change !== 0;

    return (
        <View style={[percStyles.card, { backgroundColor: theme.card }]}>
            <View style={[percStyles.iconWrap, { backgroundColor: bgColor }]}>
                <Icon size={20} color={color} strokeWidth={2} />
            </View>
            <View style={percStyles.content}>
                <Text style={[percStyles.label, { color: theme.textSecondary }]}>{label}</Text>
                <View style={percStyles.valueRow}>
                    <Text style={[percStyles.value, { color: theme.textPrimary }]}>
                        {hasValue ? value : '-'}
                    </Text>
                    <Text style={[percStyles.unit, { color: theme.textTertiary }]}>{unit}</Text>
                    {hasChange && (
                        <View style={[percStyles.changeBadge, { backgroundColor: change > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                            <Text style={[percStyles.changeText, { color: change > 0 ? '#059669' : '#DC2626' }]}>
                                {change > 0 ? '+' : ''}{change}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            {hasValue && (
                <View style={percStyles.percentileWrap}>
                    <View style={[percStyles.percentileBadge, { backgroundColor: status.bgColor }]}>
                        <Text style={[percStyles.percentileText, { color: status.color }]}>
                            {Math.round(percentile)}%
                        </Text>
                    </View>
                    <Text style={[percStyles.percentileLabel, { color: theme.textTertiary }]}>{status.status}</Text>
                </View>
            )}
        </View>
    );
};

const percStyles = StyleSheet.create({
    card: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 12 },
    iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, marginRight: 12, alignItems: 'flex-end' },
    label: { fontSize: 12, marginBottom: 2 },
    valueRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    value: { fontSize: 24, fontWeight: '700' },
    unit: { fontSize: 14 },
    changeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 4 },
    changeText: { fontSize: 11, fontWeight: '600' },
    percentileWrap: { alignItems: 'center', marginLeft: 12 },
    percentileBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    percentileText: { fontSize: 14, fontWeight: '700' },
    percentileLabel: { fontSize: 10, marginTop: 2 },
});

// Measurement Row - Now tappable for edit
const MeasurementRow = ({ measurement, onEdit }: {
    measurement: GrowthMeasurement;
    onEdit: (m: GrowthMeasurement) => void;
}) => {
    const { theme } = useTheme();
    const date = measurement.date.toDate();

    return (
        <TouchableOpacity onPress={() => onEdit(measurement)} activeOpacity={0.7}>
            <Animated.View
                entering={FadeInUp.duration(300)}
                exiting={FadeOutDown.duration(200)}
                layout={Layout.springify()}
                style={[histStyles.row, { backgroundColor: theme.card }]}
            >
                <View style={histStyles.dateWrap}>
                    <Calendar size={14} color={theme.textTertiary} />
                    <Text style={[histStyles.date, { color: theme.textSecondary }]}>
                        {format(date, 'd/M/yy', { locale: he })}
                    </Text>
                </View>

                <View style={histStyles.values}>
                    {measurement.weight && (
                        <View style={histStyles.valueItem}>
                            <Scale size={12} color="#3B82F6" />
                            <Text style={[histStyles.valueText, { color: theme.textPrimary }]}>
                                {measurement.weight} ק"ג
                            </Text>
                        </View>
                    )}
                    {measurement.height && (
                        <View style={histStyles.valueItem}>
                            <Ruler size={12} color="#10B981" />
                            <Text style={[histStyles.valueText, { color: theme.textPrimary }]}>
                                {measurement.height} ס"מ
                            </Text>
                        </View>
                    )}
                    {measurement.headCircumference && (
                        <View style={histStyles.valueItem}>
                            <Activity size={12} color="#8B5CF6" />
                            <Text style={[histStyles.valueText, { color: theme.textPrimary }]}>
                                {measurement.headCircumference} ס"מ
                            </Text>
                        </View>
                    )}
                </View>

                <Edit3 size={16} color={theme.textTertiary} />
            </Animated.View>
        </TouchableOpacity>
    );
};

const histStyles = StyleSheet.create({
    row: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8 },
    dateWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginLeft: 12 },
    date: { fontSize: 12, fontWeight: '500' },
    values: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    valueItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    valueText: { fontSize: 13, fontWeight: '500' },
});

export default function DetailedGrowthScreen({
    onClose,
    childId,
    ageInMonths,
    gender,
}: DetailedGrowthScreenProps) {
    const { theme } = useTheme();
    const { baby, refresh } = useBabyProfile(childId);
    const [measurements, setMeasurements] = useState<GrowthMeasurement[]>([]);
    const [change, setChange] = useState<{ weight?: number; height?: number; headCircumference?: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editMeasurement, setEditMeasurement] = useState<GrowthMeasurement | undefined>(undefined);

    const genderKey = gender === 'girl' ? 'girl' : 'boy';

    const fetchData = useCallback(async () => {
        try {
            const [measurementsData, changeData] = await Promise.all([
                getMeasurementsForChart(childId, 30),
                getGrowthChange(childId),
            ]);
            setMeasurements(measurementsData);
            setChange(changeData);
        } catch (error) {
            console.error('Error fetching growth data:', error);
        }
    }, [childId]);

    useEffect(() => {
        setLoading(true);
        fetchData().finally(() => setLoading(false));
    }, [fetchData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        await refresh?.();
        setRefreshing(false);
    }, [fetchData, refresh]);

    const handleEdit = useCallback((m: GrowthMeasurement) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditMeasurement(m);
        setShowModal(true);
    }, []);

    const handleAddNew = useCallback(() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setEditMeasurement(undefined);
        setShowModal(true);
    }, []);

    const handleModalClose = useCallback(() => {
        setShowModal(false);
        setEditMeasurement(undefined);
        fetchData();
        refresh?.();
    }, [fetchData, refresh]);

    // Export to share with doctor
    const handleExport = useCallback(async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const babyName = baby?.name || 'התינוק';
        let reportText = `📊 דוח מעקב גדילה - ${babyName}\n`;
        reportText += `גיל: ${ageInMonths} חודשים\n`;
        reportText += `תאריך: ${format(new Date(), 'd בMMMM yyyy', { locale: he })}\n\n`;

        reportText += `━━━ מדידות נוכחיות ━━━\n`;
        if (baby?.stats?.weight) reportText += `• משקל: ${baby.stats.weight} ק"ג\n`;
        if (baby?.stats?.height) reportText += `• גובה: ${baby.stats.height} ס"מ\n`;
        if (baby?.stats?.headCircumference) reportText += `• היקף ראש: ${baby.stats.headCircumference} ס"מ\n`;

        if (measurements.length > 0) {
            reportText += `\n━━━ היסטוריית מדידות (${measurements.length}) ━━━\n`;
            measurements.slice().reverse().slice(0, 10).forEach((m) => {
                const date = format(m.date.toDate(), 'd/M/yy');
                const parts: string[] = [];
                if (m.weight) parts.push(`${m.weight} ק"ג`);
                if (m.height) parts.push(`${m.height} ס"מ`);
                if (m.headCircumference) parts.push(`ראש ${m.headCircumference}`);
                reportText += `${date}: ${parts.join(' | ')}\n`;
            });
        }

        reportText += `\n📱 נוצר באפליקציית CalmParent`;

        try {
            await Share.share({
                message: reportText,
                title: `דוח גדילה - ${babyName}`,
            });
        } catch (error) {
            Alert.alert('שגיאה', 'לא הצלחנו לשתף את הדוח');
        }
    }, [baby, measurements, ageInMonths]);

    const chartData = useMemo(() => ({
        weightData: measurements.filter(m => m.weight !== undefined).map(m => ({ date: m.date.toDate(), value: m.weight! })),
        heightData: measurements.filter(m => m.height !== undefined).map(m => ({ date: m.date.toDate(), value: m.height! })),
        headData: measurements.filter(m => m.headCircumference !== undefined).map(m => ({ date: m.date.toDate(), value: m.headCircumference! })),
    }), [measurements]);

    const currentValues = useMemo(() => {
        // Try baby.stats first, fallback to latest measurement
        const latestMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

        const weight = baby?.stats?.weight
            ? parseFloat(baby.stats.weight)
            : latestMeasurement?.weight || null;
        const height = baby?.stats?.height
            ? parseFloat(baby.stats.height)
            : latestMeasurement?.height || null;
        const head = baby?.stats?.headCircumference
            ? parseFloat(baby.stats.headCircumference)
            : latestMeasurement?.headCircumference || null;

        return {
            weight, height, head,
            weightPercentile: weight ? calculatePercentile(weight, ageInMonths, 'weight', genderKey) : 0,
            heightPercentile: height ? calculatePercentile(height, ageInMonths, 'length', genderKey) : 0,
            headPercentile: head ? calculatePercentile(head, ageInMonths, 'head', genderKey) : 0,
        };
    }, [baby?.stats, measurements, ageInMonths, genderKey]);

    const lastMeasurementDate = useMemo(() => {
        if (measurements.length === 0) return null;
        return format(measurements[measurements.length - 1].date.toDate(), 'd בMMMM yyyy', { locale: he });
    }, [measurements]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity style={styles.backButton}
                    onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
                >
                    <ChevronLeft size={28} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitle}>
                    <TrendingUp size={20} color="#10B981" strokeWidth={2} />
                    <Text style={[styles.headerText, { color: theme.textPrimary }]}>מעקב גדילה</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleExport}>
                        <Share2 size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={handleAddNew}>
                        <Plus size={24} color="#10B981" strokeWidth={2} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
            >
                {/* Summary */}
                <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[styles.summaryLabel, { color: '#047857' }]}>גיל הילד</Text>
                    <View style={styles.summaryValue}>
                        <Text style={[styles.summaryNumber, { color: '#10B981' }]}>{ageInMonths}</Text>
                        <Text style={[styles.summaryUnit, { color: '#10B981' }]}>חודשים</Text>
                    </View>
                    {lastMeasurementDate && (
                        <Text style={[styles.lastUpdate, { color: '#047857' }]}>מדידה אחרונה: {lastMeasurementDate}</Text>
                    )}
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#10B981" />
                    </View>
                ) : (
                    <>
                        {/* Percentile Cards */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>מדידות נוכחיות</Text>
                            <PercentileCard icon={Scale} label="משקל" value={currentValues.weight} unit="ק״ג"
                                percentile={currentValues.weightPercentile} change={change?.weight} color="#3B82F6" bgColor="#EFF6FF" />
                            <PercentileCard icon={Ruler} label="גובה" value={currentValues.height} unit="ס״מ"
                                percentile={currentValues.heightPercentile} change={change?.height} color="#10B981" bgColor="#ECFDF5" />
                            <PercentileCard icon={Activity} label="היקף ראש" value={currentValues.head} unit="ס״מ"
                                percentile={currentValues.headPercentile} change={change?.headCircumference} color="#8B5CF6" bgColor="#F5F3FF" />
                        </View>

                        {/* Charts */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>מגמת גדילה</Text>
                            <GrowthChart data={chartData.weightData} color="#3B82F6" title="משקל" unit="ק״ג" />
                            <GrowthChart data={chartData.heightData} color="#10B981" title="גובה" unit="ס״מ" />
                            <GrowthChart data={chartData.headData} color="#8B5CF6" title="היקף ראש" unit="ס״מ" />
                        </View>

                        {/* History */}
                        {measurements.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                    היסטוריית מדידות ({measurements.length})
                                </Text>
                                {measurements.slice().reverse().map((m) => (
                                    <MeasurementRow key={m.id} measurement={m} onEdit={handleEdit} />
                                ))}
                            </View>
                        )}

                        {/* Export Button */}
                        <TouchableOpacity
                            style={[styles.exportBtn, { backgroundColor: theme.card }]}
                            onPress={handleExport}
                        >
                            <Share2 size={18} color="#10B981" />
                            <Text style={[styles.exportBtnText, { color: theme.textPrimary }]}>
                                שתף דוח לרופא
                            </Text>
                        </TouchableOpacity>

                        {/* Disclaimer */}
                        <View style={[styles.disclaimer, { backgroundColor: theme.cardSecondary }]}>
                            <Info size={14} color={theme.textTertiary} />
                            <Text style={[styles.disclaimerText, { color: theme.textTertiary }]}>
                                הנתונים מחושבים לפי תקן WHO. לייעוץ רפואי יש לפנות לרופא.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>

            <GrowthModal
                visible={showModal}
                onClose={handleModalClose}
                childId={childId}
                editMeasurement={editMeasurement}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 10 : 20, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1
    },
    backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerText: { fontSize: 18, fontWeight: '600' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerBtn: { padding: 6 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    summaryCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 },
    summaryLabel: { fontSize: 13, marginBottom: 4 },
    summaryValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    summaryNumber: { fontSize: 48, fontWeight: '300' },
    summaryUnit: { fontSize: 20, fontWeight: '300' },
    lastUpdate: { fontSize: 12, marginTop: 8 },
    loadingContainer: { height: 300, alignItems: 'center', justifyContent: 'center' },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '600', textAlign: 'right', marginBottom: 12 },
    exportBtn: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: 16, borderRadius: 16, marginBottom: 16
    },
    exportBtnText: { fontSize: 15, fontWeight: '600' },
    disclaimer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12 },
    disclaimerText: { fontSize: 12, flex: 1, textAlign: 'right' },
});
