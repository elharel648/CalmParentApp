import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
} from 'react-native';
import { X, TrendingUp, FileText, ChevronDown, ChevronUp, Calendar, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { addGrowthMeasurement, updateGrowthMeasurement, deleteGrowthMeasurement, GrowthMeasurement } from '../../services/growthService';
import { Timestamp } from 'firebase/firestore';

interface GrowthModalProps {
    visible: boolean;
    onClose: () => void;
    childId?: string;
    // Edit mode props
    editMeasurement?: GrowthMeasurement;
}

export default function GrowthModal({ visible, onClose, childId, editMeasurement }: GrowthModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { baby, updateAllStats } = useBabyProfile(childId);

    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [headCircumference, setHeadCircumference] = useState('');
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Date picker
    const [measurementDate, setMeasurementDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    const isEditMode = !!editMeasurement;

    // Populate fields in edit mode
    useEffect(() => {
        if (editMeasurement) {
            setWeight(editMeasurement.weight?.toString() || '');
            setHeight(editMeasurement.height?.toString() || '');
            setHeadCircumference(editMeasurement.headCircumference?.toString() || '');
            setNotes(editMeasurement.notes || '');
            setMeasurementDate(editMeasurement.date.toDate());
            if (editMeasurement.notes) setShowNotes(true);
        } else {
            // Reset for new measurement
            setMeasurementDate(new Date());
        }
    }, [editMeasurement, visible]);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const historyData: {
            weight?: number;
            height?: number;
            headCircumference?: number;
            notes?: string;
            date?: Timestamp;
        } = {
            date: Timestamp.fromDate(measurementDate),
        };

        if (weight.trim().length > 0) {
            historyData.weight = parseFloat(weight.trim());
        }
        if (height.trim().length > 0) {
            historyData.height = parseFloat(height.trim());
        }
        if (headCircumference.trim().length > 0) {
            historyData.headCircumference = parseFloat(headCircumference.trim());
        }
        if (notes.trim().length > 0) {
            historyData.notes = notes.trim();
        }

        try {
            if (isEditMode && editMeasurement) {
                // Update existing measurement
                await updateGrowthMeasurement(editMeasurement.id, historyData);
            } else if (childId) {
                // Add new measurement
                await addGrowthMeasurement(childId, historyData);

                // Also update baby.stats if this is the latest measurement (today)
                const today = new Date();
                if (measurementDate.toDateString() === today.toDateString()) {
                    const statsToSave: { weight?: string; height?: string; headCircumference?: string } = {};
                    if (weight.trim()) statsToSave.weight = weight.trim();
                    if (height.trim()) statsToSave.height = height.trim();
                    if (headCircumference.trim()) statsToSave.headCircumference = headCircumference.trim();
                    if (Object.keys(statsToSave).length > 0) {
                        await updateAllStats(statsToSave);
                    }
                }
            }
        } catch (error) {
            console.error('Error saving measurement:', error);
        }

        resetAndClose();
    };

    const handleDelete = async () => {
        if (!editMeasurement) return;

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        try {
            await deleteGrowthMeasurement(editMeasurement.id);
        } catch (error) {
            console.error('Error deleting measurement:', error);
        }

        resetAndClose();
    };

    const resetAndClose = () => {
        setWeight('');
        setHeight('');
        setHeadCircumference('');
        setNotes('');
        setShowNotes(false);
        setMeasurementDate(new Date());
        setIsSaving(false);
        onClose();
    };

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        resetAndClose();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setMeasurementDate(selectedDate);
        }
    };

    const hasValues = weight || height || headCircumference;
    const isToday = measurementDate.toDateString() === new Date().toDateString();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ width: 30 }} />
                        <View style={styles.headerContent}>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>
                                {isEditMode ? 'עריכת מדידה' : 'מעקב גדילה'}
                            </Text>
                            <TrendingUp size={18} color="#10B981" strokeWidth={2.5} />
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={22} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Date Picker Row */}
                        <TouchableOpacity
                            style={[styles.dateRow, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5' }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Calendar size={18} color={theme.textSecondary} />
                            <Text style={[styles.dateText, { color: theme.textPrimary }]}>
                                {isToday ? 'היום' : format(measurementDate, 'd בMMMM yyyy', { locale: he })}
                            </Text>
                            <ChevronDown size={16} color={theme.textTertiary} />
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={measurementDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                                maximumDate={new Date()}
                            />
                        )}

                        {/* Weight Row */}
                        <View style={styles.row}>
                            <Text style={[styles.label, { color: theme.textPrimary }]}>משקל</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
                                    color: theme.textPrimary,
                                }]}
                                value={weight}
                                onChangeText={setWeight}
                                placeholder={baby?.stats?.weight || "0.0"}
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="decimal-pad"
                                textAlign="center"
                            />
                            <Text style={[styles.unit, { color: theme.textSecondary }]}>ק"ג</Text>
                        </View>

                        {/* Height Row */}
                        <View style={styles.row}>
                            <Text style={[styles.label, { color: theme.textPrimary }]}>גובה</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
                                    color: theme.textPrimary,
                                }]}
                                value={height}
                                onChangeText={setHeight}
                                placeholder={baby?.stats?.height || "0"}
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="decimal-pad"
                                textAlign="center"
                            />
                            <Text style={[styles.unit, { color: theme.textSecondary }]}>ס"מ</Text>
                        </View>

                        {/* Head Circumference Row */}
                        <View style={styles.row}>
                            <Text style={[styles.label, { color: theme.textPrimary }]}>היקף ראש</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
                                    color: theme.textPrimary,
                                }]}
                                value={headCircumference}
                                onChangeText={setHeadCircumference}
                                placeholder={baby?.stats?.headCircumference || "0"}
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="decimal-pad"
                                textAlign="center"
                            />
                            <Text style={[styles.unit, { color: theme.textSecondary }]}>ס"מ</Text>
                        </View>

                        {/* Notes Toggle */}
                        <TouchableOpacity
                            style={styles.notesToggle}
                            onPress={() => setShowNotes(!showNotes)}
                        >
                            <View style={styles.notesToggleContent}>
                                {showNotes ? (
                                    <ChevronUp size={16} color={theme.textSecondary} />
                                ) : (
                                    <ChevronDown size={16} color={theme.textSecondary} />
                                )}
                                <FileText size={14} color={theme.textSecondary} />
                                <Text style={[styles.notesToggleText, { color: theme.textSecondary }]}>
                                    {showNotes ? 'הסתר הערות' : 'הוסף הערה'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Notes Field */}
                        {showNotes && (
                            <TextInput
                                style={[styles.notesInput, {
                                    backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
                                    color: theme.textPrimary,
                                }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="הערות..."
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                                multiline
                                numberOfLines={3}
                            />
                        )}

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveBtn, { opacity: !hasValues ? 0.5 : 1 }]}
                            onPress={handleSave}
                            disabled={!hasValues || isSaving}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveBtnText}>
                                {isSaving ? 'שומר...' : isEditMode ? 'עדכן מדידה' : 'שמור מדידה'}
                            </Text>
                        </TouchableOpacity>

                        {/* Delete Button (Edit Mode) */}
                        {isEditMode && (
                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={handleDelete}
                                activeOpacity={0.8}
                            >
                                <Trash2 size={16} color="#EF4444" />
                                <Text style={styles.deleteBtnText}>מחק מדידה</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 20,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    closeBtn: {
        padding: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    dateRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    dateText: {
        fontSize: 15,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
        width: 70,
        textAlign: 'right',
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    unit: {
        fontSize: 13,
        fontWeight: '500',
        width: 32,
    },
    notesToggle: {
        marginTop: 4,
        marginBottom: 16,
    },
    notesToggleContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    notesToggleText: {
        fontSize: 13,
        fontWeight: '500',
    },
    notesInput: {
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        minHeight: 70,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    saveBtn: {
        backgroundColor: '#34D399',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 4,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    deleteBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        marginTop: 12,
    },
    deleteBtnText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },
});
