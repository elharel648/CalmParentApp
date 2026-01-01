import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
    message: string;
    type?: ToastType;
    duration?: number;
    action?: {
        label: string;
        onPress: () => void;
    };
    onDismiss?: () => void;
}

interface ToastProps extends ToastConfig {
    visible: boolean;
    onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({
    visible,
    message,
    type = 'info',
    duration = 3000,
    action,
    onDismiss,
    onHide,
}) => {
    const { theme, isDarkMode } = useTheme();
    const translateY = useSharedValue(100);
    const opacity = useSharedValue(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (visible) {
            // Haptic feedback
            if (Platform.OS !== 'web') {
                if (type === 'success') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else if (type === 'error') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
            }

            // Show animation
            translateY.value = withSpring(0, {
                damping: 20,
                stiffness: 300,
            });
            opacity.value = withTiming(1, { duration: 200 });

            // Auto hide
            if (duration > 0) {
                timeoutRef.current = setTimeout(() => {
                    hide();
                }, duration);
            }
        } else {
            hide();
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [visible, duration]);

    const hide = () => {
        translateY.value = withTiming(100, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(onHide)();
            if (onDismiss) {
                runOnJS(onDismiss)();
            }
        });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const getConfig = () => {
        switch (type) {
            case 'success':
                return {
                    icon: CheckCircle,
                    backgroundColor: '#10B981',
                    iconColor: '#fff',
                };
            case 'error':
                return {
                    icon: XCircle,
                    backgroundColor: '#EF4444',
                    iconColor: '#fff',
                };
            case 'warning':
                return {
                    icon: AlertCircle,
                    backgroundColor: '#F59E0B',
                    iconColor: '#fff',
                };
            case 'info':
            default:
                return {
                    icon: Info,
                    backgroundColor: isDarkMode ? '#3B82F6' : '#2563EB',
                    iconColor: '#fff',
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={[styles.toast, { backgroundColor: config.backgroundColor }]}>
                <Icon size={20} color={config.iconColor} strokeWidth={2.5} />
                <Text style={styles.message} numberOfLines={2}>
                    {message}
                </Text>
                {action && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                            action.onPress();
                            hide();
                        }}
                    >
                        <Text style={styles.actionText}>{action.label}</Text>
                    </TouchableOpacity>
                )}
                {!action && (
                    <TouchableOpacity style={styles.closeButton} onPress={hide}>
                        <X size={16} color={config.iconColor} strokeWidth={2.5} />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        zIndex: 10000,
        alignItems: 'center',
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        gap: 12,
        minHeight: 56,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    message: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
    },
    actionButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
    },
    actionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
});

export default Toast;

