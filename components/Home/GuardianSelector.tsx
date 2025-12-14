import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { User, ChevronDown, Check, X, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { GuardianRole } from '../../types/home';

interface GuardianSelectorProps {
    currentGuardian: GuardianRole;
    availableRoles: GuardianRole[];
    isPremium: boolean;
    onSelect: (role: GuardianRole) => void;
    onUpgradePress: () => void;
    dynamicStyles: { text: string };
}

/**
 * Compact guardian selector - single line with modal
 */
const GuardianSelector = memo<GuardianSelectorProps>(({
    currentGuardian,
    availableRoles,
    isPremium,
    onSelect,
    onUpgradePress,
    dynamicStyles,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSelect = (role: GuardianRole) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onSelect(role);
        setIsModalOpen(false);
    };

    const openModal = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setIsModalOpen(true);
    };

    return (
        <>
            {/* Compact Single Line */}
            <TouchableOpacity
                style={styles.container}
                onPress={openModal}
                activeOpacity={0.8}
            >
                <View style={styles.leftSide}>
                    <View style={styles.iconCircle}>
                        <User size={16} color="#6366F1" />
                    </View>
                    <Text style={styles.label}>
                        <Text style={styles.guardianName}>{currentGuardian}</Text>
                        <Text style={styles.suffix}> מטפל/ת עכשיו</Text>
                    </Text>
                </View>
                <View style={styles.changeBtn}>
                    <Text style={styles.changeBtnText}>החלף</Text>
                    <ChevronDown size={14} color="#6366F1" />
                </View>
            </TouchableOpacity>

            {/* Selection Modal */}
            <Modal
                visible={isModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsModalOpen(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsModalOpen(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                                <X size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>מי מטפל/ת עכשיו?</Text>
                            <Users size={20} color="#6366F1" />
                        </View>

                        {availableRoles.map((role) => {
                            const isActive = currentGuardian === role;
                            return (
                                <TouchableOpacity
                                    key={role}
                                    style={[styles.roleOption, isActive && styles.roleOptionActive]}
                                    onPress={() => handleSelect(role)}
                                >
                                    <Text style={[styles.roleText, isActive && styles.roleTextActive]}>
                                        {role}
                                    </Text>
                                    {isActive && <Check size={18} color="#6366F1" />}
                                </TouchableOpacity>
                            );
                        })}

                        {!isPremium && (
                            <TouchableOpacity
                                style={styles.premiumOption}
                                onPress={() => {
                                    setIsModalOpen(false);
                                    onUpgradePress();
                                }}
                            >
                                <Text style={styles.premiumText}>➕ הוסף עוד (פרימיום)</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
});

GuardianSelector.displayName = 'GuardianSelector';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    leftSide: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E0E7FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 14,
    },
    guardianName: {
        fontWeight: '700',
        color: '#1F2937',
    },
    suffix: {
        color: '#6B7280',
    },
    changeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F5F3FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    changeBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6366F1',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '80%',
        maxWidth: 300,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        marginBottom: 8,
    },
    roleOptionActive: {
        backgroundColor: '#E0E7FF',
    },
    roleText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#374151',
    },
    roleTextActive: {
        color: '#6366F1',
        fontWeight: '700',
    },
    premiumOption: {
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#FEF3C7',
        marginTop: 4,
    },
    premiumText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#B45309',
        textAlign: 'center',
    },
});

export default GuardianSelector;
