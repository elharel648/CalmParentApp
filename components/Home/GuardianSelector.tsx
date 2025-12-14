import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, CheckCircle, Trophy } from 'lucide-react-native';
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
 * Guardian selector with chips and premium upsell
 */
const GuardianSelector = memo<GuardianSelectorProps>(({
    currentGuardian,
    availableRoles,
    isPremium,
    onSelect,
    onUpgradePress,
    dynamicStyles,
}) => {
    return (
        <View style={styles.guardianSection}>
            <Text style={[styles.sectionTitleSmall, { color: dynamicStyles.text }]}>
                מי אחראי כרגע?
            </Text>

            <View style={styles.guardianRow}>
                {availableRoles.map((role) => {
                    const isActive = currentGuardian === role;
                    return (
                        <TouchableOpacity
                            key={role}
                            style={[styles.guardianChip, isActive && styles.guardianActive]}
                            onPress={() => onSelect(role)}
                            accessibilityLabel={`${role}${isActive ? ', נבחר' : ''}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                        >
                            <User size={16} color={isActive ? '#fff' : '#6B7280'} />
                            <Text style={[styles.guardianText, isActive && styles.guardianTextActive]}>
                                {role}
                            </Text>
                            {isActive && <CheckCircle size={14} color="#fff" style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>
                    );
                })}

                {!isPremium && (
                    <TouchableOpacity
                        style={[styles.guardianChip, styles.premiumPlaceholder]}
                        onPress={onUpgradePress}
                        accessibilityLabel="הוסף אחראי נוסף עם פרימיום"
                        accessibilityRole="button"
                    >
                        <Trophy size={14} color="#4f46e5" />
                        <Text style={styles.premiumPlaceholderText}>הוסף</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

GuardianSelector.displayName = 'GuardianSelector';

const styles = StyleSheet.create({
    guardianSection: {
        marginBottom: 24,
    },
    sectionTitleSmall: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 10,
        textAlign: 'right',
    },
    guardianRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
    },
    guardianChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 6,
    },
    guardianActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    guardianText: {
        fontSize: 14,
        color: '#374151',
        fontWeight: '500',
    },
    guardianTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    premiumPlaceholder: {
        backgroundColor: '#F3E8FF',
        borderColor: '#C4B5FD',
        paddingHorizontal: 12,
    },
    premiumPlaceholderText: {
        color: '#5B21B6',
        fontWeight: '700',
        fontSize: 12,
        marginRight: 2,
    },
});

export default GuardianSelector;
