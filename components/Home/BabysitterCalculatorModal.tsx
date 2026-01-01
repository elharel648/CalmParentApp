/**
 * BabysitterCalculatorModal - מחשבון תשלום לבייביסיטר
 * עם שני מצבים: טיימר או הזנה ידנית
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Alert,
    Animated,
    Easing,
} from 'react-native';
import { X, Clock, Calculator, Play, Pause, RotateCcw, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

interface BabysitterCalculatorModalProps {
    visible: boolean;
    onClose: () => void;
}

type Mode = 'timer' | 'manual';

const BabysitterCalculatorModal: React.FC<BabysitterCalculatorModalProps> = ({
    visible,
    onClose,
}) => {
    const { theme, isDarkMode } = useTheme();

    // Mode selection
    const [mode, setMode] = useState<Mode>('timer');

    // Hourly rate
    const [hourlyRate, setHourlyRate] = useState('50');

    // Timer state
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Manual input state
    const [startHour, setStartHour] = useState('18');
    const [startMinute, setStartMinute] = useState('00');
    const [endHour, setEndHour] = useState('22');
    const [endMinute, setEndMinute] = useState('00');

    // Pulse animation for running timer
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isRunning) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isRunning]);

    // Timer logic
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning]);

    // Format time display
    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Calculate payment for timer mode
    const calculateTimerPayment = useCallback(() => {
        const hours = elapsedSeconds / 3600;
        const rate = parseFloat(hourlyRate) || 0;
        return Math.round(hours * rate * 100) / 100;
    }, [elapsedSeconds, hourlyRate]);

    // Calculate payment for manual mode
    const calculateManualPayment = useCallback(() => {
        const startH = parseInt(startHour) || 0;
        const startM = parseInt(startMinute) || 0;
        const endH = parseInt(endHour) || 0;
        const endM = parseInt(endMinute) || 0;

        const startTotalMinutes = startH * 60 + startM;
        const endTotalMinutes = endH * 60 + endM;

        const durationMinutes = endTotalMinutes - startTotalMinutes;
        if (durationMinutes <= 0) return { hours: 0, minutes: 0, payment: 0 };

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const rate = parseFloat(hourlyRate) || 0;
        const payment = Math.round((durationMinutes / 60) * rate * 100) / 100;

        return { hours, minutes, payment };
    }, [startHour, startMinute, endHour, endMinute, hourlyRate]);

    // Timer controls
    const handleStartStop = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsRunning(!isRunning);
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsRunning(false);
        setElapsedSeconds(0);
    };

    // Show result
    const handleShowResult = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const payment = mode === 'timer' ? calculateTimerPayment() : calculateManualPayment().payment;
        const timeStr = mode === 'timer'
            ? formatTime(elapsedSeconds)
            : `${calculateManualPayment().hours}:${calculateManualPayment().minutes.toString().padStart(2, '0')} שעות`;

        Alert.alert(
            '💰 סיכום תשלום',
            `זמן עבודה: ${timeStr}\nמחיר לשעה: ₪${hourlyRate}\n\n💵 סה"כ לתשלום: ₪${payment.toFixed(2)}`,
            [{ text: 'אישור' }]
        );
    };

    const timerPayment = calculateTimerPayment();
    const manualResult = calculateManualPayment();

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                        מחשבון בייביסיטר 👶
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Mode Toggle */}
                <View style={styles.modeToggle}>
                    <TouchableOpacity
                        style={[
                            styles.modeBtn,
                            mode === 'timer' && styles.modeBtnActive
                        ]}
                        onPress={() => setMode('timer')}
                    >
                        <Clock size={18} color={mode === 'timer' ? '#fff' : '#6B7280'} />
                        <Text style={[
                            styles.modeBtnText,
                            mode === 'timer' && styles.modeBtnTextActive
                        ]}>טיימר</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.modeBtn,
                            mode === 'manual' && styles.modeBtnActive
                        ]}
                        onPress={() => setMode('manual')}
                    >
                        <Calculator size={18} color={mode === 'manual' ? '#fff' : '#6B7280'} />
                        <Text style={[
                            styles.modeBtnText,
                            mode === 'manual' && styles.modeBtnTextActive
                        ]}>הזנה ידנית</Text>
                    </TouchableOpacity>
                </View>

                {/* Hourly Rate Input */}
                <View style={styles.rateSection}>
                    <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>
                        מחיר לשעה ₪
                    </Text>
                    <TextInput
                        style={[styles.rateInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
                        value={hourlyRate}
                        onChangeText={setHourlyRate}
                        keyboardType="numeric"
                        placeholder="50"
                        placeholderTextColor={theme.textSecondary}
                    />
                </View>

                {/* Timer Mode */}
                {mode === 'timer' && (
                    <View style={styles.timerSection}>
                        <Animated.View style={[
                            styles.timerDisplay,
                            { backgroundColor: isDarkMode ? '#1a1a2e' : '#f3f4f6', transform: [{ scale: pulseAnim }] }
                        ]}>
                            <Text style={[styles.timerText, { color: theme.textPrimary }]}>
                                {formatTime(elapsedSeconds)}
                            </Text>
                            <Text style={[styles.paymentPreview, { color: '#10B981' }]}>
                                ₪{timerPayment.toFixed(2)}
                            </Text>
                        </Animated.View>

                        <View style={styles.timerControls}>
                            <TouchableOpacity
                                style={[styles.timerBtn, isRunning ? styles.pauseBtn : styles.playBtn]}
                                onPress={handleStartStop}
                            >
                                {isRunning ? (
                                    <Pause size={28} color="#fff" fill="#fff" />
                                ) : (
                                    <Play size={28} color="#fff" fill="#fff" />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.resetBtn}
                                onPress={handleReset}
                            >
                                <RotateCcw size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Manual Mode */}
                {mode === 'manual' && (
                    <View style={styles.manualSection}>
                        <View style={styles.timeInputRow}>
                            <View style={styles.timeInputGroup}>
                                <Text style={[styles.timeInputLabel, { color: theme.textSecondary }]}>
                                    שעת התחלה
                                </Text>
                                <View style={styles.timeInputs}>
                                    <TextInput
                                        style={[styles.timeInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
                                        value={startMinute}
                                        onChangeText={setStartMinute}
                                        keyboardType="numeric"
                                        maxLength={2}
                                        placeholder="00"
                                        placeholderTextColor={theme.textSecondary}
                                    />
                                    <Text style={[styles.timeSeparator, { color: theme.textPrimary }]}>:</Text>
                                    <TextInput
                                        style={[styles.timeInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
                                        value={startHour}
                                        onChangeText={setStartHour}
                                        keyboardType="numeric"
                                        maxLength={2}
                                        placeholder="18"
                                        placeholderTextColor={theme.textSecondary}
                                    />
                                </View>
                            </View>

                            <View style={styles.timeInputGroup}>
                                <Text style={[styles.timeInputLabel, { color: theme.textSecondary }]}>
                                    שעת סיום
                                </Text>
                                <View style={styles.timeInputs}>
                                    <TextInput
                                        style={[styles.timeInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
                                        value={endMinute}
                                        onChangeText={setEndMinute}
                                        keyboardType="numeric"
                                        maxLength={2}
                                        placeholder="00"
                                        placeholderTextColor={theme.textSecondary}
                                    />
                                    <Text style={[styles.timeSeparator, { color: theme.textPrimary }]}>:</Text>
                                    <TextInput
                                        style={[styles.timeInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
                                        value={endHour}
                                        onChangeText={setEndHour}
                                        keyboardType="numeric"
                                        maxLength={2}
                                        placeholder="22"
                                        placeholderTextColor={theme.textSecondary}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Manual Result Preview */}
                        <View style={[styles.resultCard, { backgroundColor: '#F0FDF4' }]}>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>משך זמן:</Text>
                                <Text style={styles.resultValue}>
                                    {manualResult.hours} שעות {manualResult.minutes > 0 ? `ו-${manualResult.minutes} דקות` : ''}
                                </Text>
                            </View>
                            <View style={[styles.resultRow, styles.resultTotal]}>
                                <Text style={styles.totalLabel}>סה"כ לתשלום:</Text>
                                <Text style={styles.totalValue}>₪{manualResult.payment.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Submit Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleShowResult}
                    >
                        <Check size={20} color="#fff" />
                        <Text style={styles.submitBtnText}>הצג סיכום</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    closeBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    modeToggle: {
        flexDirection: 'row',
        margin: 20,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
    },
    modeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 10,
    },
    modeBtnActive: {
        backgroundColor: '#6366F1',
    },
    modeBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    modeBtnTextActive: {
        color: '#fff',
    },
    rateSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    rateLabel: {
        fontSize: 14,
        marginBottom: 8,
        textAlign: 'right',
    },
    rateInput: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    timerSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    timerDisplay: {
        width: '100%',
        paddingVertical: 40,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 30,
    },
    timerText: {
        fontSize: 52,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    paymentPreview: {
        fontSize: 28,
        fontWeight: '700',
        marginTop: 10,
    },
    timerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    timerBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playBtn: {
        backgroundColor: '#10B981',
    },
    pauseBtn: {
        backgroundColor: '#F59E0B',
    },
    resetBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    manualSection: {
        paddingHorizontal: 20,
    },
    timeInputRow: {
        flexDirection: 'row-reverse',
        gap: 20,
        marginBottom: 20,
    },
    timeInputGroup: {
        flex: 1,
    },
    timeInputLabel: {
        fontSize: 14,
        marginBottom: 8,
        textAlign: 'right',
    },
    timeInputs: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    timeInput: {
        width: 60,
        borderRadius: 10,
        paddingVertical: 12,
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
    },
    timeSeparator: {
        fontSize: 24,
        fontWeight: '700',
    },
    resultCard: {
        borderRadius: 16,
        padding: 20,
        marginTop: 10,
    },
    resultRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    resultLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    resultValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    resultTotal: {
        borderTopWidth: 1,
        borderTopColor: '#D1FAE5',
        paddingTop: 12,
        marginTop: 8,
        marginBottom: 0,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#059669',
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#059669',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 40,
        backgroundColor: 'transparent',
    },
    submitBtn: {
        backgroundColor: '#6366F1',
        borderRadius: 16,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});

export default BabysitterCalculatorModal;
