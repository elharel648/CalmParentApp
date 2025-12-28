import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_WIDTH = SCREEN_WIDTH - 32; // 16px padding on each side
const TAB_BAR_HEIGHT = 72;

interface LiquidGlassTabBarProps {
    isDarkMode: boolean;
    activeTabIndex: number;
    tabCount: number;
}

/**
 * Apple Liquid Glass Tab Bar
 * Dynamic bubble effect that follows the active tab with perfect Apple-style physics
 */
export default function LiquidGlassTabBar({ isDarkMode, activeTabIndex, tabCount }: LiquidGlassTabBarProps) {
    // Calculate tab positions (tabs evenly spaced)
    const tabWidth = TAB_BAR_WIDTH / tabCount;

    // Liquid glass distortion position - follows active tab with perfect spring physics
    const distortionX = useSharedValue(TAB_BAR_WIDTH / 2);
    const distortionIntensity = useSharedValue(0);

    // Update distortion position when active tab changes
    useEffect(() => {
        if (tabCount > 0 && tabWidth > 0 && activeTabIndex >= 0) {
            const targetX = (activeTabIndex + 0.5) * tabWidth;
            if (targetX >= 0 && targetX <= TAB_BAR_WIDTH) {
                // Smooth spring animation - Apple's perfect feel
                distortionX.value = withSpring(targetX, {
                    damping: 25,
                    stiffness: 400,
                    mass: 0.5,
                });

                // Subtle intensity pulse on tab change
                distortionIntensity.value = withTiming(1, { duration: 150 }, () => {
                    distortionIntensity.value = withTiming(0.3, { duration: 300 });
                });
            }
        }
    }, [activeTabIndex, tabCount, tabWidth]);

    // Liquid glass distortion style - only animated values
    const distortionStyle = useAnimatedStyle(() => {
        const intensity = interpolate(
            distortionIntensity.value,
            [0, 1],
            [0, 1],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ translateX: distortionX.value - 50 }],
            opacity: intensity * 0.15,
        };
    });

    return (
        <Animated.View style={styles.container}>
            {/* Base Liquid Glass Layers - Perfect Glass like Settings Screen */}
            <View style={[StyleSheet.absoluteFill, { borderRadius: 32, overflow: 'visible' }]}>

                {/* Primary blur layer - Perfect glass effect */}
                <Animated.View style={StyleSheet.absoluteFill}>
                    <BlurView
                        intensity={isDarkMode ? 85 : 75}
                        tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                {/* Glass overlay - Perfect transparency like Settings */}
                <View style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: isDarkMode
                        ? 'rgba(28, 28, 30, 0.7)'
                        : 'rgba(255, 255, 255, 0.7)',
                }} />

                {/* Liquid Glass Distortion - Apple's subtle blur enhancement (almost invisible) */}
                <Animated.View style={[{
                    position: 'absolute',
                    left: 0,
                    top: TAB_BAR_HEIGHT / 2 - 50,
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                }, distortionStyle]} pointerEvents="none">
                    <BlurView
                        intensity={isDarkMode ? 95 : 85}
                        tint={isDarkMode ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                {/* Subtle top edge highlight - Perfect glass reflection */}
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 20,
                    right: 20,
                    height: StyleSheet.hairlineWidth,
                    backgroundColor: isDarkMode
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(255, 255, 255, 0.8)',
                }} />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 32,
        overflow: 'visible',
        // Perfect glass shadow - like Settings screen
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
});

