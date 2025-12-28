import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface IntervalPickerProps {
    value: number;
    options: number[];
    unit: string;
    onChange: (value: number) => void;
    disabled?: boolean;
}

export const IntervalPicker: React.FC<IntervalPickerProps> = ({
    value,
    options,
    unit,
    onChange,
    disabled = false,
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>כל {unit}:</Text>
            <View style={styles.optionsContainer}>
                {options.map((option) => {
                    const isSelected = option === value;
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.optionButton,
                                isSelected && styles.optionButtonSelected,
                                disabled && styles.optionButtonDisabled,
                            ]}
                            onPress={() => !disabled && onChange(option)}
                            activeOpacity={0.7}
                            disabled={disabled}
                        >
                            <Text
                                style={[
                                    styles.optionText,
                                    isSelected && styles.optionTextSelected,
                                    disabled && styles.optionTextDisabled,
                                ]}
                            >
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 10,
        textAlign: 'right',
    },
    optionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap', // Allow wrapping
        gap: 10,
        justifyContent: 'flex-end',
    },
    optionButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionButtonSelected: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    optionButtonDisabled: {
        opacity: 0.4,
    },
    optionText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#374151',
    },
    optionTextSelected: {
        color: '#fff',
    },
    optionTextDisabled: {
        color: '#9CA3AF',
    },
});

export default IntervalPicker;
