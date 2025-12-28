import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Dimensions, Alert, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { TrendingUp, TrendingDown, Minus, Plus, X, Scale, Ruler, Baby, Calendar, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// WHO Growth Standards (simplified percentiles for boys/girls)
const WHO_STANDARDS = {
    boys: {
        weight: { // kg by month
            p3: [2.5, 3.4, 4.3, 5.0, 5.6, 6.0, 6.4, 6.7, 6.9, 7.1, 7.3, 7.5, 7.7],
            p50: [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6],
            p97: [4.4, 5.8, 7.1, 8.0, 8.7, 9.3, 9.8, 10.3, 10.7, 11.0, 11.4, 11.7, 12.0],
        },
        height: { // cm by month
            p3: [46.1, 50.8, 54.4, 57.3, 59.7, 61.7, 63.3, 64.8, 66.2, 67.5, 68.7, 69.9, 71.0],
            p50: [49.9, 54.7, 58.4, 61.4, 63.9, 65.9, 67.6, 69.2, 70.6, 72.0, 73.3, 74.5, 75.7],
            p97: [53.7, 58.6, 62.4, 65.5, 68.0, 70.1, 71.9, 73.5, 75.0, 76.5, 77.9, 79.1, 80.5],
        },
    },
    girls: {
        weight: {
            p3: [2.4, 3.2, 3.9, 4.5, 5.0, 5.4, 5.7, 6.0, 6.3, 6.5, 6.7, 6.9, 7.0],
            p50: [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9],
            p97: [4.2, 5.5, 6.6, 7.5, 8.2, 8.8, 9.3, 9.8, 10.2, 10.5, 10.9, 11.2, 11.5],
        },
        height: {
            p3: [45.4, 49.8, 53.0, 55.6, 57.8, 59.6, 61.2, 62.7, 64.0, 65.3, 66.5, 67.7, 68.9],
            p50: [49.1, 53.7, 57.1, 59.8, 62.1, 64.0, 65.7, 67.3, 68.7, 70.1, 71.5, 72.8, 74.0],
            p97: [52.9, 57.6, 61.1, 64.0, 66.4, 68.5, 70.3, 71.9, 73.5, 75.0, 76.4, 77.8, 79.2],
        },
    },
};

interface GrowthEntry {
    date: Date;
    weight?: number;
    height?: number;
    headCircumference?: number;
}

interface GrowthChartsProps {
    babyGender: 'boy' | 'girl';
    babyBirthDate: Date;
    entries: GrowthEntry[];
    onAddEntry?: (entry: GrowthEntry) => void;
}

const GrowthCharts = ({
    babyGender = 'boy',
    babyBirthDate,
    entries = [],
    onAddEntry
}: GrowthChartsProps) => {
    const { theme, isDarkMode } = useTheme();
    const [isLinear, setIsLinear] = useState(false);
    const [activeTab, setActiveTab] = useState<'weight' | 'height'>('weight');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newWeight, setNewWeight] = useState('');
    const [newHeight, setNewHeight] = useState('');

    const standards = WHO_STANDARDS[babyGender === 'boy' ? 'boys' : 'girls'];

    // Calculate baby age in months
    const ageInMonths = useMemo(() => {
        const now = new Date();
        const months = (now.getFullYear() - babyBirthDate.getFullYear()) * 12 +
            (now.getMonth() - babyBirthDate.getMonth());
        return Math.min(Math.max(0, months), 12);
    }, [babyBirthDate]);

    // Get latest entry
    const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;

    // Calculate percentile
    const calculatePercentile = (value: number, type: 'weight' | 'height'): string => {
        const std = standards[type];
        const month = Math.min(ageInMonths, 12);

        if (value <= std.p3[month]) return 'מתחת לאחוזון 3';
        if (value <= std.p50[month]) return `אחוזון ${Math.round((value - std.p3[month]) / (std.p50[month] - std.p3[month]) * 47 + 3)}`;
        if (value <= std.p97[month]) return `אחוזון ${Math.round((value - std.p50[month]) / (std.p97[month] - std.p50[month]) * 47 + 50)}`;
        return 'מעל אחוזון 97';
    };

    // Get trend
    const getTrend = (type: 'weight' | 'height') => {
        if (entries.length < 2) return null;
        const last = entries[entries.length - 1];
        const prev = entries[entries.length - 2];
        const current = type === 'weight' ? last.weight : last.height;
        const previous = type === 'weight' ? prev.weight : prev.height;

        if (!current || !previous) return null;
        const diff = current - previous;

        if (diff > 0) return { icon: TrendingUp, color: '#10B981', text: `+${diff.toFixed(1)}` };
        if (diff < 0) return { icon: TrendingDown, color: '#EF4444', text: diff.toFixed(1) };
        return { icon: Minus, color: '#6B7280', text: '0' };
    };

    const handleAddEntry = () => {
        if (!newWeight && !newHeight) {
            Alert.alert('שים לב', 'יש להזין לפחות משקל או גובה');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const entry: GrowthEntry = {
            date: new Date(),
            weight: newWeight ? parseFloat(newWeight) : undefined,
            height: newHeight ? parseFloat(newHeight) : undefined,
        };

        onAddEntry?.(entry);
        setShowAddModal(false);
        setNewWeight('');
        setNewHeight('');
    };

    // Prepare chart data
    const chartData = useMemo(() => {
        const labels = entries.slice(-7).map((e, i) => {
            const d = new Date(e.date);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        });

        const values = entries.slice(-7).map(e =>
            activeTab === 'weight' ? (e.weight || 0) : (e.height || 0)
        );

        return {
            labels: labels.length > 0 ? labels : ['היום'],
            datasets: [{ data: values.length > 0 ? values : [0] }],
        };
    }, [entries, activeTab]);

    const weightTrend = getTrend('weight');
    const heightTrend = getTrend('height');

    return (
        <View style={[styles.container, { backgroundColor: theme.card }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                        גרף גדילה {isLinear ? '(לינארי)' : '(אחוזונים)'}
                    </Text>
                    <Text style={styles.ageText}>{ageInMonths} חודשים</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={[styles.toggleButton, { backgroundColor: theme.cardSecondary }]}
                        onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setIsLinear(!isLinear);
                        }}
                    >
                        {isLinear ? (
                            <TrendingUp size={18} color={theme.textPrimary} />
                        ) : (
                            <Activity size={18} color={theme.textPrimary} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowAddModal(true)}
                    >
                        <Plus size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ... (rest of render) ... */}

            {/* Chart */}
            {entries.length > 1 ? (
                <View style={styles.chartContainer}>
                    <LineChart
                        data={chartData}
                        width={SCREEN_WIDTH - 72}
                        height={160}
                        chartConfig={{
                            backgroundColor: 'transparent',
                            backgroundGradientFrom: theme.card,
                            backgroundGradientTo: theme.card,
                            decimalPlaces: 1,
                            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                            labelColor: () => '#9CA3AF',
                            style: { borderRadius: 16 },
                            propsForDots: {
                                r: '4',
                                strokeWidth: '2',
                                stroke: '#6366F1',
                            },
                        }}
                        bezier={!isLinear}
                        style={styles.chart}
                        withHorizontalLabels={true}
                        withVerticalLabels={true}
                        withInnerLines={false}
                    />
                </View>
            ) : (

                <View style={styles.emptyChart}>
                    <Calendar size={32} color="#D1D5DB" />
                    <Text style={styles.emptyText}>הוסף לפחות 2 מדידות לראות גרף</Text>
                </View>
            )}

            {/* Add Entry Modal */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <X size={22} color="#6B7280" />
                            </TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                                הוסף מדידה
                            </Text>
                            <View style={{ width: 22 }} />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>משקל (ק"ג)</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    value={newWeight}
                                    onChangeText={setNewWeight}
                                    keyboardType="decimal-pad"
                                    placeholder="לדוגמה: 7.5"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>גובה (ס"מ)</Text>
                                <TextInput
                                    style={[styles.input, { color: theme.textPrimary }]}
                                    value={newHeight}
                                    onChangeText={setNewHeight}
                                    keyboardType="decimal-pad"
                                    placeholder="לדוגמה: 65"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleAddEntry}>
                            <Text style={styles.saveButtonText}>שמור</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    ageText: {
        fontSize: 13,
        color: '#6B7280',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#6366F1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Stats
    statsRow: {
        flexDirection: 'row-reverse',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 14,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    statCardActive: {
        borderColor: '#6366F1',
        backgroundColor: '#EEF2FF',
    },
    statHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    statLabelActive: {
        color: '#6366F1',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'right',
    },
    trendBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Percentile
    percentileBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#EEF2FF',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    percentileText: {
        fontSize: 13,
        color: '#6366F1',
        fontWeight: '600',
    },

    // Chart
    chartContainer: {
        alignItems: 'center',
    },
    chart: {
        borderRadius: 16,
    },
    emptyChart: {
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
    },
    emptyText: {
        color: '#9CA3AF',
        marginTop: 8,
        fontSize: 13,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    inputRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 6,
        textAlign: 'right',
    },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        textAlign: 'right',
    },
    saveButton: {
        backgroundColor: '#6366F1',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default GrowthCharts;
