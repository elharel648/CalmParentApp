import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassSwitchProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
    activeColor?: string;
}

/**
 * Apple-style Liquid Glass Switch
 * Premium frosted glass toggle with smooth animations
 */
const GlassSwitch: React.FC<GlassSwitchProps> = ({
    value,
    onValueChange,
    disabled = false,
    activeColor = '#FF9500',
}) => {
    const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

    React.useEffect(() => {
        Animated.spring(animatedValue, {
            toValue: value ? 1 : 0,
            damping: 15,
            stiffness: 200,
            useNativeDriver: true,
        }).start();
    }, [value, animatedValue]);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [2, 22],
    });

    const backgroundColor = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(120, 120, 128, 0.32)', activeColor],
    });

    const handlePress = () => {
        if (!disabled) {
            onValueChange(!value);
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            disabled={disabled}
            style={[styles.container, disabled && styles.disabled]}
        >
            {/* Glass track background */}
            <View style={styles.trackContainer}>
                <BlurView
                    intensity={value ? 0 : 40}
                    tint="systemUltraThinMaterial"
                    style={StyleSheet.absoluteFill}
                />
                <Animated.View
                    style={[
                        styles.trackOverlay,
                        { backgroundColor }
                    ]}
                />
                {/* Inner glass highlight */}
                <View style={styles.innerHighlight} />
            </View>

            {/* Thumb with glass effect */}
            <Animated.View
                style={[
                    styles.thumb,
                    { transform: [{ translateX }] }
                ]}
            >
                <View style={styles.thumbInner}>
                    {/* Thumb reflection */}
                    <View style={styles.thumbReflection} />
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 51,
        height: 31,
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
    trackContainer: {
        width: 51,
        height: 31,
        borderRadius: 15.5,
        overflow: 'hidden',
        backgroundColor: 'rgba(120, 120, 128, 0.16)',
    },
    trackOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 15.5,
    },
    innerHighlight: {
        position: 'absolute',
        top: 1,
        left: 2,
        right: 2,
        height: 12,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    thumb: {
        position: 'absolute',
        width: 27,
        height: 27,
        borderRadius: 13.5,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    thumbInner: {
        width: 27,
        height: 27,
        borderRadius: 13.5,
        overflow: 'hidden',
    },
    thumbReflection: {
        position: 'absolute',
        top: 2,
        left: 4,
        right: 4,
        height: 10,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
});

export default GlassSwitch;
