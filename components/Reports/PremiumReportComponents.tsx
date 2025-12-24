import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Group, Skia } from '@shopify/react-native-skia';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    FadeInUp,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =====================================================
// AI INSIGHT HEADER - Premium Hook Card
// =====================================================

interface AIInsightProps {
    childName: string;
    insight: string;
    metric?: string;
}

export const AIInsightHeader: React.FC<AIInsightProps> = ({ childName, insight, metric }) => {
    const glowOpacity = useSharedValue(0.3);

    useEffect(() => {
        glowOpacity.value = withTiming(0.6, { duration: 2000 }, () => {
            glowOpacity.value = withTiming(0.3, { duration: 2000 });
        });
    }, []);

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.aiContainer}>
            {/* Glow effect */}
            <Animated.View style={[styles.aiGlow, glowStyle]} />

            {/* Glass card */}
            <View style={styles.aiCard}>
                <BlurView intensity={80} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
                <View style={styles.aiOverlay} />
                <View style={styles.aiBorder} />
                <View style={styles.aiTopEdge} />

                {/* Content */}
                <View style={styles.aiContent}>
                    <View style={styles.aiHeader}>
                        <View style={styles.aiPremiumBadge}>
                            <Text style={styles.aiPremiumText}>✨ תובנה חכמה</Text>
                        </View>
                    </View>

                    <Text style={styles.aiInsight}>{insight}</Text>

                    {metric && (
                        <View style={styles.aiMetricContainer}>
                            <Text style={styles.aiMetric}>{metric}</Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

// =====================================================
// PREMIUM STAT CARD - Glass with Trend
// =====================================================

interface PremiumStatCardProps {
    icon: LucideIcon;
    value: string | number;
    label: string;
    subValue?: string;
    change?: number;
    color: string;
    delay?: number;
    onPress?: () => void;
}

export const PremiumStatCard: React.FC<PremiumStatCardProps> = ({
    icon: Icon,
    value,
    label,
    subValue,
    change,
    color,
    delay = 0,
    onPress,
}) => {
    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);

    const handlePressIn = () => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
        pressed.value = withTiming(1, { duration: 100 });
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        pressed.value = withTiming(0, { duration: 150 });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View entering={FadeInUp.duration(500).delay(delay)}>
            <TouchableOpacity
                activeOpacity={1}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
            >
                <Animated.View style={[styles.statCard, animatedStyle]}>
                    <BlurView intensity={60} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
                    <View style={styles.statOverlay} />
                    <View style={styles.statBorder} />
                    <View style={styles.statTopEdge} />

                    {/* Icon */}
                    <View style={[styles.statIconWrap, { backgroundColor: `${color}15` }]}>
                        <Icon size={20} color={color} strokeWidth={1.5} />
                    </View>

                    {/* Value Row */}
                    <View style={styles.statValueRow}>
                        <Text style={styles.statValue}>{value}</Text>
                        {change !== undefined && change !== 0 && (
                            <View style={[
                                styles.trendBadge,
                                { backgroundColor: change > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                            ]}>
                                {change > 0 ? (
                                    <TrendingUp size={10} color="#10B981" />
                                ) : (
                                    <TrendingDown size={10} color="#EF4444" />
                                )}
                                <Text style={[
                                    styles.trendText,
                                    { color: change > 0 ? '#10B981' : '#EF4444' }
                                ]}>
                                    {Math.abs(change)}%
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.statLabel}>{label}</Text>
                    {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// =====================================================
// SKIA BEZIER CHART - Animated Line Chart
// =====================================================

interface SkiaChartProps {
    data: number[];
    labels: string[];
    color: string;
    height?: number;
    title: string;
}

export const SkiaBezierChart: React.FC<SkiaChartProps> = ({
    data,
    labels,
    color,
    height = 180,
    title,
}) => {
    const chartWidth = SCREEN_WIDTH - 64;
    const chartHeight = height - 40;
    const padding = { top: 20, bottom: 30, left: 10, right: 10 };

    const path = useMemo(() => {
        if (data.length < 2) return null;

        const maxValue = Math.max(...data) || 1;
        const minValue = Math.min(...data);
        const range = maxValue - minValue || 1;

        const points = data.map((value, index) => ({
            x: padding.left + (index / (data.length - 1)) * (chartWidth - padding.left - padding.right),
            y: padding.top + (1 - (value - minValue) / range) * (chartHeight - padding.top - padding.bottom),
        }));

        const skPath = Skia.Path.Make();
        skPath.moveTo(points[0].x, points[0].y);

        // Bezier curve through points
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const cpX = (prev.x + curr.x) / 2;
            skPath.cubicTo(cpX, prev.y, cpX, curr.y, curr.x, curr.y);
        }

        return skPath;
    }, [data, chartWidth, chartHeight]);

    const gradientPath = useMemo(() => {
        if (!path) return null;

        const clone = path.copy();
        const lastPoint = data.length - 1;
        const x = padding.left + (lastPoint / (data.length - 1)) * (chartWidth - padding.left - padding.right);

        clone.lineTo(x, chartHeight - padding.bottom + 10);
        clone.lineTo(padding.left, chartHeight - padding.bottom + 10);
        clone.close();

        return clone;
    }, [path, data, chartWidth, chartHeight]);

    if (!path || data.length < 2) {
        return (
            <View style={[styles.chartContainer, { height }]}>
                <BlurView intensity={60} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
                <View style={styles.chartOverlay} />
                <Text style={styles.chartTitle}>{title}</Text>
                <View style={styles.chartEmpty}>
                    <Text style={styles.chartEmptyText}>אין מספיק נתונים</Text>
                </View>
            </View>
        );
    }

    return (
        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={[styles.chartContainer, { height }]}>
            <BlurView intensity={60} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
            <View style={styles.chartOverlay} />
            <View style={styles.chartBorder} />

            <Text style={styles.chartTitle}>{title}</Text>

            <Canvas style={{ width: chartWidth, height: chartHeight }}>
                {/* Gradient fill under line */}
                <Group>
                    <Path path={gradientPath!} opacity={0.3}>
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(0, chartHeight)}
                            colors={[color, 'transparent']}
                        />
                    </Path>
                </Group>

                {/* Main line */}
                <Path
                    path={path}
                    style="stroke"
                    strokeWidth={2.5}
                    color={color}
                    strokeCap="round"
                    strokeJoin="round"
                />

                {/* Data points */}
                {data.map((value, index) => {
                    const maxValue = Math.max(...data) || 1;
                    const minValue = Math.min(...data);
                    const range = maxValue - minValue || 1;
                    const x = padding.left + (index / (data.length - 1)) * (chartWidth - padding.left - padding.right);
                    const y = padding.top + (1 - (value - minValue) / range) * (chartHeight - padding.top - padding.bottom);

                    return (
                        <Group key={index}>
                            {/* Outer glow */}
                            <Path
                                path={Skia.Path.Make().addCircle(x, y, 6)}
                                color={color}
                                opacity={0.2}
                            />
                            {/* Inner dot */}
                            <Path
                                path={Skia.Path.Make().addCircle(x, y, 3)}
                                color={color}
                            />
                        </Group>
                    );
                })}
            </Canvas>

            {/* Labels */}
            <View style={styles.chartLabels}>
                {labels.map((label, index) => (
                    <Text key={index} style={styles.chartLabel}>{label}</Text>
                ))}
            </View>
        </Animated.View>
    );
};

// =====================================================
// MILESTONE BADGE
// =====================================================

interface MilestoneBadgeProps {
    title: string;
    icon: string;
    achieved: boolean;
}

export const MilestoneBadge: React.FC<MilestoneBadgeProps> = ({ title, icon, achieved }) => (
    <View style={[styles.milestoneBadge, !achieved && styles.milestoneLocked]}>
        <Text style={styles.milestoneIcon}>{icon}</Text>
        <Text style={[styles.milestoneTitle, !achieved && styles.milestoneTitleLocked]}>{title}</Text>
    </View>
);

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
    // AI Insight
    aiContainer: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    aiGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#6366F1',
        borderRadius: 24,
        transform: [{ scale: 1.05 }],
    },
    aiCard: {
        borderRadius: 24,
        overflow: 'hidden',
        padding: 20,
    },
    aiOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
    },
    aiBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 24,
    },
    aiTopEdge: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    aiContent: {
        zIndex: 10,
    },
    aiHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 12,
    },
    aiPremiumBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    aiPremiumText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6366F1',
    },
    aiInsight: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1C1C1E',
        lineHeight: 26,
        textAlign: 'right',
    },
    aiMetricContainer: {
        marginTop: 16,
        alignItems: 'flex-end',
    },
    aiMetric: {
        fontSize: 28,
        fontWeight: '700',
        color: '#6366F1',
    },

    // Stat Card
    statCard: {
        borderRadius: 20,
        overflow: 'hidden',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
    },
    statOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
    },
    statBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
    },
    statTopEdge: {
        position: 'absolute',
        top: 0,
        left: 8,
        right: 8,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },
    trendText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    statSubValue: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },

    // Chart
    chartContainer: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        padding: 16,
    },
    chartOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
    },
    chartBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 24,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        textAlign: 'right',
        marginBottom: 12,
    },
    chartEmpty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartEmptyText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    chartLabel: {
        fontSize: 10,
        color: '#9CA3AF',
    },

    // Milestone
    milestoneBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        marginRight: 12,
        minWidth: 100,
    },
    milestoneLocked: {
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        opacity: 0.6,
    },
    milestoneIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    milestoneTitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6366F1',
        textAlign: 'center',
    },
    milestoneTitleLocked: {
        color: '#9CA3AF',
    },
});
