import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { Trash2, Share2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

interface SwipeableRowProps {
    children: React.ReactNode;
    onDelete?: () => void;
    onShare?: () => void;
    rightActions?: Array<{
        label: string;
        icon: React.ComponentType<{ size: number; color: string }>;
        color: string;
        onPress: () => void;
    }>;
}

export default function SwipeableRow({
    children,
    onDelete,
    onShare,
    rightActions,
}: SwipeableRowProps) {
    const { theme, isDarkMode } = useTheme();
    const swipeableRef = useRef<Swipeable>(null);

    const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
        const actions = rightActions || [];

        if (!rightActions) {
            // Ultra-minimalist premium actions - only icons, no labels
            if (onShare) {
                actions.push({
                    label: '',
                    icon: Share2,
                    color: isDarkMode ? 'rgba(59, 130, 246, 0.95)' : 'rgba(37, 99, 235, 0.95)',
                    onPress: () => {
                        if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        swipeableRef.current?.close();
                        setTimeout(() => onShare(), 200);
                    },
                });
            }
            if (onDelete) {
                actions.push({
                    label: '',
                    icon: Trash2,
                    color: 'rgba(239, 68, 68, 0.95)',
                    onPress: () => {
                        if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                        swipeableRef.current?.close();
                        setTimeout(() => onDelete(), 200);
                    },
                });
            }
        }

        // Smooth scale animation
        const scale = dragX.interpolate({
            inputRange: [0, 10, 72 * actions.length],
            outputRange: [0.85, 0.92, 1],
            extrapolate: 'clamp',
        });

        // Smooth opacity fade-in
        const opacity = dragX.interpolate({
            inputRange: [0, 8, 72 * actions.length],
            outputRange: [0, 0.5, 1],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.leftActions}>
                {actions.map((action, index) => {
                    // Staggered entrance animation
                    const transX = progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-72 * (actions.length - index) - 20, 0],
                        extrapolate: 'clamp',
                    });

                    // Ultra-smooth icon scale animation
                    const iconScale = progress.interpolate({
                        inputRange: [0, 0.2, 0.6, 1],
                        outputRange: [0, 0.5, 0.85, 1],
                        extrapolate: 'clamp',
                    });

                    // Subtle icon rotation for premium feel
                    const iconRotate = progress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: ['-8deg', '-2deg', '0deg'],
                        extrapolate: 'clamp',
                    });

                    const Icon = action.icon;

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.actionButton,
                                {
                                    backgroundColor: action.color,
                                    transform: [
                                        { translateX: transX },
                                        { scale },
                                    ],
                                    opacity,
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.actionContent}
                                onPress={action.onPress}
                                activeOpacity={0.6}
                            >
                                <Animated.View
                                    style={{
                                        transform: [
                                            { scale: iconScale },
                                            { rotate: iconRotate },
                                        ],
                                    }}
                                >
                                    <Icon size={20} color="#fff" strokeWidth={2} />
                                </Animated.View>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        );
    };

    return (
        <GestureHandlerRootView>
            <Swipeable
                ref={swipeableRef}
                renderLeftActions={renderLeftActions}
                friction={2.8}
                leftThreshold={50}
                overshootLeft={false}
                overshootRight={false}
                containerStyle={styles.swipeableContainer}
                enableTrackpadTwoFingerGesture={Platform.OS === 'ios'}
            >
                {children}
            </Swipeable>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    swipeableContainer: {
        overflow: 'visible',
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100%',
        gap: 0,
    },
    actionButton: {
        width: 64,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        marginRight: 4,
        // Premium glassmorphism shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionContent: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        // Ultra-subtle border for depth
        borderWidth: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
});

