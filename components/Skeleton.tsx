import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

/**
 * Animated skeleton loader with shimmer effect
 */
export const Skeleton = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style
}: SkeletonProps) => {
    const shimmerAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

    useEffect(() => {
        const shimmer = Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: SCREEN_WIDTH,
                duration: 1200,
                useNativeDriver: true,
            })
        );
        shimmer.start();
        return () => shimmer.stop();
    }, []);

    return (
        <View
            style={[
                styles.skeleton,
                {
                    width: width as any,
                    height,
                    borderRadius
                },
                style
            ]}
        >
            <Animated.View
                style={[
                    styles.shimmer,
                    { transform: [{ translateX: shimmerAnim }] }
                ]}
            >
                <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                />
            </Animated.View>
        </View>
    );
};

/**
 * Timeline item skeleton
 */
export const TimelineSkeleton = () => (
    <View style={styles.timelineContainer}>
        {[1, 2, 3].map((i) => (
            <View key={i} style={styles.timelineItem}>
                <Skeleton width={48} height={48} borderRadius={24} />
                <View style={styles.timelineContent}>
                    <Skeleton width={120} height={16} />
                    <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
                </View>
                <Skeleton width={50} height={14} />
            </View>
        ))}
    </View>
);

/**
 * Stats card skeleton
 */
export const StatCardSkeleton = () => (
    <View style={styles.statCard}>
        <Skeleton width={40} height={40} borderRadius={12} />
        <Skeleton width={60} height={28} style={{ marginTop: 12 }} />
        <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
    </View>
);

/**
 * Chart skeleton
 */
export const ChartSkeleton = ({ height = 200 }: { height?: number }) => (
    <View style={[styles.chartContainer, { height }]}>
        <View style={styles.chartBars}>
            {[0.6, 0.8, 0.5, 0.9, 0.7, 0.4, 0.75].map((h, i) => (
                <Skeleton
                    key={i}
                    width={24}
                    height={height * h * 0.7}
                    borderRadius={12}
                />
            ))}
        </View>
        <Skeleton width="100%" height={1} style={{ marginTop: 16 }} />
        <View style={styles.chartLabels}>
            {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((_, i) => (
                <Skeleton key={i} width={20} height={10} />
            ))}
        </View>
    </View>
);

/**
 * Quick actions skeleton
 */
export const QuickActionsSkeleton = () => (
    <View style={styles.quickActionsContainer}>
        {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.quickAction}>
                <Skeleton width={56} height={56} borderRadius={16} />
                <Skeleton width={40} height={10} style={{ marginTop: 8 }} />
            </View>
        ))}
    </View>
);

/**
 * Header skeleton with banner
 */
export const HeaderSkeleton = () => (
    <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
            <Skeleton width={100} height={20} />
            <Skeleton width={40} height={40} borderRadius={20} />
        </View>
        <View style={styles.bannerSkeleton}>
            <Skeleton width="100%" height={80} borderRadius={16} />
        </View>
    </View>
);

/**
 * Full page loading skeleton
 */
export const PageSkeleton = () => (
    <View style={styles.pageContainer}>
        <HeaderSkeleton />
        <QuickActionsSkeleton />
        <View style={{ paddingHorizontal: 20 }}>
            <Skeleton width={100} height={18} style={{ marginBottom: 16 }} />
            <TimelineSkeleton />
        </View>
    </View>
);

/**
 * Reports page skeleton
 */
export const ReportsSkeleton = () => (
    <View style={styles.reportsContainer}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
            <StatCardSkeleton />
            <StatCardSkeleton />
        </View>
        <View style={styles.statsRow}>
            <StatCardSkeleton />
            <StatCardSkeleton />
        </View>

        {/* Chart */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Skeleton width={120} height={18} style={{ marginBottom: 16 }} />
            <ChartSkeleton height={200} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: SCREEN_WIDTH,
    },
    shimmerGradient: {
        flex: 1,
        width: 100,
    },

    // Timeline
    timelineContainer: {
        gap: 12,
    },
    timelineItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 16,
        gap: 12,
    },
    timelineContent: {
        flex: 1,
        alignItems: 'flex-end',
    },

    // Stats
    statCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 12,
    },

    // Chart
    chartContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 20,
        justifyContent: 'flex-end',
    },
    chartBars: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flex: 1,
        paddingHorizontal: 10,
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingHorizontal: 10,
    },

    // Quick Actions
    quickActionsContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginTop: 20,
    },
    quickAction: {
        alignItems: 'center',
    },

    // Header
    headerContainer: {
        padding: 20,
    },
    headerTop: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bannerSkeleton: {
        marginTop: 20,
    },

    // Page
    pageContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50,
    },

    // Reports
    reportsContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 20,
    },
});

export default {
    Skeleton,
    TimelineSkeleton,
    StatCardSkeleton,
    ChartSkeleton,
    QuickActionsSkeleton,
    HeaderSkeleton,
    PageSkeleton,
    ReportsSkeleton,
};
