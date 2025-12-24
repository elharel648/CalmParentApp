import React, { useCallback } from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface GlassButtonProps {
    title: string;
    onPress: () => void;
    style?: ViewStyle;
    textStyle?: TextStyle;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    icon?: React.ReactNode;
}

/**
 * Premium Glass Button
 * Magnetic feel with haptic feedback
 * Apple-style typography
 */
const GlassButton: React.FC<GlassButtonProps> = ({
    title,
    onPress,
    style,
    textStyle,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    icon,
}) => {
    const scale = useSharedValue(1);
    const pressed = useSharedValue(0);

    const handlePressIn = useCallback(() => {
        if (disabled) return;

        scale.value = withSpring(0.95, {
            damping: 15,
            stiffness: 500,
        });
        pressed.value = withTiming(1, { duration: 80 });

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [disabled, scale, pressed]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, {
            damping: 12,
            stiffness: 300,
        });
        pressed.value = withTiming(0, { duration: 150 });
    }, [scale, pressed]);

    const animatedStyle = useAnimatedStyle(() => {
        const shadowOpacity = interpolate(
            pressed.value,
            [0, 1],
            [0.12, 0.2],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ scale: scale.value }],
            shadowOpacity,
        };
    });

    const sizeStyles = {
        small: { paddingVertical: 10, paddingHorizontal: 16 },
        medium: { paddingVertical: 14, paddingHorizontal: 24 },
        large: { paddingVertical: 18, paddingHorizontal: 32 },
    };

    const textSizeStyles = {
        small: { fontSize: 14 },
        medium: { fontSize: 16 },
        large: { fontSize: 18 },
    };

    const variantStyles = {
        primary: {
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            textColor: '#FFFFFF',
        },
        secondary: {
            backgroundColor: 'rgba(255, 255, 255, 0.65)',
            textColor: '#1C1C1E',
        },
        ghost: {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            textColor: '#1C1C1E',
        },
    };

    return (
        <AnimatedTouchable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            disabled={disabled}
            style={[
                styles.button,
                sizeStyles[size],
                { backgroundColor: variantStyles[variant].backgroundColor },
                disabled && styles.disabled,
                animatedStyle,
                style,
            ]}
        >
            {/* Glass effect */}
            <BlurView
                intensity={40}
                tint="systemUltraThinMaterialLight"
                style={StyleSheet.absoluteFill}
            />

            {/* Top edge highlight */}
            <View style={styles.topEdge} />

            {/* Border */}
            <View style={styles.border} />

            {/* Content */}
            <View style={styles.content}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <Text style={[
                    styles.text,
                    textSizeStyles[size],
                    { color: variantStyles[variant].textColor },
                    textStyle,
                ]}>
                    {title}
                </Text>
            </View>
        </AnimatedTouchable>
    );
};

// Import View for the component
import { View } from 'react-native';

const styles = StyleSheet.create({
    button: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
    },
    disabled: {
        opacity: 0.5,
    },
    topEdge: {
        position: 'absolute',
        top: 0,
        left: 4,
        right: 4,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    border: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 16,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    iconContainer: {
        marginRight: 8,
    },
    text: {
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});

export default GlassButton;
