import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface FormFieldProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    autoComplete?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    multiline?: boolean;
    numberOfLines?: number;
    onBlur?: () => void;
}

export default function FormField({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    required,
    autoComplete,
    keyboardType = 'default',
    multiline = false,
    numberOfLines = 1,
    onBlur,
}: FormFieldProps) {
    const { theme } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>
                {label}
                {required && <Text style={{ color: '#EF4444' }}> *</Text>}
            </Text>
            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: theme.card,
                        borderColor: error
                            ? '#EF4444'
                            : isFocused
                            ? theme.primary
                            : theme.border,
                    },
                ]}
            >
                <TextInput
                    style={[
                        styles.input,
                        { color: theme.textPrimary },
                        multiline && styles.inputMultiline,
                    ]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.textSecondary}
                    autoComplete={autoComplete as any}
                    keyboardType={keyboardType}
                    multiline={multiline}
                    numberOfLines={numberOfLines}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => {
                        setIsFocused(false);
                        if (onBlur) onBlur();
                    }}
                />
                {error && (
                    <View style={styles.iconContainer}>
                        <AlertCircle size={16} color="#EF4444" />
                    </View>
                )}
                {!error && value && (
                    <View style={styles.iconContainer}>
                        <CheckCircle size={16} color="#10B981" />
                    </View>
                )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 12,
    },
    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    iconContainer: {
        marginLeft: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
    },
});

