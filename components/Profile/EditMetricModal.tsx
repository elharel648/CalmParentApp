import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface EditMetricModalProps {
    visible: boolean;
    title: string;
    unit: string;
    initialValue: string;
    onSave: (value: string) => void;
    onClose: () => void;
}

const EditMetricModal = memo(({
    visible,
    title,
    unit,
    initialValue,
    onSave,
    onClose,
}: EditMetricModalProps) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue, visible]);

    const handleSave = () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onSave(value);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.hugeInput}
                            value={value}
                            onChangeText={setValue}
                            keyboardType="numeric"
                            autoFocus
                        />
                        <Text style={styles.unit}>{unit}</Text>
                    </View>
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.btn, styles.cancelBtn]}
                            onPress={onClose}
                        >
                            <Text>ביטול</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btn, styles.saveBtn]}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveBtnText}>שמור</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

EditMetricModal.displayName = 'EditMetricModal';

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        color: '#1e293b',
    },
    inputRow: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 5,
        marginVertical: 20,
    },
    hugeInput: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#1e293b',
        borderBottomWidth: 2,
        borderBottomColor: '#e2e8f0',
        textAlign: 'center',
        minWidth: 100,
    },
    unit: {
        fontSize: 18,
        color: '#64748b',
        marginBottom: 8,
    },
    btnRow: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    btn: {
        padding: 15,
        borderRadius: 12,
        flex: 1,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#e2e8f0',
    },
    saveBtn: {
        backgroundColor: '#4f46e5',
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default EditMetricModal;
