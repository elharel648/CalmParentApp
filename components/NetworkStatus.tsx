import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../hooks/useNetwork';

interface OfflineBannerProps {
    onRetry?: () => void;
}

/**
 * Banner that shows when offline
 */
export const OfflineBanner = ({ onRetry }: OfflineBannerProps) => {
    const { isOffline } = useNetwork();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(-60)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isOffline ? 0 : -60,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
        }).start();
    }, [isOffline]);

    return (
        <Animated.View
            style={[
                styles.banner,
                {
                    transform: [{ translateY: slideAnim }],
                    paddingTop: insets.top + 8,
                }
            ]}
        >
            <View style={styles.bannerContent}>
                <WifiOff size={18} color="#fff" />
                <Text style={styles.bannerText}>אין חיבור לאינטרנט</Text>
                {onRetry && (
                    <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
                        <RefreshCw size={16} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

interface ConnectionToastProps {
    show: boolean;
    type: 'connected' | 'disconnected';
}

/**
 * Toast notification for connection changes
 */
export const ConnectionToast = ({ show, type }: ConnectionToastProps) => {
    const slideAnim = useRef(new Animated.Value(100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (show) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 20,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto hide after 3 seconds
            const timeout = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(slideAnim, {
                        toValue: 100,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start();
            }, 3000);

            return () => clearTimeout(timeout);
        }
    }, [show]);

    const isConnected = type === 'connected';

    return (
        <Animated.View
            style={[
                styles.toast,
                isConnected ? styles.toastConnected : styles.toastDisconnected,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: opacityAnim,
                },
            ]}
        >
            {isConnected ? (
                <CheckCircle size={18} color="#fff" />
            ) : (
                <AlertCircle size={18} color="#fff" />
            )}
            <Text style={styles.toastText}>
                {isConnected ? 'חזרת לרשת!' : 'אין חיבור לאינטרנט'}
            </Text>
        </Animated.View>
    );
};

interface ErrorStateProps {
    message?: string;
    onRetry?: () => void;
}

/**
 * Full-screen error state
 */
export const ErrorState = ({
    message = 'משהו השתבש',
    onRetry
}: ErrorStateProps) => {
    return (
        <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
                <AlertCircle size={40} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>אופס!</Text>
            <Text style={styles.errorMessage}>{message}</Text>
            {onRetry && (
                <TouchableOpacity style={styles.errorRetryButton} onPress={onRetry}>
                    <RefreshCw size={18} color="#fff" />
                    <Text style={styles.errorRetryText}>נסה שוב</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
}

/**
 * Empty state for lists
 */
export const EmptyState = ({
    icon,
    title,
    message,
    actionLabel,
    onAction
}: EmptyStateProps) => {
    return (
        <View style={styles.emptyContainer}>
            {icon && <View style={styles.emptyIcon}>{icon}</View>}
            <Text style={styles.emptyTitle}>{title}</Text>
            {message && <Text style={styles.emptyMessage}>{message}</Text>}
            {actionLabel && onAction && (
                <TouchableOpacity style={styles.emptyButton} onPress={onAction}>
                    <Text style={styles.emptyButtonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    // Offline Banner
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: '#EF4444',
        zIndex: 1000,
    },
    bannerContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
    },
    bannerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    retryButton: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
    },

    // Toast
    toast: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 8,
        zIndex: 1000,
    },
    toastConnected: {
        backgroundColor: '#10B981',
    },
    toastDisconnected: {
        backgroundColor: '#EF4444',
    },
    toastText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Error State
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    errorIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
    },
    errorRetryButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        marginTop: 24,
        gap: 8,
    },
    errorRetryText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyIcon: {
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyMessage: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 20,
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default {
    OfflineBanner,
    ConnectionToast,
    ErrorState,
    EmptyState,
};
