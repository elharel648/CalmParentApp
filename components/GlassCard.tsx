import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    blurIntensity?: number;
    animated?: boolean;
    borderRadius?: number;
}

const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    blurIntensity = 60,
    animated = true,
    borderRadius = 20,
}) => {
    const { isDarkMode } = useTheme();
    const progress = useSharedValue(0);

    useEffect(() => {
        if (animated) {
            progress.value = withRepeat(
                withTiming(1, {
                    duration: 4000,
                    easing: Easing.inOut(Easing.ease),
                }),
                -1,
                true
            );
        }
    }, [animated]);

    const animatedGradientStyle = useAnimatedStyle(() => {
        'worklet';
        const translateX = interpolate(progress.value, [0, 1], [-50, 50]);
        const translateY = interpolate(progress.value, [0, 1], [-30, 30]);
        return {
            transform: [
                { translateX: translateX },
                { translateY: translateY },
            ] as const,
        };
    });

    return (
        <View style={[styles.container, { borderRadius }, style]}>
            {/* Blur Background Layer */}
            {Platform.OS === 'ios' ? (
                <BlurView
                    intensity={blurIntensity}
                    tint={isDarkMode ? 'dark' : 'light'}
                    style={[StyleSheet.absoluteFill, { borderRadius }]}
                />
            ) : (
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: isDarkMode
                                ? 'rgba(30, 30, 30, 0.8)'
                                : 'rgba(255, 255, 255, 0.8)',
                            borderRadius,
                        },
                    ]}
                />
            )}

            {/* Animated Gradient Reflection - Skia */}
            {animated && (
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        { borderRadius, overflow: 'hidden', opacity: 0.4 },
                        animatedGradientStyle,
                    ]}
                >
                    <Canvas style={StyleSheet.absoluteFill}>
                        <Rect x={0} y={0} width={500} height={300}>
                            <LinearGradient
                                start={vec(0, 0)}
                                end={vec(400, 200)}
                                colors={
                                    isDarkMode
                                        ? ['transparent', 'rgba(255,255,255,0.08)', 'transparent']
                                        : ['transparent', 'rgba(255,255,255,0.5)', 'transparent']
                                }
                            />
                        </Rect>
                    </Canvas>
                </Animated.View>
            )}

            {/* Glass Border */}
            <View
                style={[
                    StyleSheet.absoluteFill,
                    {
                        borderRadius,
                        borderWidth: 1,
                        borderColor: isDarkMode
                            ? 'rgba(255, 255, 255, 0.15)'
                            : 'rgba(255, 255, 255, 0.6)',
                    },
                ]}
            />

            {/* Top Edge Highlight */}
            <View
                style={[
                    styles.topHighlight,
                    {
                        backgroundColor: isDarkMode
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(255, 255, 255, 0.8)',
                        borderTopLeftRadius: borderRadius,
                        borderTopRightRadius: borderRadius,
                    },
                ]}
            />

            {/* Content */}
            <View style={styles.content}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        position: 'relative',
    },
    content: {
        position: 'relative',
        zIndex: 1,
    },
    topHighlight: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
    },
});

export default GlassCard;
