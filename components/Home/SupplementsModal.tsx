import React, { memo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, TouchableWithoutFeedback } from 'react-native';
import { Sun, Droplet, Check, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { MedicationsState } from '../../types/home';

interface SupplementsModalProps {
    visible: boolean;
    onClose: () => void;
    meds: MedicationsState;
    onToggle: (type: 'vitaminD' | 'iron') => void;
}

const SupplementsModal = memo(({ visible, onClose, meds, onToggle }: SupplementsModalProps) => {
    if (!visible) return null;

    const handleToggle = (type: 'vitaminD' | 'iron') => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onToggle(type);
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.header}>
                                <Text style={styles.title}>תוספי תזונה יומיים 💊</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <X size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.buttonsRow}>
                                {/* Vitamin D */}
                                <TouchableOpacity
                                    style={[
                                        styles.medBtn,
                                        meds.vitaminD && styles.medBtnDone
                                    ]}
                                    onPress={() => handleToggle('vitaminD')}
                                    activeOpacity={0.8}
                                >
                                    {meds.vitaminD ? (
                                        <LinearGradient colors={['#38BDF8', '#0EA5E9']} style={styles.medIconDone}>
                                            <Check size={32} color="#fff" />
                                        </LinearGradient>
                                    ) : (
                                        <View style={styles.medIcon}>
                                            <Sun size={32} color="#F59E0B" />
                                        </View>
                                    )}
                                    <Text style={[
                                        styles.medText,
                                        meds.vitaminD && styles.medTextDone
                                    ]}>ויטמין D</Text>
                                </TouchableOpacity>

                                {/* Iron */}
                                <TouchableOpacity
                                    style={[
                                        styles.medBtn,
                                        meds.iron && styles.medBtnDone
                                    ]}
                                    onPress={() => handleToggle('iron')}
                                    activeOpacity={0.8}
                                >
                                    {meds.iron ? (
                                        <LinearGradient colors={['#38BDF8', '#0EA5E9']} style={styles.medIconDone}>
                                            <Check size={32} color="#fff" />
                                        </LinearGradient>
                                    ) : (
                                        <View style={styles.medIcon}>
                                            <Droplet size={32} color="#EF4444" />
                                        </View>
                                    )}
                                    <Text style={[
                                        styles.medText,
                                        meds.iron && styles.medTextDone
                                    ]}>ברזל</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.hint}>לחצו לסימון ביצוע ✅</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    closeBtn: {
        padding: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
    },
    buttonsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 20,
    },
    medBtn: {
        width: 120,
        height: 140,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    medBtnDone: {
        backgroundColor: '#E0F2FE', // Sky-100
        borderColor: '#0EA5E9',     // Sky-500
    },
    medIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    medIconDone: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    medText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4B5563',
    },
    medTextDone: {
        color: '#0284C7', // Sky-700
    },
    hint: {
        textAlign: 'center',
        color: '#9CA3AF',
        fontSize: 13,
    },
});

export default SupplementsModal;
