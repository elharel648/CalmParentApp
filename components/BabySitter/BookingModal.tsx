/**
 * BookingModal - מודל הזמנת בייביסיטר
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import { X, Calendar, Clock, Check, ChevronRight, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';

interface BookingModalProps {
    visible: boolean;
    onClose: () => void;
    sitter: {
        id: string;
        name: string;
        hourlyRate: number;
        image?: string;
    };
    onSuccess?: () => void;
}

// Generate time slots from 6:00 to 23:00
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return `${hour.toString().padStart(2, '0')}:00`;
});

const BookingModal: React.FC<BookingModalProps> = ({
    visible,
    onClose,
    sitter,
    onSuccess,
}) => {
    const { theme } = useTheme();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [startTime, setStartTime] = useState<string>('18:00');
    const [endTime, setEndTime] = useState<string>('22:00');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Generate next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
    });

    // Format date for display
    const formatDate = (date: Date) => {
        const days = ['יום א\'', 'יום ב\'', 'יום ג\'', 'יום ד\'', 'יום ה\'', 'יום ו\'', 'שבת'];
        const day = days[date.getDay()];
        const dayNum = date.getDate();
        const month = date.getMonth() + 1;
        return { day, date: `${dayNum}/${month}` };
    };

    // Calculate duration and price
    const calculateDuration = useCallback(() => {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const duration = endMinutes - startMinutes;
        return duration > 0 ? duration : 0;
    }, [startTime, endTime]);

    const duration = calculateDuration();
    const totalPrice = Math.round((duration / 60) * sitter.hourlyRate);

    // Submit booking
    const handleSubmit = async () => {
        if (duration <= 0) {
            Alert.alert('שגיאה', 'שעת סיום חייבת להיות אחרי שעת התחלה');
            return;
        }

        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not logged in');

            await addDoc(collection(db, 'bookings'), {
                parentId: user.uid,
                babysitterId: sitter.id,
                status: 'pending',
                date: selectedDate,
                startTime,
                endTime,
                hourlyRate: sitter.hourlyRate,
                estimatedAmount: totalPrice,
                notes: notes.trim(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                '✅ בקשה נשלחה!',
                `הבקשה נשלחה ל${sitter.name}. תקבל/י עדכון כש${sitter.name} תאשר.`,
                [{ text: 'מעולה', onPress: () => { onClose(); onSuccess?.(); } }]
            );
        } catch (error) {
            console.error('Booking error:', error);
            Alert.alert('שגיאה', 'לא הצלחנו לשלוח את הבקשה. נסה שוב.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                        הזמנת {sitter.name}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Date Selection */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Calendar size={20} color="#6366F1" />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                בחר תאריך
                            </Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.datesRow}>
                                {dates.map((date, i) => {
                                    const formatted = formatDate(date);
                                    const isSelected = selectedDate.toDateString() === date.toDateString();
                                    const isToday = i === 0;
                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.dateCard,
                                                isSelected && styles.dateCardSelected
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedDate(date);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dateDay,
                                                isSelected && styles.dateDaySelected
                                            ]}>
                                                {isToday ? 'היום' : formatted.day}
                                            </Text>
                                            <Text style={[
                                                styles.dateNum,
                                                isSelected && styles.dateNumSelected
                                            ]}>
                                                {formatted.date}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    </View>

                    {/* Time Selection */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Clock size={20} color="#10B981" />
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                                שעות
                            </Text>
                        </View>
                        <View style={styles.timeRow}>
                            <View style={styles.timeBlock}>
                                <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>מ-</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.timePicker}>
                                        {TIME_SLOTS.map(time => (
                                            <TouchableOpacity
                                                key={`start-${time}`}
                                                style={[
                                                    styles.timeChip,
                                                    startTime === time && styles.timeChipSelected
                                                ]}
                                                onPress={() => setStartTime(time)}
                                            >
                                                <Text style={[
                                                    styles.timeChipText,
                                                    startTime === time && styles.timeChipTextSelected
                                                ]}>
                                                    {time}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                            <View style={styles.timeBlock}>
                                <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>עד-</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.timePicker}>
                                        {TIME_SLOTS.map(time => (
                                            <TouchableOpacity
                                                key={`end-${time}`}
                                                style={[
                                                    styles.timeChip,
                                                    endTime === time && styles.timeChipSelected
                                                ]}
                                                onPress={() => setEndTime(time)}
                                            >
                                                <Text style={[
                                                    styles.timeChipText,
                                                    endTime === time && styles.timeChipTextSelected
                                                ]}>
                                                    {time}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
                    </View>

                    {/* Notes */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                            הערות (אופציונלי)
                        </Text>
                        <TextInput
                            style={[styles.notesInput, { backgroundColor: theme.card, color: theme.textPrimary }]}
                            placeholder="פרטים נוספים לבייביסיטר..."
                            placeholderTextColor={theme.textSecondary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    {/* Summary */}
                    <View style={[styles.summaryCard, { backgroundColor: '#F0FDF4' }]}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>משך משמרת</Text>
                            <Text style={styles.summaryValue}>
                                {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} שעות
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>מחיר לשעה</Text>
                            <Text style={styles.summaryValue}>₪{sitter.hourlyRate}</Text>
                        </View>
                        <View style={[styles.summaryRow, styles.summaryTotal]}>
                            <Text style={styles.totalLabel}>סה"כ משוער</Text>
                            <Text style={styles.totalValue}>₪{totalPrice}</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Submit Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <Text style={styles.submitBtnText}>
                            {loading ? 'שולח...' : '📅 שלח בקשה'}
                        </Text>
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
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    datesRow: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    dateCard: {
        width: 70,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    dateCardSelected: {
        backgroundColor: '#6366F1',
    },
    dateDay: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    dateDaySelected: {
        color: '#fff',
    },
    dateNum: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 4,
    },
    dateNumSelected: {
        color: '#fff',
    },
    timeRow: {
        gap: 16,
    },
    timeBlock: {
        marginBottom: 12,
    },
    timeLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        textAlign: 'right',
    },
    timePicker: {
        flexDirection: 'row-reverse',
        gap: 8,
    },
    timeChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    timeChipSelected: {
        backgroundColor: '#10B981',
    },
    timeChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    timeChipTextSelected: {
        color: '#fff',
    },
    notesInput: {
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        minHeight: 80,
        textAlign: 'right',
        textAlignVertical: 'top',
    },
    summaryCard: {
        borderRadius: 16,
        padding: 20,
        marginTop: 10,
    },
    summaryRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    summaryTotal: {
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
        fontSize: 20,
        fontWeight: '800',
        color: '#059669',
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    submitBtn: {
        backgroundColor: '#6366F1',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});

export default BookingModal;
