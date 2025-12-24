import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Canvas, RoundedRect, LinearGradient, vec, Shadow } from '@shopify/react-native-skia';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
    blurIntensity?: number;
    borderRadius?: number;
    disabled?: boolean;
    magnetic?: boolean; // Enable magnetic press effect
}

/**
 * Premium Frosted Glass Card
 * High-blur glass effect with subtle borders and inner glow
 * Magnetic press feel with haptic feedback
 */
const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    onPress,
    blurIntensity = 60,
    borderRadius = 24,
    disabled = false,
    magnetic = true,
}) => {
    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);

    const handlePressIn = useCallback(() => {
        if (disabled) return;

        if (magnetic) {
            scale.value = withSpring(0.97, {
                damping: 15,
                stiffness: 400,
            });
            pressed.value = withTiming(1, { duration: 100 });

            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }
    }, [disabled, magnetic, scale, pressed]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, {
            damping: 15,
            stiffness: 300,
        });
        pressed.value = withTiming(0, { duration: 200 });
    }, [scale, pressed]);

    const animatedStyle = useAnimatedStyle(() => {
        const shadowOpacity = interpolate(
            pressed.value,
            [0, 1],
            [0.08, 0.15],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ scale: scale.value }],
            shadowOpacity,
        };
    });

    const content = (
        <View style={[styles.cardContainer, { borderRadius }, style]}>
            {/* Blur Background */}
            <BlurView
                intensity={blurIntensity}
                tint="systemUltraThinMaterialLight"
                style={[StyleSheet.absoluteFill, { borderRadius }]}
            />

            {/* Frosted overlay with transparency */}
            <View style={[styles.frostedOverlay, { borderRadius }]} />

            {/* Glass edge highlight - top */}
            <View style={[styles.topEdge, {
                borderTopLeftRadius: borderRadius,
                borderTopRightRadius: borderRadius
            }]} />

            {/* Glass border */}
            <View style={[styles.glassBorder, { borderRadius }]} />

            {/* Inner glow */}
            <View style={[styles.innerGlow, { borderRadius }]} />

            {/* Content */}
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );

    if (onPress) {
        return (
            <AnimatedTouchable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                disabled={disabled}
                style={[styles.touchable, animatedStyle]}
            >
                {content}
            </AnimatedTouchable>
        );
    }

    return (
        <Animated.View style={[styles.touchable, animatedStyle]}>
            {content}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    touchable: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    cardContainer: {
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    frostedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
    },
    topEdge: {
        position: 'absolute',
        top: 0,
        left: 8,
        right: 8,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    glassBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    innerGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    content: {
        position: 'relative',
        zIndex: 10,
    },
});

export default GlassCard;
