import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';

interface TimePickerProps {
    value: string; // HH:MM format
    label: string;
    onChange: (time: string) => void;
    disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
    value,
    label,
    onChange,
    disabled = false,
}) => {
    const [showPicker, setShowPicker] = useState(false);

    // Convert HH:MM string to Date object
    const getDateFromTime = (timeString: string): Date => {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    // Convert Date to HH:MM string
    const getTimeFromDate = (date: Date): string => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }

        if (selectedDate && event.type !== 'dismissed') {
            const newTime = getTimeFromDate(selectedDate);
            onChange(newTime);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.button, disabled && styles.buttonDisabled]}
                onPress={() => !disabled && setShowPicker(true)}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <View style={styles.content}>
                    <Clock size={18} color={disabled ? '#9CA3AF' : '#6366F1'} />
                    <Text style={[styles.label, disabled && styles.labelDisabled]}>
                        {label}
                    </Text>
                    <Text style={[styles.time, disabled && styles.timeDisabled]}>
                        {value}
                    </Text>
                </View>
            </TouchableOpacity>

            {showPicker && (
                <DateTimePicker
                    value={getDateFromTime(value)}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleTimeChange}
                    locale="he-IL"
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    button: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    content: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    label: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'right',
    },
    labelDisabled: {
        color: '#9CA3AF',
    },
    time: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6366F1',
        minWidth: 50,
        textAlign: 'left',
    },
    timeDisabled: {
        color: '#9CA3AF',
    },
});

export default TimePicker;
