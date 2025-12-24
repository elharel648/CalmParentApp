import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import {
    Canvas,
    Path,
    Skia,
    LinearGradient,
    vec,
    RoundedRect,
    Group,
    Line,
    Circle,
    Shadow,
    BlurMask,
} from '@shopify/react-native-skia';
import { BlurView } from 'expo-blur';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    FadeInUp,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =====================================================
// PIXEL-PERFECT GLASS BAR CHART v2.0
// Unified Cell Coordinate System for perfect alignment
// =====================================================

interface GlassBarChartProps {
    data: number[];
    labels: string[];
    title: string;
    unit?: string;
    gradientColors?: [string, string];
    height?: number;
    maxValue?: number;
    yAxisSteps?: number[];
}

const GlassBarChartPerfect: React.FC<GlassBarChartProps> = ({
    data,
    labels,
    title,
    unit = '',
    gradientColors = ['#818CF8', '#818CF820'],
    height = 260,
    maxValue: propMaxValue,
    yAxisSteps,
}) => {
    // ==================== LAYOUT MATH ====================
    const chartWidth = SCREEN_WIDTH - 64;
    const padding = { top: 20, bottom: 50, left: 45, right: 15 };
    const chartAreaWidth = chartWidth - padding.left - padding.right;
    const chartAreaHeight = height - padding.top - padding.bottom - 20; // Extra for title

    // UNIFIED CELL SYSTEM: Each data point gets equal-width cell
    const cellCount = data.length;
    const cellWidth = chartAreaWidth / cellCount;
    const barWidth = Math.min(cellWidth * 0.6, 28); // Bar takes 60% of cell, max 28px

    // ==================== STATE ====================
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [lastHapticIndex, setLastHapticIndex] = useState<number | null>(null);
    const touchActive = useSharedValue(0);
    const touchX = useSharedValue(0);

    // ==================== CALCULATIONS ====================
    const { maxValue, ySteps, average } = useMemo(() => {
        const dataMax = Math.max(...data) || 1;
        const avg = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;

        let max = propMaxValue || Math.ceil(dataMax * 1.2);

        // Round to nice numbers
        if (max <= 8) max = 8;
        else if (max <= 12) max = 12;
        else if (max <= 16) max = 16;
        else if (max <= 24) max = 24;
        else max = Math.ceil(max / 10) * 10;

        const steps = yAxisSteps || (() => {
            if (max <= 8) return [0, 2, 4, 6, 8];
            if (max <= 12) return [0, 4, 8, 12];
            if (max <= 16) return [0, 4, 8, 12, 16];
            if (max <= 24) return [0, 6, 12, 18, 24];
            return [0, max / 4, max / 2, (max * 3) / 4, max];
        })();

        return { maxValue: max, ySteps: steps, average: avg };
    }, [data, propMaxValue, yAxisSteps]);

    // ==================== CELL GEOMETRY ====================
    // Each cell contains: bar (centered) + label (below)
    const cells = useMemo(() => {
        return data.map((value, index) => {
            // Cell boundaries
            const cellX = padding.left + index * cellWidth;
            const cellCenterX = cellX + cellWidth / 2;

            // Bar geometry (centered in cell)
            const barHeight = (value / maxValue) * chartAreaHeight;
            const barX = cellCenterX - barWidth / 2;
            const barY = padding.top + chartAreaHeight - barHeight;

            return {
                index,
                value,
                label: labels[index] || '',
                // Cell
                cellX,
                cellCenterX,
                cellWidth,
                // Bar
                barX,
                barY,
                barWidth,
                barHeight,
                hasValue: value > 0,
            };
        });
    }, [data, labels, cellWidth, barWidth, maxValue, chartAreaHeight, padding]);

    // Average line Y position
    const avgLineY = padding.top + chartAreaHeight - (average / maxValue) * chartAreaHeight;

    // ==================== TOUCH HANDLING ====================
    const triggerHaptic = useCallback((index: number) => {
        if (index !== lastHapticIndex && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setLastHapticIndex(index);
        }
    }, [lastHapticIndex]);

    const handleTouch = useCallback((x: number) => {
        // Find which cell the touch is in
        const relativeX = x - padding.left;
        const cellIndex = Math.floor(relativeX / cellWidth);

        if (cellIndex >= 0 && cellIndex < cells.length) {
            setSelectedIndex(cellIndex);
            touchX.value = x;
            triggerHaptic(cellIndex);
        }
    }, [cells, cellWidth, padding.left, triggerHaptic, touchX]);

    const handleTouchEnd = useCallback(() => {
        setSelectedIndex(null);
        setLastHapticIndex(null);
        touchActive.value = withTiming(0, { duration: 200 });
    }, [touchActive]);

    const gesture = Gesture.Pan()
        .onStart((e) => {
            touchActive.value = withTiming(1, { duration: 100 });
            runOnJS(handleTouch)(e.x);
        })
        .onUpdate((e) => {
            runOnJS(handleTouch)(e.x);
        })
        .onEnd(() => {
            runOnJS(handleTouchEnd)();
        });

    const tapGesture = Gesture.Tap()
        .onStart((e) => {
            touchActive.value = withTiming(1, { duration: 100 });
            runOnJS(handleTouch)(e.x);
        })
        .onEnd(() => {
            // Keep selected for a moment
            setTimeout(() => {
                runOnJS(handleTouchEnd)();
            }, 1500);
        });

    const composedGesture = Gesture.Race(gesture, tapGesture);

    // ==================== ANIMATION STYLES ====================
    const tooltipStyle = useAnimatedStyle(() => {
        'worklet';
        return {
            opacity: touchActive.value,
            transform: [
                { scale: interpolate(touchActive.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) },
                { translateY: interpolate(touchActive.value, [0, 1], [8, 0], Extrapolation.CLAMP) },
            ],
        };
    }, []);

    // ==================== RENDER ====================
    if (data.length === 0) {
        return (
            <Animated.View entering={FadeInUp.duration(500)} style={[styles.container, { height }]}>
                <BlurView intensity={60} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
                <View style={styles.overlay} />
                <View style={styles.border} />
                <Text style={styles.title}>{title}</Text>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>אין נתונים להצגה</Text>
                </View>
            </Animated.View>
        );
    }

    const canvasHeight = chartAreaHeight + padding.top + 10;

    // Show ALL labels for up to 8 days (typical weekly view)
    // Only reduce for very long ranges
    const labelInterval = cells.length > 14 ? 3 : cells.length > 10 ? 2 : 1;

    return (
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={[styles.container, { height }]}>
            {/* Frosted Glass Background */}
            <BlurView intensity={70} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
            <View style={styles.overlay} />
            <View style={styles.border} />
            <View style={styles.topEdge} />

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Chart */}
            <GestureHandlerRootView style={{ flex: 1 }}>
                <GestureDetector gesture={composedGesture}>
                    <View style={{ flex: 1 }}>
                        <Canvas style={{ width: chartWidth, height: canvasHeight }}>
                            {/* ===== GRID LINES ===== */}

                            {/* Horizontal grid lines */}
                            {ySteps.map((step, i) => {
                                const y = padding.top + chartAreaHeight - (step / maxValue) * chartAreaHeight;
                                return (
                                    <Line
                                        key={`h-${i}`}
                                        p1={vec(padding.left, y)}
                                        p2={vec(chartWidth - padding.right, y)}
                                        color="rgba(156, 163, 175, 0.12)"
                                        strokeWidth={1}
                                    />
                                );
                            })}

                            {/* Vertical ghost lines (very faint, one per cell center) */}
                            {cells.map((cell, i) => (
                                <Line
                                    key={`v-${i}`}
                                    p1={vec(cell.cellCenterX, padding.top)}
                                    p2={vec(cell.cellCenterX, padding.top + chartAreaHeight)}
                                    color="rgba(156, 163, 175, 0.05)"
                                    strokeWidth={1}
                                />
                            ))}

                            {/* ===== AVERAGE LINE ===== */}
                            <Path
                                path={(() => {
                                    const path = Skia.Path.Make();
                                    const dashLen = 5;
                                    const gapLen = 4;
                                    let x = padding.left;
                                    while (x < chartWidth - padding.right) {
                                        path.moveTo(x, avgLineY);
                                        path.lineTo(Math.min(x + dashLen, chartWidth - padding.right), avgLineY);
                                        x += dashLen + gapLen;
                                    }
                                    return path;
                                })()}
                                style="stroke"
                                strokeWidth={1.5}
                                color="rgba(99, 102, 241, 0.4)"
                            />

                            {/* ===== BARS ===== */}
                            {cells.map((cell, index) => {
                                if (!cell.hasValue) return null;

                                const isSelected = selectedIndex === index;
                                const isRecent = index === cells.length - 1 && selectedIndex === null;
                                const isDimmed = selectedIndex !== null && !isSelected;
                                const cornerRadius = Math.min(barWidth / 2, 10);

                                // Height boost for selected bar
                                const heightBoost = isSelected ? 4 : 0;
                                const adjustedY = cell.barY - heightBoost;
                                const adjustedHeight = cell.barHeight + heightBoost;

                                return (
                                    <Group key={index} opacity={isDimmed ? 0.4 : 1}>
                                        {/* Selection glow (outer) */}
                                        {(isSelected || isRecent) && (
                                            <RoundedRect
                                                x={cell.barX - 4}
                                                y={adjustedY - 4}
                                                width={cell.barWidth + 8}
                                                height={adjustedHeight + 8}
                                                r={cornerRadius + 4}
                                                color={gradientColors[0]}
                                                opacity={0.2}
                                            >
                                                <BlurMask blur={8} style="normal" />
                                            </RoundedRect>
                                        )}

                                        {/* Bar fill with gradient */}
                                        <RoundedRect
                                            x={cell.barX}
                                            y={adjustedY}
                                            width={cell.barWidth}
                                            height={adjustedHeight}
                                            r={cornerRadius}
                                        >
                                            <LinearGradient
                                                start={vec(cell.barX, adjustedY)}
                                                end={vec(cell.barX, adjustedY + adjustedHeight)}
                                                colors={[
                                                    isSelected ? gradientColors[0] : `${gradientColors[0]}E6`,
                                                    `${gradientColors[0]}08`, // 5% opacity at bottom
                                                ]}
                                            />
                                        </RoundedRect>

                                        {/* Subtle border */}
                                        <RoundedRect
                                            x={cell.barX}
                                            y={adjustedY}
                                            width={cell.barWidth}
                                            height={adjustedHeight}
                                            r={cornerRadius}
                                            style="stroke"
                                            strokeWidth={1}
                                            color={`${gradientColors[0]}25`}
                                        />

                                        {/* Top shine */}
                                        <Line
                                            p1={vec(cell.barX + cornerRadius, adjustedY + 1)}
                                            p2={vec(cell.barX + cell.barWidth - cornerRadius, adjustedY + 1)}
                                            color="rgba(255, 255, 255, 0.6)"
                                            strokeWidth={1}
                                        />
                                    </Group>
                                );
                            })}
                        </Canvas>

                        {/* ===== Y-AXIS LABELS ===== */}
                        <View style={[styles.yAxisLabels, { top: padding.top, height: chartAreaHeight }]}>
                            {ySteps.slice().reverse().map((step, i) => (
                                <Text key={i} style={styles.axisLabel}>{step}</Text>
                            ))}
                        </View>

                        {/* ===== X-AXIS LABELS ===== */}
                        {/* Wrapper has SAME width as Canvas to ensure coordinate alignment */}
                        <View style={[styles.xAxisContainer, { width: chartWidth }]}>
                            {cells.map((cell, index) => {
                                const showLabel = index % labelInterval === 0 || index === cells.length - 1;
                                if (!showLabel) return null;

                                // Calculate label position relative to left edge of container
                                // cellCenterX already includes padding.left offset
                                const labelLeft = cell.cellCenterX - 18; // half of label width (36)

                                return (
                                    <Text
                                        key={index}
                                        style={[
                                            styles.xAxisLabel,
                                            {
                                                left: labelLeft,
                                                width: 36,
                                            },
                                            selectedIndex === index && styles.axisLabelActive,
                                        ]}
                                    >
                                        {cell.label}
                                    </Text>
                                );
                            })}
                        </View>

                        {/* ===== AVERAGE LABEL ===== */}
                        <View style={[styles.avgLabel, { top: avgLineY + padding.top - 22, right: padding.right + 5 }]}>
                            <Text style={styles.avgLabelText}>
                                ממוצע: {average.toFixed(1)}{unit}
                            </Text>
                        </View>

                        {/* ===== TOOLTIP ===== */}
                        {selectedIndex !== null && cells[selectedIndex] && (
                            <Animated.View
                                style={[
                                    styles.tooltip,
                                    tooltipStyle,
                                    {
                                        left: cells[selectedIndex].cellCenterX - 50,
                                        top: cells[selectedIndex].barY - 75,
                                    },
                                ]}
                            >
                                <BlurView intensity={90} tint="systemUltraThinMaterialLight" style={StyleSheet.absoluteFill} />
                                <View style={styles.tooltipOverlay} />
                                <View style={styles.tooltipBorder} />
                                <View style={styles.tooltipContent}>
                                    <Text style={styles.tooltipValue}>
                                        {cells[selectedIndex].value.toFixed(1)}
                                    </Text>
                                    <Text style={styles.tooltipUnit}>{unit}</Text>
                                    <Text style={styles.tooltipDate}>
                                        {cells[selectedIndex].label}
                                    </Text>
                                </View>
                                {/* Arrow */}
                                <View style={styles.tooltipArrow} />
                            </Animated.View>
                        )}
                    </View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Animated.View>
    );
};

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 24,
        overflow: 'hidden',
        paddingTop: 16,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
    },
    border: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 24,
    },
    topEdge: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1C1C1E',
        textAlign: 'right',
        paddingHorizontal: 20,
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

    // Y-Axis
    yAxisLabels: {
        position: 'absolute',
        left: 8,
        width: 32,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    axisLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: '#9CA3AF',
    },
    axisLabelActive: {
        color: '#6366F1',
        fontWeight: '600',
    },

    // X-Axis (absolute positioning for perfect alignment)
    xAxisContainer: {
        position: 'relative',
        height: 20,
        marginTop: 6,
    },
    xAxisLabel: {
        position: 'absolute',
        fontSize: 10,
        fontWeight: '500',
        color: '#9CA3AF',
        textAlign: 'center',
    },

    // Average
    avgLabel: {
        position: 'absolute',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    avgLabelText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6366F1',
    },

    // Tooltip
    tooltip: {
        position: 'absolute',
        width: 100,
        borderRadius: 16,
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    tooltipOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    tooltipBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderRadius: 16,
    },
    tooltipContent: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        zIndex: 10,
    },
    tooltipValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1C1C1E',
    },
    tooltipUnit: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        marginTop: -2,
    },
    tooltipDate: {
        fontSize: 11,
        fontWeight: '500',
        color: '#9CA3AF',
        marginTop: 4,
    },
    tooltipArrow: {
        position: 'absolute',
        bottom: -8,
        left: '50%',
        marginLeft: -8,
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'rgba(255, 255, 255, 0.8)',
    },
});

export default GlassBarChartPerfect;
