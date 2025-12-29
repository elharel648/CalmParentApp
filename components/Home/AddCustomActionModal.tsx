import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { X, Sparkles, Baby, Bath, Stethoscope, Pill, Thermometer, Camera, Book, Music, Star, Clock, Calendar, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';

interface AddCustomActionModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: (action: CustomAction) => void;
}

export interface CustomAction {
    id: string;
    name: string;
    icon: string;
    color: string;
    createdAt: string;
    date?: string;
    time?: string;
    notes?: string;
}

const PRESET_ICONS = [
    { key: 'sparkles', icon: Sparkles, color: '#F59E0B' },
    { key: 'baby', icon: Baby, color: '#EC4899' },
    { key: 'bath', icon: Bath, color: '#06B6D4' },
    { key: 'stethoscope', icon: Stethoscope, color: '#10B981' },
    { key: 'pill', icon: Pill, color: '#8B5CF6' },
    { key: 'thermometer', icon: Thermometer, color: '#EF4444' },
    { key: 'camera', icon: Camera, color: '#6366F1' },
    { key: 'book', icon: Book, color: '#14B8A6' },
    { key: 'music', icon: Music, color: '#A855F7' },
    { key: 'star', icon: Star, color: '#FBBF24' },
];

const AddCustomActionModal = memo<AddCustomActionModalProps>(({ visible, onClose, onAdd }) => {
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    };

    const handleAdd = () => {
        if (!name.trim() || !selectedIcon) return;

        const iconConfig = PRESET_ICONS.find(i => i.key === selectedIcon);

        const newAction: CustomAction = {
            id: Date.now().toString(),
            name: name.trim(),
            icon: selectedIcon,
            color: iconConfig?.color || '#6B7280',
            createdAt: new Date().toISOString(),
            date: selectedDate.toISOString().split('T')[0],
            time: formatTime(selectedDate),
            notes: notes.trim() || undefined,
        };

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        onAdd(newAction);
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setName('');
        setSelectedIcon(null);
        setNotes('');
        setSelectedDate(new Date());
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>הוספת פעולה</Text>
                        <View style={{ width: 32 }} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                        {/* Name Input */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>שם הפעולה</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.background, color: theme.textPrimary }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="למשל: אמבטיה, משחק..."
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                            />
                        </View>

                        {/* Icon Selection */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>בחר אייקון</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.iconsRow}>
                                    {PRESET_ICONS.map(({ key, icon: Icon, color }) => (
                                        <TouchableOpacity
                                            key={key}
                                            style={[
                                                styles.iconOption,
                                                { backgroundColor: color + '20' },
                                                selectedIcon === key && { borderColor: color, borderWidth: 2 }
                                            ]}
                                            onPress={() => {
                                                setSelectedIcon(key);
                                                if (Platform.OS !== 'web') {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }
                                            }}
                                        >
                                            <Icon size={20} color={color} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {/* Date & Time Row */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>תאריך ושעה</Text>
                            <View style={styles.dateTimeRow}>
                                <TouchableOpacity
                                    style={[styles.dateTimeBtn, { backgroundColor: theme.background }]}
                                    onPress={() => setShowTimePicker(true)}
                                >
                                    <Clock size={16} color={theme.textSecondary} />
                                    <Text style={[styles.dateTimeText, { color: theme.textPrimary }]}>
                                        {formatTime(selectedDate)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.dateTimeBtn, { backgroundColor: theme.background }]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Calendar size={16} color={theme.textSecondary} />
                                    <Text style={[styles.dateTimeText, { color: theme.textPrimary }]}>
                                        {formatDate(selectedDate)}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Notes Input */}
                        <View style={styles.inputSection}>
                            <View style={styles.labelRow}>
                                <FileText size={14} color={theme.textSecondary} />
                                <Text style={[styles.label, { color: theme.textSecondary }]}>הערות (אופציונלי)</Text>
                            </View>
                            <TextInput
                                style={[styles.notesInput, { backgroundColor: theme.background, color: theme.textPrimary }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="הוסף פרטים נוספים..."
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </ScrollView>

                    {/* Add Button */}
                    <TouchableOpacity
                        style={[
                            styles.addButton,
                            (!name.trim() || !selectedIcon) && styles.addButtonDisabled
                        ]}
                        onPress={handleAdd}
                        disabled={!name.trim() || !selectedIcon}
                    >
                        <Text style={styles.addButtonText}>הוסף פעולה</Text>
                    </TouchableOpacity>

                    {/* Date Picker Modal */}
                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="spinner"
                            onChange={(event, date) => {
                                setShowDatePicker(false);
                                if (date) setSelectedDate(date);
                            }}
                        />
                    )}

                    {/* Time Picker Modal */}
                    {showTimePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="time"
                            display="spinner"
                            onChange={(event, date) => {
                                setShowTimePicker(false);
                                if (date) setSelectedDate(date);
                            }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
});

AddCustomActionModal.displayName = 'AddCustomActionModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 360,
        maxHeight: '80%',
        borderRadius: 24,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    closeBtn: {
        padding: 6,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        maxHeight: 320,
    },
    inputSection: {
        marginBottom: 18,
    },
    labelRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'right',
    },
    input: {
        borderRadius: 14,
        padding: 14,
        fontSize: 15,
    },
    notesInput: {
        borderRadius: 14,
        padding: 14,
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    iconsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateTimeRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    dateTimeBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 14,
    },
    dateTimeText: {
        fontSize: 15,
        fontWeight: '500',
    },
    addButton: {
        backgroundColor: '#10B981',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    addButtonDisabled: {
        backgroundColor: '#D1D5DB',
    },
    addButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default AddCustomActionModal;

