import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { Users, UserPlus, Crown, Eye, Trash2, LogOut, Link, ChevronLeft, Pencil, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFamily } from '../../hooks/useFamily';
import { FamilyRole } from '../../services/familyService';
import { auth } from '../../services/firebaseConfig';

interface FamilyMembersCardProps {
    onInvitePress: () => void;
    onJoinPress: () => void;
    onGuestInvitePress?: () => void;
    onEditFamilyName?: () => void;
}

const ROLE_CONFIG: Record<FamilyRole, { label: string; color: string }> = {
    admin: { label: 'מנהל', color: '#F59E0B' },
    member: { label: 'חבר', color: '#6366F1' },
    viewer: { label: 'צופה', color: '#10B981' },
    guest: { label: 'אורח', color: '#F59E0B' },
};

export const FamilyMembersCard: React.FC<FamilyMembersCardProps> = ({
    onInvitePress,
    onJoinPress,
    onGuestInvitePress,
    onEditFamilyName,
}) => {
    const { family, members, isAdmin, remove, leave } = useFamily();

    const handleRemoveMember = (memberId: string, memberName: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'הסרת חבר',
            `להסיר את ${memberName}?`,
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'הסר',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await remove(memberId);
                        if (success && Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
            ]
        );
    };

    const handleLeaveFamily = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'עזיבת משפחה',
            'בטוח שברצונך לעזוב?',
            [
                { text: 'ביטול', style: 'cancel' },
                {
                    text: 'עזוב',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await leave();
                        if (success && Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
            ]
        );
    };

    // No family yet - simple options
    if (!family) {
        return (
            <View style={styles.container}>
                <TouchableOpacity
                    style={styles.simpleRow}
                    onPress={onInvitePress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={16} color="#D1D5DB" />
                    <Text style={styles.simpleRowText}>צור משפחה</Text>
                    <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                        <UserPlus size={16} color="#6366F1" />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.simpleRow}
                    onPress={onJoinPress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={16} color="#D1D5DB" />
                    <Text style={styles.simpleRowText}>הצטרף עם קוד</Text>
                    <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                        <Link size={16} color="#10B981" />
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    // Has family - clean minimal view
    return (
        <View style={styles.container}>
            {/* Family Header - Simple */}
            <View style={styles.header}>
                <View style={styles.headerRight}>
                    <Text style={styles.familyName}>משפחת {family.babyName}</Text>
                    <Text style={styles.memberCount}>{members.length} חברים</Text>
                </View>
                {isAdmin && onEditFamilyName && (
                    <TouchableOpacity
                        onPress={onEditFamilyName}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.editBtn}
                    >
                        <Pencil size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Members - Compact chips */}
            <View style={styles.membersSection}>
                {members.map((member, index) => {
                    const config = ROLE_CONFIG[member.role];
                    const isMe = member.id === auth.currentUser?.uid;
                    const initial = (member.name || 'מ').charAt(0).toUpperCase();

                    return (
                        <View key={member.id || index} style={styles.memberChip}>
                            <View style={[styles.chipAvatar, { backgroundColor: config.color + '20' }]}>
                                <Text style={[styles.chipInitial, { color: config.color }]}>
                                    {initial}
                                </Text>
                            </View>
                            <View style={styles.chipInfo}>
                                <Text style={styles.chipName} numberOfLines={1}>
                                    {member.name || 'משתמש'}{isMe ? ' (אני)' : ''}
                                </Text>
                                <Text style={[styles.chipRole, { color: config.color }]}>
                                    {config.label}
                                </Text>
                            </View>
                            {isAdmin && !isMe && (
                                <TouchableOpacity
                                    onPress={() => handleRemoveMember(member.id!, member.name)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Trash2 size={14} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Actions Section - Separate from family display */}
            <View style={styles.actionsSection}>
                {isAdmin && (
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={onInvitePress}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={16} color="#D1D5DB" />
                        <Text style={styles.actionText}>הזמנה למשפחה</Text>
                        <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                            <UserPlus size={14} color="#6366F1" />
                        </View>
                    </TouchableOpacity>
                )}

                {onGuestInvitePress && (
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={onGuestInvitePress}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={16} color="#D1D5DB" />
                        <Text style={styles.actionText}>הזמן אורח</Text>
                        <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                            <Users size={14} color="#10B981" />
                        </View>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={onJoinPress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={16} color="#D1D5DB" />
                    <Text style={styles.actionText}>הצטרף עם קוד</Text>
                    <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
                        <Link size={14} color="#F59E0B" />
                    </View>
                </TouchableOpacity>

                {!isAdmin && (
                    <TouchableOpacity
                        style={styles.actionRow}
                        onPress={handleLeaveFamily}
                        activeOpacity={0.7}
                    >
                        <ChevronLeft size={16} color="#D1D5DB" />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>עזוב משפחה</Text>
                        <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                            <LogOut size={14} color="#EF4444" />
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
    },

    // Simple row for no-family state
    simpleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    simpleRowText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'right',
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    familyName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    memberCount: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 2,
    },
    editBtn: {
        padding: 8,
    },

    // Members section
    membersSection: {
        gap: 8,
        marginBottom: 16,
    },
    memberChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 10,
        gap: 10,
    },
    chipAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipInitial: {
        fontSize: 14,
        fontWeight: '700',
    },
    chipInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    chipName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    chipRole: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 12,
    },

    // Actions section
    actionsSection: {
        gap: 4,
    },
    actionRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
    },
    actionIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
        textAlign: 'right',
    },
});

export default FamilyMembersCard;
