import React, { memo, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Scale, Ruler, Activity, TrendingUp, Edit2, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { calculatePercentile, getPercentileStatus } from '../../utils/whoGrowthStandards';
import { getGrowthChange } from '../../services/growthService';

interface GrowthStats {
    weight?: string;
    height?: string;
    headCircumference?: string;
}

interface GrowthChange {
    weight?: number;
    height?: number;
    headCircumference?: number;
    daysBetween: number;
}

interface GrowthPercentileCardProps {
    stats?: GrowthStats;
    ageInMonths: number;
    gender: 'boy' | 'girl' | 'other';
    childId?: string;
    onEdit?: () => void;
}

interface MetricRowProps {
    icon: any;
    label: string;
    value: string;
    unit: string;
    percentile: number;
    change?: number;
    color: string;
    iconBg: string;
}

const MetricRow = memo(({ icon: Icon, label, value, unit, percentile, change, color, iconBg }: MetricRowProps) => {
    const { theme } = useTheme();
    const status = getPercentileStatus(percentile);
    const hasValue = value && value !== '0' && value !== '-';
    const hasChange = change !== undefined && change !== 0;
    const isPositive = (change || 0) > 0;

    return (
        <View style={styles.metricRow}>
            {/* Right side - info */}
            <View style={styles.metricInfo}>
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    <Icon size={18} color={color} strokeWidth={2.5} />
                </View>
                <View style={styles.metricTexts}>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
                    <View style={styles.valueRow}>
                        <Text style={[styles.metricValue, { color: theme.textPrimary }]}>
                            {hasValue ? value : '-'}
                        </Text>
                        <Text style={[styles.metricUnit, { color: theme.textTertiary }]}>{unit}</Text>
                        {hasChange && (
                            <View style={[styles.changeBadge, { backgroundColor: isPositive ? '#D1FAE5' : '#FEE2E2' }]}>
                                {isPositive ? (
                                    <ArrowUpRight size={10} color="#10B981" strokeWidth={3} />
                                ) : (
                                    <ArrowDownRight size={10} color="#EF4444" strokeWidth={3} />
                                )}
                                <Text style={[styles.changeText, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                                    {isPositive ? '+' : ''}{change}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Left side - percentile slider */}
            <View style={styles.percentileSection}>
                {hasValue ? (
                    <>
                        <View style={styles.sliderContainer}>
                            {/* Background track */}
                            <View style={[styles.sliderTrack, { backgroundColor: theme.border }]}>
                                {/* Marker lines */}
                                <View style={[styles.markerLine, { left: '3%' }]} />
                                <View style={[styles.markerLine, { left: '15%' }]} />
                                <View style={[styles.markerLine, { left: '50%' }]} />
                                <View style={[styles.markerLine, { left: '85%' }]} />
                                <View style={[styles.markerLine, { left: '97%' }]} />

                                {/* Percentile dot */}
                                <View
                                    style={[
                                        styles.percentileDot,
                                        {
                                            left: `${Math.min(Math.max(percentile, 3), 97)}%`,
                                            backgroundColor: status.color,
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                        <View style={[styles.percentileBadge, { backgroundColor: status.bgColor }]}>
                            <Text style={[styles.percentileText, { color: status.color }]}>
                                {Math.round(percentile)}%
                            </Text>
                        </View>
                    </>
                ) : (
                    <Text style={[styles.noDataText, { color: theme.textTertiary }]}>לא הוזן</Text>
                )}
            </View>
        </View>
    );
});

MetricRow.displayName = 'MetricRow';

const GrowthPercentileCard = memo(({ stats, ageInMonths, gender, childId, onEdit }: GrowthPercentileCardProps) => {
    const { theme } = useTheme();
    const genderKey = gender === 'girl' ? 'girl' : 'boy';
    const safeAge = isNaN(ageInMonths) || ageInMonths < 0 ? 0 : ageInMonths;
    const [changes, setChanges] = useState<GrowthChange | null>(null);

    // Fetch growth changes
    useEffect(() => {
        if (childId) {
            getGrowthChange(childId).then(setChanges);
        }
    }, [childId, stats]);

    const percentiles = useMemo(() => {
        const weight = stats?.weight ? parseFloat(stats.weight) : 0;
        const height = stats?.height ? parseFloat(stats.height) : 0;
        const head = stats?.headCircumference ? parseFloat(stats.headCircumference) : 0;

        return {
            weight: weight > 0 ? calculatePercentile(weight, safeAge, 'weight', genderKey) : 0,
            height: height > 0 ? calculatePercentile(height, safeAge, 'length', genderKey) : 0,
            head: head > 0 ? calculatePercentile(head, safeAge, 'head', genderKey) : 0,
        };
    }, [stats, safeAge, genderKey]);

    return (
        <Animated.View
            entering={FadeInUp.duration(500).springify().damping(15)}
            style={[styles.container, { backgroundColor: theme.card }]}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <TrendingUp size={18} color="#10B981" strokeWidth={2.5} />
                    <Text style={[styles.title, { color: theme.textPrimary }]}>מעקב גדילה</Text>
                </View>
                {onEdit && (
                    <TouchableOpacity onPress={onEdit} style={styles.editButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Edit2 size={16} color={theme.textTertiary} strokeWidth={2} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.metricsContainer}>
                <MetricRow
                    icon={Scale}
                    label="משקל"
                    value={stats?.weight || '-'}
                    unit="ק״ג"
                    percentile={percentiles.weight}
                    change={changes?.weight}
                    color="#3B82F6"
                    iconBg="#EFF6FF"
                />

                <View style={[styles.divider, { backgroundColor: theme.divider }]} />

                <MetricRow
                    icon={Ruler}
                    label="גובה"
                    value={stats?.height || '-'}
                    unit="ס״מ"
                    percentile={percentiles.height}
                    change={changes?.height}
                    color="#10B981"
                    iconBg="#ECFDF5"
                />

                <View style={[styles.divider, { backgroundColor: theme.divider }]} />

                <MetricRow
                    icon={Activity}
                    label="היקף ראש"
                    value={stats?.headCircumference || '-'}
                    unit="ס״מ"
                    percentile={percentiles.head}
                    change={changes?.headCircumference}
                    color="#8B5CF6"
                    iconBg="#F5F3FF"
                />
            </View>

            {/* Legend & Source */}
            <View style={styles.legend}>
                <Text style={[styles.legendText, { color: theme.textTertiary }]}>
                    פרצנטיל לפי תקן WHO · גיל {safeAge} חודשים
                </Text>
            </View>

            {/* Medical Disclaimer */}
            <View style={[styles.disclaimer, { backgroundColor: theme.background }]}>
                <Info size={12} color={theme.textTertiary} strokeWidth={2} />
                <Text style={[styles.disclaimerText, { color: theme.textTertiary }]}>
                    לייעוץ בלבד. לחששות בנושא גדילה יש להתייעץ עם רופא.
                </Text>
            </View>
        </Animated.View>
    );
});

GrowthPercentileCard.displayName = 'GrowthPercentileCard';

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 16,
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
        fontSize: 16,
        fontWeight: '700',
    },
    editButton: {
        padding: 4,
    },
    metricsContainer: {
        gap: 0,
    },
    metricRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    metricInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricTexts: {
        alignItems: 'flex-end',
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 2,
    },
    valueRow: {
        flexDirection: 'row-reverse',
        alignItems: 'baseline',
        gap: 4,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    metricUnit: {
        fontSize: 12,
        fontWeight: '500',
    },
    percentileSection: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        minWidth: 140,
    },
    sliderContainer: {
        flex: 1,
        height: 20,
        justifyContent: 'center',
    },
    sliderTrack: {
        height: 6,
        borderRadius: 3,
        position: 'relative',
    },
    markerLine: {
        position: 'absolute',
        width: 1,
        height: 10,
        backgroundColor: '#D1D5DB',
        top: -2,
    },
    percentileDot: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        top: -4,
        marginLeft: -7,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    percentileBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 44,
        alignItems: 'center',
    },
    percentileText: {
        fontSize: 12,
        fontWeight: '700',
    },
    noDataText: {
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        width: '100%',
    },
    legend: {
        marginTop: 12,
        alignItems: 'center',
    },
    legendText: {
        fontSize: 11,
        fontWeight: '500',
    },
    disclaimer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    disclaimerText: {
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
    },
    changeBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 6,
    },
    changeText: {
        fontSize: 10,
        fontWeight: '700',
    },
});

export default GrowthPercentileCard;
