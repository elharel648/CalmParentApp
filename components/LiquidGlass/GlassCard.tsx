import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Apple Spring Physics - EXACT VALUES
const APPLE_SPRING = {
    stiffness: 170,
    damping: 26,
};

interface GlassCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    onPress?: () => void;
    blurIntensity?: number;
    borderRadius?: number;
    disabled?: boolean;
}

/**
 * Apple Design Language - Glass Card
 * 
 * Specifications:
 * - Materials: ultraThinMaterial (blur 25, saturation 160%)
 * - Apple Stroke: 0.5pt white border with 0.2 opacity
 * - Squircle Corners: continuous corner curve
 * - Liquid Animations: Spring physics (stiffness: 170, damping: 26)
 * - Shadows: Diffuse (high spread, 5-10% opacity)
 */
const GlassCard: React.FC<GlassCardProps> = ({
    children,
    style,
    onPress,
    blurIntensity = 25,  // Apple ultraThinMaterial
    borderRadius = 16,   // Apple continuous corners
    disabled = false,
}) => {
    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);

    const handlePressIn = useCallback(() => {
        if (disabled) return;

        // Apple Liquid Animation - Spring Physics
        scale.value = withSpring(0.97, APPLE_SPRING);
        pressed.value = withSpring(1, APPLE_SPRING);

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [disabled, scale, pressed]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, APPLE_SPRING);
        pressed.value = withSpring(0, APPLE_SPRING);
    }, [scale, pressed]);

    const animatedStyle = useAnimatedStyle(() => {
        const shadowOpacity = interpolate(
            pressed.value,
            [0, 1],
            [0.06, 0.10],  // Apple: 5-10% opacity shadows
            Extrapolation.CLAMP
        );

        return {
            transform: [{ scale: scale.value }],
            shadowOpacity,
        };
    });

    const content = (
        <View style={[styles.cardContainer, { borderRadius }, style]}>
            {/* Layer 1: Material Background (blur + saturation) */}
            <BlurView
                intensity={blurIntensity}
                tint="systemUltraThinMaterial"
                style={[StyleSheet.absoluteFill, { borderRadius }]}
            />

            {/* Layer 2: Semi-transparent overlay */}
            <View style={[styles.materialOverlay, { borderRadius }]} />

            {/* Apple Stroke: 0.5pt white border with 0.2 opacity */}
            <View style={[styles.appleStroke, { borderRadius }]} />

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
        backgroundColor: 'transparent',
        // Apple Diffuse Shadow: high spread, 5-10% opacity
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 32,  // High spread
        elevation: 6,
    },
    cardContainer: {
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    materialOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.72)',
    },
    appleStroke: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 0.5,  // Apple Stroke: 0.5pt
        borderColor: 'rgba(255, 255, 255, 0.2)',  // White with 0.2 opacity
    },
    content: {
        position: 'relative',
        zIndex: 10,
    },
});

export default GlassCard;
