import React, { useState } from 'react';
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
import { X, TrendingUp, FileText, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';

interface GrowthModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function GrowthModal({ visible, onClose }: GrowthModalProps) {
    const { theme, isDarkMode } = useTheme();
    const { baby, updateStats } = useBabyProfile();

    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [headCircumference, setHeadCircumference] = useState('');
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);

    const handleSave = async () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Save each field if it has a value
        if (weight) await updateStats('weight', weight);
        if (height) await updateStats('height', height);
        if (headCircumference) await updateStats('head', headCircumference);

        // Reset fields
        setWeight('');
        setHeight('');
        setHeadCircumference('');
        setNotes('');
        setShowNotes(false);
        onClose();
    };

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setWeight('');
        setHeight('');
        setHeadCircumference('');
        setNotes('');
        setShowNotes(false);
        onClose();
    };

    const hasValues = weight || height || headCircumference;

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
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={22} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <TrendingUp size={18} color="#10B981" strokeWidth={2.5} />
                            <Text style={[styles.title, { color: theme.textPrimary }]}>מעקב גדילה</Text>
                        </View>
                        <View style={{ width: 30 }} />
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
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
                            disabled={!hasValues}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveBtnText}>שמור מדידה</Text>
                        </TouchableOpacity>
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
        marginBottom: 24,
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
});
