import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
    Canvas,
    Path,
    Skia,
    LinearGradient,
    vec,
    Group,
    Circle,
    Shadow,
} from '@shopify/react-native-skia';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    FadeInUp,
    Easing,
    interpolate,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =====================================================
// LIQUID GLASS LINE CHART
// Premium Bezier curve with gradient stroke and glass fill
// =====================================================

interface LiquidGlassChartProps {
    data: number[];
    labels: string[];
    title: string;
    gradientColors?: [string, string];
    height?: number;
    showLabels?: boolean;
}

const LiquidGlassLineChart: React.FC<LiquidGlassChartProps> = ({
    data,
    labels,
    title,
    gradientColors = ['#818CF8', '#3B82F6'],
    height = 200,
    showLabels = true,
}) => {
    const chartWidth = SCREEN_WIDTH - 64;
    const chartHeight = height - 60;
    const padding = { top: 20, bottom: 10, left: 15, right: 15 };
    const effectiveWidth = chartWidth - padding.left - padding.right;
    const effectiveHeight = chartHeight - padding.top - padding.bottom;

    // Animation progress for draw effect
    const drawProgress = useSharedValue(0);
    const glowPulse = useSharedValue(0);

    useEffect(() => {
        // Draw animation - spring from left to right
        drawProgress.value = 0;
        drawProgress.value = withSpring(1, {
            damping: 20,
            stiffness: 90,
            mass: 1,
        });

        // Subtle pulse for active point
        glowPulse.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, [data]);

    // Calculate points and paths
    const { linePath, areaPath, points, maxValue, minValue } = useMemo(() => {
        if (data.length < 2) {
            return { linePath: null, areaPath: null, points: [], maxValue: 0, minValue: 0 };
        }

        const max = Math.max(...data) * 1.1 || 1;
        const min = Math.min(...data) * 0.9;
        const range = max - min || 1;

        // Calculate point positions
        const pts = data.map((value, index) => ({
            x: padding.left + (index / (data.length - 1)) * effectiveWidth,
            y: padding.top + (1 - (value - min) / range) * effectiveHeight,
            value,
        }));

        // Create smooth Bezier path
        const line = Skia.Path.Make();
        line.moveTo(pts[0].x, pts[0].y);

        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];

            // Smooth Bezier control points
            const cp1x = prev.x + (curr.x - prev.x) * 0.5;
            const cp1y = prev.y;
            const cp2x = prev.x + (curr.x - prev.x) * 0.5;
            const cp2y = curr.y;

            line.cubicTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
        }

        // Create area path (for glass fill)
        const area = line.copy();
        const lastPt = pts[pts.length - 1];
        area.lineTo(lastPt.x, chartHeight);
        area.lineTo(pts[0].x, chartHeight);
        area.close();

        return { linePath: line, areaPath: area, points: pts, maxValue: max, minValue: min };
    }, [data, effectiveWidth, effectiveHeight, chartHeight, padding]);

    // Horizontal marker values
    const markers = useMemo(() => {
        if (maxValue === 0) return [];
        const mid = (maxValue + minValue) / 2;
        return [
            { value: maxValue, y: padding.top },
            { value: mid, y: padding.top + effectiveHeight / 2 },
            { value: minValue, y: padding.top + effectiveHeight },
        ];
    }, [maxValue, minValue, effectiveHeight, padding]);

    if (!linePath || data.length < 2) {
        return (
            <Animated.View entering={FadeInUp.duration(500)} style={[styles.chartCard, { height }]}>
                <BlurView intensity={60} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
                <View style={styles.chartOverlay} />
                <View style={styles.chartBorder} />
                <Text style={styles.chartTitle}>{title}</Text>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>אין מספיק נתונים להצגה</Text>
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={[styles.chartCard, { height }]}>
            {/* Frosted Glass Background */}
            <BlurView intensity={70} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
            <View style={styles.chartOverlay} />
            <View style={styles.chartBorder} />
            <View style={styles.chartTopEdge} />

            {/* Title */}
            <Text style={styles.chartTitle}>{title}</Text>

            {/* Chart Canvas */}
            <Canvas style={{ width: chartWidth, height: chartHeight }}>
                {/* Faint horizontal markers */}
                {markers.map((marker, i) => (
                    <Path
                        key={i}
                        path={Skia.Path.Make().moveTo(padding.left, marker.y).lineTo(chartWidth - padding.right, marker.y)}
                        style="stroke"
                        strokeWidth={0.5}
                        color="rgba(156, 163, 175, 0.2)"
                    />
                ))}

                {/* Glass fill under curve */}
                <Group opacity={0.25}>
                    <Path path={areaPath!}>
                        <LinearGradient
                            start={vec(0, padding.top)}
                            end={vec(0, chartHeight)}
                            colors={[`${gradientColors[0]}40`, 'transparent']}
                        />
                    </Path>
                </Group>

                {/* Gradient stroke line */}
                <Path
                    path={linePath}
                    style="stroke"
                    strokeWidth={3}
                    strokeCap="round"
                    strokeJoin="round"
                >
                    <LinearGradient
                        start={vec(padding.left, 0)}
                        end={vec(chartWidth - padding.right, 0)}
                        colors={gradientColors}
                    />
                </Path>

                {/* Data points - only show last point with glow */}
                {points.map((point, index) => {
                    const isLast = index === points.length - 1;

                    if (!isLast) {
                        // Small dots for non-active points
                        return (
                            <Circle
                                key={index}
                                cx={point.x}
                                cy={point.y}
                                r={2.5}
                                color="white"
                            />
                        );
                    }

                    // Active point with glow
                    return (
                        <Group key={index}>
                            {/* Outer glow */}
                            <Circle
                                cx={point.x}
                                cy={point.y}
                                r={12}
                                color={gradientColors[1]}
                                opacity={0.2}
                            >
                                <Shadow dx={0} dy={0} blur={8} color={gradientColors[1]} />
                            </Circle>
                            {/* Middle ring */}
                            <Circle
                                cx={point.x}
                                cy={point.y}
                                r={6}
                                color={gradientColors[1]}
                                opacity={0.4}
                            />
                            {/* Inner dot */}
                            <Circle
                                cx={point.x}
                                cy={point.y}
                                r={4}
                                color="white"
                            />
                        </Group>
                    );
                })}
            </Canvas>

            {/* Labels */}
            {showLabels && labels.length > 0 && (
                <View style={styles.labelsContainer}>
                    {labels.map((label, index) => {
                        // Show fewer labels if too many
                        const showEveryN = labels.length > 7 ? Math.ceil(labels.length / 5) : 1;
                        if (index % showEveryN !== 0 && index !== labels.length - 1) return null;

                        return (
                            <Text key={index} style={styles.labelText}>{label}</Text>
                        );
                    })}
                </View>
            )}

            {/* Value markers on right */}
            <View style={styles.valueMarkers}>
                {markers.slice(0, 2).map((marker, i) => (
                    <Text key={i} style={styles.markerText}>
                        {typeof marker.value === 'number' ? marker.value.toFixed(1) : marker.value}
                    </Text>
                ))}
            </View>
        </Animated.View>
    );
};

// =====================================================
// LIQUID GLASS BAR CHART
// Premium bars with rounded tops and gradient fill
// =====================================================

interface LiquidGlassBarChartProps {
    data: number[];
    labels: string[];
    title: string;
    color?: string;
    height?: number;
}

const LiquidGlassBarChart: React.FC<LiquidGlassBarChartProps> = ({
    data,
    labels,
    title,
    color = '#818CF8',
    height = 200,
}) => {
    const chartWidth = SCREEN_WIDTH - 64;
    const chartHeight = height - 60;
    const padding = { top: 10, bottom: 10, left: 15, right: 15 };
    const effectiveWidth = chartWidth - padding.left - padding.right;
    const effectiveHeight = chartHeight - padding.top - padding.bottom;

    const barWidth = (effectiveWidth / data.length) * 0.6;
    const barGap = (effectiveWidth / data.length) * 0.4;

    const animatedHeights = data.map(() => useSharedValue(0));

    useEffect(() => {
        data.forEach((_, index) => {
            animatedHeights[index].value = 0;
            animatedHeights[index].value = withSpring(1, {
                damping: 15,
                stiffness: 100,
                mass: 0.8,
            });
        });
    }, [data]);

    const { bars, maxValue } = useMemo(() => {
        const max = Math.max(...data) * 1.1 || 1;

        const barData = data.map((value, index) => {
            const barHeight = (value / max) * effectiveHeight;
            const x = padding.left + index * (barWidth + barGap) + barGap / 2;
            const y = chartHeight - padding.bottom - barHeight;

            return { x, y, width: barWidth, height: barHeight, value };
        });

        return { bars: barData, maxValue: max };
    }, [data, effectiveWidth, effectiveHeight, barWidth, barGap, chartHeight, padding]);

    if (data.length === 0) {
        return (
            <Animated.View entering={FadeInUp.duration(500)} style={[styles.chartCard, { height }]}>
                <BlurView intensity={60} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
                <View style={styles.chartOverlay} />
                <Text style={styles.chartTitle}>{title}</Text>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>אין נתונים להצגה</Text>
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={[styles.chartCard, { height }]}>
            <BlurView intensity={70} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
            <View style={styles.chartOverlay} />
            <View style={styles.chartBorder} />
            <View style={styles.chartTopEdge} />

            <Text style={styles.chartTitle}>{title}</Text>

            <Canvas style={{ width: chartWidth, height: chartHeight }}>
                {/* Faint baseline */}
                <Path
                    path={Skia.Path.Make()
                        .moveTo(padding.left, chartHeight - padding.bottom)
                        .lineTo(chartWidth - padding.right, chartHeight - padding.bottom)}
                    style="stroke"
                    strokeWidth={0.5}
                    color="rgba(156, 163, 175, 0.3)"
                />

                {/* Bars with rounded tops */}
                {bars.map((bar, index) => {
                    // Create rounded rect path
                    const radius = Math.min(barWidth / 2, 8);
                    const rect = Skia.RRectXY(
                        Skia.XYWHRect(bar.x, bar.y, bar.width, bar.height),
                        radius,
                        radius
                    );

                    return (
                        <Group key={index}>
                            {/* Bar fill with gradient */}
                            <Path path={Skia.Path.Make().addRRect(rect)}>
                                <LinearGradient
                                    start={vec(bar.x, bar.y)}
                                    end={vec(bar.x, bar.y + bar.height)}
                                    colors={[color, `${color}80`]}
                                />
                            </Path>

                            {/* Value label on top */}
                            {bar.value > 0 && (
                                <Circle
                                    cx={bar.x + bar.width / 2}
                                    cy={bar.y - 8}
                                    r={0}
                                    color="transparent"
                                />
                            )}
                        </Group>
                    );
                })}
            </Canvas>

            {/* Labels */}
            <View style={styles.labelsContainer}>
                {labels.map((label, index) => {
                    const showEveryN = labels.length > 7 ? Math.ceil(labels.length / 5) : 1;
                    if (index % showEveryN !== 0 && index !== labels.length - 1) return null;

                    return (
                        <Text key={index} style={styles.labelText}>{label}</Text>
                    );
                })}
            </View>

            {/* Value labels on bars */}
            <View style={styles.barValuesContainer}>
                {bars.map((bar, index) => (
                    <View
                        key={index}
                        style={[
                            styles.barValueLabel,
                            {
                                left: bar.x,
                                width: bar.width,
                                bottom: bar.height + 20,
                            }
                        ]}
                    >
                        <Text style={styles.barValueText}>
                            {bar.value > 0 ? Math.round(bar.value) : ''}
                        </Text>
                    </View>
                ))}
            </View>
        </Animated.View>
    );
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
    chartCard: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        paddingTop: 16,
        paddingBottom: 8,
    },
    chartOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
    },
    chartBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
    },
    chartTopEdge: {
        position: 'absolute',
        top: 0,
        left: 12,
        right: 12,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    chartTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1C1C1E',
        textAlign: 'right',
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    labelsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 4,
    },
    labelText: {
        fontSize: 10,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    valueMarkers: {
        position: 'absolute',
        right: 8,
        top: 45,
        height: 100,
        justifyContent: 'space-between',
    },
    markerText: {
        fontSize: 9,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    barValuesContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 30,
    },
    barValueLabel: {
        position: 'absolute',
        alignItems: 'center',
    },
    barValueText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B7280',
    },
});

export { LiquidGlassLineChart, LiquidGlassBarChart };
