import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface SkeletonLoaderProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

/**
 * Skeleton loading component with shimmer effect
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
}) => {
    const { isDarkMode } = useTheme();
    const shimmerAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [shimmerAnim]);

    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <View
            style={[
                styles.container,
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                },
                style,
            ]}
        >
            <Animated.View
                style={[
                    styles.shimmer,
                    {
                        opacity,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        position: 'relative',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    timelineContainer: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    timelineContent: {
        flex: 1,
    },
});

/**
 * Skeleton for timeline events
 */
export const TimelineSkeleton: React.FC = () => {
    const { theme } = useTheme();
    
    return (
        <View style={[styles.timelineContainer, { backgroundColor: theme.card }]}>
            {[1, 2, 3].map((i) => (
                <View key={i} style={styles.timelineItem}>
                    <SkeletonLoader width={48} height={48} borderRadius={24} />
                    <View style={[styles.timelineContent, { marginHorizontal: 12 }]}>
                        <SkeletonLoader width="60%" height={16} borderRadius={4} />
                        <SkeletonLoader width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
                    </View>
                    <SkeletonLoader width={50} height={14} borderRadius={4} />
                </View>
            ))}
        </View>
    );
};

