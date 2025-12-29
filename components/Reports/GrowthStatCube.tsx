/**
 * GrowthStatCube - Production-ready growth tracking cube
 */
import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { TrendingUp, ChevronRight, ArrowUpRight, Plus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { getMeasurementsForChart, getGrowthChange } from '../../services/growthService';
import { Svg, Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GrowthStatCubeProps {
    childId?: string;
    onPress?: () => void;
}

// Animated sparkline component
const Sparkline = memo(({ data, color }: { data: number[]; color: string }) => {
    if (!data || data.length < 2) return null;

    const width = 70;
    const height = 28;
    const padding = 3;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => ({
        x: padding + (index / (data.length - 1)) * (width - 2 * padding),
        y: height - padding - ((value - min) / range) * (height - 2 * padding),
    }));

    // Create smooth bezier curve
    const pathD = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = points[index - 1];
        const cpx = (prevPoint.x + point.x) / 2;
        return `${path} C ${cpx} ${prevPoint.y} ${cpx} ${point.y} ${point.x} ${point.y}`;
    }, '');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${padding} ${height} Z`;
    const lastPoint = points[points.length - 1];

    return (
        <Svg width={width} height={height}>
            <Defs>
                <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity="0.4" />
                    <Stop offset="1" stopColor={color} stopOpacity="0" />
                </LinearGradient>
            </Defs>
            <Path d={areaD} fill="url(#sparkGrad)" />
            <Path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill="#fff" stroke={color} strokeWidth={2} />
        </Svg>
    );
});

Sparkline.displayName = 'Sparkline';

const GrowthStatCube = memo(({ childId, onPress }: GrowthStatCubeProps) => {
    const { theme } = useTheme();
    const [weightData, setWeightData] = useState<number[]>([]);
    const [change, setChange] = useState<{ weight?: number } | null>(null);
    const [latestWeight, setLatestWeight] = useState<number | null>(null);
    const scale = useSharedValue(1);

    useEffect(() => {
        if (childId) {
            getMeasurementsForChart(childId, 6).then((measurements) => {
                const weights = measurements
                    .filter(m => m.weight !== undefined)
                    .map(m => m.weight as number);
                setWeightData(weights);
                if (weights.length > 0) {
                    setLatestWeight(weights[weights.length - 1]);
                }
            });

            getGrowthChange(childId).then(setChange);
        }
    }, [childId]);

    const handlePress = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        scale.value = withSpring(0.96, { damping: 15 });
        setTimeout(() => {
            scale.value = withSpring(1, { damping: 15 });
        }, 100);
        onPress?.();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const hasData = weightData.length > 0;
    const hasChange = change?.weight !== undefined && change.weight !== 0;
    const isPositive = (change?.weight || 0) > 0;

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={1}>
            <Animated.View
                entering={FadeIn.duration(400)}
                style={[styles.statCard, { backgroundColor: theme.card }, animatedStyle]}
            >
                {/* Icon */}
                <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
                    <TrendingUp size={20} color="#10B981" strokeWidth={1.5} />
                </View>

                {/* Content */}
                <View style={styles.statValueRow}>
                    {hasData ? (
                        <>
                            {weightData.length >= 2 ? (
                                <View style={styles.sparklineWrap}>
                                    <Sparkline data={weightData} color="#10B981" />
                                </View>
                            ) : (
                                <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                                    {latestWeight}
                                </Text>
                            )}

                            {hasChange && (
                                <View style={[styles.trendBadge, {
                                    backgroundColor: isPositive ? '#D1FAE5' : '#FEE2E2'
                                }]}>
                                    <ArrowUpRight
                                        size={10}
                                        color={isPositive ? '#059669' : '#DC2626'}
                                        style={!isPositive ? { transform: [{ rotate: '90deg' }] } : undefined}
                                    />
                                    <Text style={{
                                        fontSize: 10,
                                        color: isPositive ? '#059669' : '#DC2626',
                                        fontWeight: '600'
                                    }}>
                                        {isPositive ? '+' : ''}{change?.weight}
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : (
                        // Empty state - invite to add first measurement
                        <View style={styles.emptyState}>
                            <View style={[styles.addBadge, { backgroundColor: '#ECFDF5' }]}>
                                <Plus size={14} color="#10B981" strokeWidth={2.5} />
                            </View>
                        </View>
                    )}
                </View>

                {/* Label */}
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>גדילה</Text>

                {/* Sub value */}
                {hasData && latestWeight && (
                    <Text style={[styles.statSubValue, { color: theme.textSecondary }]}>
                        {latestWeight} ק"ג
                    </Text>
                )}
                {!hasData && (
                    <Text style={[styles.statSubValue, { color: theme.textTertiary }]}>
                        הוסף מדידה
                    </Text>
                )}

                {/* Chevron */}
                <ChevronRight size={16} color={theme.textTertiary} style={styles.cardChevron} />
            </Animated.View>
        </TouchableOpacity>
    );
});

GrowthStatCube.displayName = 'GrowthStatCube';

const styles = StyleSheet.create({
    statCard: {
        width: (SCREEN_WIDTH - 52) / 2,
        padding: 16,
        borderRadius: 20,
        alignItems: 'flex-end',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValueRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        minHeight: 32,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
    },
    sparklineWrap: {
        marginRight: -4,
    },
    trendBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    statSubValue: {
        fontSize: 11,
        fontWeight: '400',
        marginTop: 2,
    },
    cardChevron: {
        position: 'absolute',
        left: 12,
        top: '50%',
        marginTop: -8,
    },
});

export default GrowthStatCube;
