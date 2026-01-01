import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useScrollTracking } from '../context/ScrollTrackingContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARALLAX_MULTIPLIER = -0.2; // Subtle parallax depth
const BACKGROUND_SIZE_MULTIPLIER = 1.5; // Make background larger to prevent edges showing

interface LiquidGlassTabBarProps {
    isDarkMode?: boolean;
}

/**
 * High-End Apple-Style Liquid Glass Effect with Motion-Reactive Parallax
 * 
 * Multi-Layered Composition:
 * - Layer 1 (Front - Static Glass): Blur, saturation, border, icons
 * - Layer 2 (Back - Parallax Source): Vibrant gradient that moves with scroll/gesture
 * 
 * Motion-Driven Parallax:
 * - Background layer moves opposite to scroll direction
 * - Responds to horizontal gestures on tab bar
 * - Subtle depth effect, not dizzying
 */
export default function LiquidGlassTabBar({ isDarkMode = false }: LiquidGlassTabBarProps) {
    const { scrollY, scrollX, gestureX, gestureY } = useScrollTracking();
    const localGestureX = useSharedValue(0);
    const localGestureY = useSharedValue(0);

    // Pan gesture for horizontal movement on tab bar
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            localGestureX.value = event.translationX;
            localGestureY.value = event.translationY;
            // Update global gesture values
            gestureX.value = event.translationX;
            gestureY.value = event.translationY;
        })
        .onEnd(() => {
            // Spring back to center
            localGestureX.value = withSpring(0, { damping: 15, stiffness: 150 });
            localGestureY.value = withSpring(0, { damping: 15, stiffness: 150 });
            gestureX.value = withSpring(0, { damping: 15, stiffness: 150 });
            gestureY.value = withSpring(0, { damping: 15, stiffness: 150 });
        });

    // Animated style for parallax background layer
    const parallaxBackgroundStyle = useAnimatedStyle(() => {
        // Combine scroll and gesture movements
        const scrollOffsetY = interpolate(
            scrollY.value,
            [0, SCREEN_HEIGHT],
            [0, SCREEN_HEIGHT * PARALLAX_MULTIPLIER],
            Extrapolation.CLAMP
        );
        const scrollOffsetX = interpolate(
            scrollX.value,
            [-SCREEN_WIDTH, SCREEN_WIDTH],
            [-SCREEN_WIDTH * PARALLAX_MULTIPLIER, SCREEN_WIDTH * PARALLAX_MULTIPLIER],
            Extrapolation.CLAMP
        );

        // Gesture offsets (more responsive, less damped)
        const gestureOffsetX = localGestureX.value * -0.3;
        const gestureOffsetY = localGestureY.value * -0.3;

        return {
            transform: [
                { translateX: scrollOffsetX + gestureOffsetX },
                { translateY: scrollOffsetY + gestureOffsetY },
            ] as any,
        };
    });

    // Almost invisible parallax background - 90% transparent, just a faint hint
    // Color comes from blur of content behind, not from the bar itself
    const gradientColors: [string, string, ...string[]] = [
        'rgba(255, 255, 255, 0.05)', // 90% transparent white
        'rgba(255, 255, 255, 0.03)', // Even more transparent
        'rgba(255, 255, 255, 0.05)', // Back to slightly more visible
    ];

    return (
        <GestureDetector gesture={panGesture}>
            <View style={styles.container}>
                {/* LAYER 2 (BACK) - Parallax Background Source */}
                {/* Almost invisible - just a faint hint that shifts with motion */}
                <Animated.View style={[styles.parallaxBackground, parallaxBackgroundStyle]}>
                    <ExpoLinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradientBackground}
                    />
                </Animated.View>

                {/* LAYER 1 (FRONT) - Static Glass Effect */}
                {/* This layer stays fixed, creating the "looking through glass" effect */}
                <View style={styles.glassLayer}>
                    {/* Max blur - 40px equivalent for milky frosted glass look */}
                    <BlurView
                        intensity={Platform.OS === 'ios' ? 40 : 35}
                        tint={isDarkMode ? 'dark' : 'extraLight'}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* 90% transparent overlay - color comes from blur, not from bar */}
                    <View style={[
                        styles.glassBackground,
                        {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)'
                        }
                    ]} />

                    {/* Magic edge border - light-catching Apple style */}
                    <Canvas style={styles.gradientBorderCanvas}>
                        <Rect x={0} y={0} width={SCREEN_WIDTH} height={0.5}>
                            <LinearGradient
                                start={vec(0, 0)}
                                end={vec(SCREEN_WIDTH, 0)}
                                colors={[
                                    'rgba(255, 255, 255, 0.4)', // Light-catching edge
                                    'rgba(255, 255, 255, 0.2)',
                                    'rgba(255, 255, 255, 0.1)',
                                    'transparent'
                                ]}
                            />
                        </Rect>
                    </Canvas>
                </View>
            </View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        overflow: 'hidden',
        borderTopLeftRadius: 24, // Continuous corner smoothing at top
        borderTopRightRadius: 24,
        // Very faint shadow - Apple style
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 30,
        shadowOpacity: 0.1,
        elevation: 0, // Remove Android elevation
    },
    // LAYER 2: Parallax Background (behind glass)
    parallaxBackground: {
        position: 'absolute',
        top: -SCREEN_HEIGHT * (BACKGROUND_SIZE_MULTIPLIER - 1) / 2,
        left: -SCREEN_WIDTH * (BACKGROUND_SIZE_MULTIPLIER - 1) / 2,
        width: SCREEN_WIDTH * BACKGROUND_SIZE_MULTIPLIER,
        height: SCREEN_HEIGHT * BACKGROUND_SIZE_MULTIPLIER,
    },
    gradientBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    // LAYER 1: Static Glass (front)
    glassLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    glassBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    gradientBorderCanvas: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 0.5,
    },
});