import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    children?: React.ReactNode;
}

export default function EmptyState({
    icon: Icon,
    title,
    message,
    actionLabel,
    onAction,
    children,
}: EmptyStateProps) {
    const { theme, isDarkMode } = useTheme();

    return (
        <View style={styles.container}>
            {Icon && (
                <View style={[styles.iconContainer, { backgroundColor: theme.cardSecondary }]}>
                    <Icon size={48} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
            )}
            <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
            {message && (
                <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
            )}
            {children}
            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.primary }]}
                    onPress={onAction}
                    activeOpacity={0.8}
                >
                    <Text style={styles.actionText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: 300,
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 8,
    },
    actionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

