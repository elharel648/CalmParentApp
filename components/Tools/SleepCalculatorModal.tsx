import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { X, Clock, Sun, Moon } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useActiveChild } from '../../context/ActiveChildContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, addMinutes } from 'date-fns';

interface SleepCalculatorModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function SleepCalculatorModal({ visible, onClose }: SleepCalculatorModalProps) {
    const { theme } = useTheme();
    const { activeChild } = useActiveChild();
    const [wakeTime, setWakeTime] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);

    // Calculate wake window based on age
    const getWakeWindow = () => {
        // Mock age - in real app use ageMonths from activeChild
        // Assuming activeChild has birthDate/age logic elsewhere, but for now we default to a safe range
        // or calculate if we had birthDate available easily. 
        // Logic placehoder:
        return { min: 90, max: 120 }; // 1.5 - 2 hours (approx 4-6 months)
    };

    const window = getWakeWindow();
    const nextSleepMin = addMinutes(wakeTime, window.min);
    const nextSleepMax = addMinutes(wakeTime, window.max);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>מחשבון שינה</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    <Text style={[styles.question, { color: theme.textSecondary }]}>מתי התינוק התעורר?</Text>

                    <TouchableOpacity
                        style={[styles.timePickerBtn, { backgroundColor: theme.card }]}
                        onPress={() => setShowPicker(true)}
                    >
                        <Text style={[styles.timeText, { color: theme.textPrimary }]}>
                            {format(wakeTime, 'HH:mm')}
                        </Text>
                    </TouchableOpacity>

                    {showPicker && (
                        <DateTimePicker
                            value={wakeTime}
                            mode="time"
                            display="spinner"
                            onChange={(e, d) => {
                                setShowPicker(Platform.OS === 'ios');
                                if (d) setWakeTime(d);
                            }}
                        />
                    )}

                    <View style={[styles.resultCard, { backgroundColor: '#DBEAFE' }]}>
                        <Clock size={32} color="#2563EB" />
                        <Text style={styles.resultLabel}>חלון השינה הבא</Text>
                        <Text style={styles.resultTime}>
                            {format(nextSleepMin, 'HH:mm')} - {format(nextSleepMax, 'HH:mm')}
                        </Text>
                        <Text style={styles.resultNote}>
                            לפי גיל התינוק, זמן הערות המומלץ הוא בין {window.min / 60}-{window.max / 60} שעות.
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    closeBtn: {
        padding: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    question: {
        fontSize: 18,
        marginBottom: 16,
    },
    timePickerBtn: {
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 40,
    },
    timeText: {
        fontSize: 32,
        fontWeight: '700',
    },
    resultCard: {
        width: '100%',
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        gap: 12,
    },
    resultLabel: {
        fontSize: 16,
        color: '#1E40AF',
        fontWeight: '600',
    },
    resultTime: {
        fontSize: 40,
        fontWeight: '800',
        color: '#1E3A8A',
    },
    resultNote: {
        textAlign: 'center',
        color: '#1E40AF',
        opacity: 0.8,
        marginTop: 8,
    }
});
