import React, { memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, TouchableWithoutFeedback } from 'react-native';
import { Sun, Droplet, Check, X, Pill } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { MedicationsState } from '../../types/home';
import { useTheme } from '../../context/ThemeContext';

interface SupplementsModalProps {
    visible: boolean;
    onClose: () => void;
    meds: MedicationsState;
    onToggle: (type: 'vitaminD' | 'iron') => void;
    onRefresh?: () => void;
}

const SupplementsModal = memo(({ visible, onClose, meds, onToggle, onRefresh }: SupplementsModalProps) => {
    const { theme } = useTheme();
    if (!visible) return null;

    const handleToggle = (type: 'vitaminD' | 'iron') => {
        const isCurrentlyTaken = meds[type];
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onToggle(type);
        if (!isCurrentlyTaken && onRefresh) {
            setTimeout(onRefresh, 300);
        }
    };

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.iconCircle}>
                                    <Pill size={20} color="#0EA5E9" strokeWidth={2} />
                                </View>
                                <Text style={[styles.title, { color: theme.textPrimary }]}>תוספים יומיים</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <X size={18} color={theme.textSecondary} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>

                            {/* Supplements */}
                            <View style={styles.buttonsRow}>
                                {/* Vitamin D */}
                                <TouchableOpacity
                                    style={[styles.medBtn, meds.vitaminD && styles.medBtnDone]}
                                    onPress={() => handleToggle('vitaminD')}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.medIcon, meds.vitaminD && styles.medIconDone]}>
                                        {meds.vitaminD ? (
                                            <Check size={24} color="#fff" strokeWidth={2.5} />
                                        ) : (
                                            <Sun size={24} color="#F59E0B" strokeWidth={2} />
                                        )}
                                    </View>
                                    <Text style={[styles.medText, meds.vitaminD && styles.medTextDone]}>ויטמין D</Text>
                                </TouchableOpacity>

                                {/* Iron */}
                                <TouchableOpacity
                                    style={[styles.medBtn, meds.iron && styles.medBtnDone]}
                                    onPress={() => handleToggle('iron')}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.medIcon, meds.iron && styles.medIconDone]}>
                                        {meds.iron ? (
                                            <Check size={24} color="#fff" strokeWidth={2.5} />
                                        ) : (
                                            <Droplet size={24} color="#EF4444" strokeWidth={2} />
                                        )}
                                    </View>
                                    <Text style={[styles.medText, meds.iron && styles.medTextDone]}>ברזל</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

SupplementsModal.displayName = 'SupplementsModal';

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        maxWidth: 320,
        borderRadius: 20,
        paddingVertical: 24,
        paddingHorizontal: 20,
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
        elevation: 8,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0F2FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'right',
        marginRight: 12,
    },
    closeBtn: {
        padding: 6,
    },
    buttonsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 16,
    },
    medBtn: {
        width: 110,
        paddingVertical: 20,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    medBtnDone: {
        backgroundColor: '#DCFCE7',
    },
    medIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        shadowColor: '#1F2937',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    medIconDone: {
        backgroundColor: '#22C55E',
    },
    medText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
    },
    medTextDone: {
        color: '#16A34A',
    },
});

export default SupplementsModal;
