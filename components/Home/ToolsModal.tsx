import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated, Dimensions, Platform, Linking } from 'react-native';
import { X, ListChecks, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';

interface ToolsModalProps {
    visible: boolean;
    onClose: () => void;
    onChecklistPress: () => void;
    onNextNapPress: () => void;
}

export default function ToolsModal({
    visible,
    onClose,
    onChecklistPress,
    onNextNapPress
}: ToolsModalProps) {
    const { theme, isDarkMode } = useTheme();
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 22,
                    stiffness: 200,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(400);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const handlePress = (action: () => void) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onClose();
        setTimeout(action, 300); // Small delay to allow modal to close smoothly
    };

    const handleEmergency = () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        // Could open a specific emergency modal or dialer
        Linking.openURL('tel:101'); // Magen David Adom in Israel
    };

    const tools = [
        {
            id: 'nextnap',
            title: 'מחשבון שינה',
            subtitle: 'מתי להשכיב לישון?',
            icon: Clock,
            color: '#60A5FA',
            bg: '#DBEAFE',
            action: onNextNapPress,
        },
        {
            id: 'checklist',
            title: 'צ\'קליסט הרגעה',
            subtitle: 'תינוק בוכה? בוא נבדוק',
            icon: ListChecks,
            color: '#8B5CF6',
            bg: '#EDE9FE',
            action: onChecklistPress,
        },
    ];

    return (
        <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableOpacity>

                <Animated.View
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme.card,
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.cardSecondary }]}>
                            <X size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>ארגז כלים</Text>
                        <View style={{ width: 36 }} />
                    </View>

                    {/* Grid */}
                    <View style={styles.grid}>
                        {tools.map((tool) => (
                            <TouchableOpacity
                                key={tool.id}
                                style={[styles.card, { backgroundColor: theme.cardSecondary }]}
                                onPress={() => handlePress(tool.action)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconCircle, { backgroundColor: tool.bg }]}>
                                    <tool.icon size={28} color={tool.color} strokeWidth={1.5} />
                                </View>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{tool.title}</Text>
                                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{tool.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>


                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    container: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    grid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    card: {
        width: '100%', // Full width for 2 items
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 12,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 12,
        textAlign: 'center',
        opacity: 0.8,
    },

});
