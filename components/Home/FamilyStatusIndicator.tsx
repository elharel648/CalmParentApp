// FamilyStatusIndicator.tsx - Shows who's online in the family
import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, Circle } from 'lucide-react-native';
import { useFamily } from '../../hooks/useFamily';
import { subscribeToFamilyPresence, FamilyMemberPresence, setupPresenceListener } from '../../services/presenceService';
import { auth } from '../../services/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

interface FamilyStatusIndicatorProps {
    onPress?: () => void;
}

const FamilyStatusIndicator = memo(({ onPress }: FamilyStatusIndicatorProps) => {
    const { theme } = useTheme();
    const { family } = useFamily();
    const [members, setMembers] = useState<FamilyMemberPresence[]>([]);

    useEffect(() => {
        if (!family?.id) return;

        // Setup presence tracking for current user
        const cleanup = setupPresenceListener(family.id);

        // Subscribe to all family members' presence
        const unsubscribe = subscribeToFamilyPresence(family.id, (presenceList) => {
            setMembers(presenceList);
        });

        return () => {
            cleanup();
            unsubscribe();
        };
    }, [family?.id]);

    // Don't show if no family
    if (!family || members.length === 0) {
        return null;
    }

    const onlineCount = members.filter(m => m.isOnline).length;
    const currentUserId = auth.currentUser?.uid;
    const otherOnline = members.filter(m => m.isOnline && m.userId !== currentUserId);

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.card }]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.content}>
                <View style={styles.iconsRow}>
                    {members.slice(0, 4).map((member, index) => (
                        <View
                            key={member.userId}
                            style={[
                                styles.memberDot,
                                { marginRight: index === 0 ? 0 : -8 },
                                member.isOnline ? styles.online : styles.offline
                            ]}
                        >
                            <Text style={styles.memberInitial}>
                                {member.name.charAt(0).toUpperCase()}
                            </Text>
                            {member.isOnline && (
                                <View style={styles.onlineIndicator} />
                            )}
                        </View>
                    ))}
                </View>

                <View style={styles.textSection}>
                    <Text style={styles.title}>
                        {onlineCount === 1 ? 'רק אתה מחובר' : `${onlineCount} מחוברים`}
                    </Text>
                    {otherOnline.length > 0 && (
                        <Text style={styles.subtitle}>
                            {otherOnline.map(m => m.name).join(', ')} צופה עכשיו
                        </Text>
                    )}
                </View>
            </View>

            <Users size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 20,
        marginBottom: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    content: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    iconsRow: {
        flexDirection: 'row-reverse',
        marginLeft: 12,
    },
    memberDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    online: {
        backgroundColor: '#10B981',
    },
    offline: {
        backgroundColor: '#D1D5DB',
    },
    memberInitial: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#10B981',
        borderWidth: 2,
        borderColor: '#fff',
    },
    textSection: {
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1F2937',
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
});

export default FamilyStatusIndicator;
