import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { Users, UserPlus, Crown, Eye, Edit3, Trash2, LogOut, Link, ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFamily } from '../../hooks/useFamily';
import { FamilyRole } from '../../services/familyService';
import { auth } from '../../services/firebaseConfig';

interface FamilyMembersCardProps {
    onInvitePress: () => void;
    onJoinPress: () => void;
    onGuestInvitePress?: () => void;
}

const ROLE_CONFIG: Record<FamilyRole, { label: string; icon: any; color: string }> = {
    admin: { label: 'מנהל', icon: Crown, color: '#F59E0B' },
    member: { label: 'חבר', icon: Edit3, color: '#6366F1' },
    viewer: { label: 'צופה', icon: Eye, color: '#10B981' },
    guest: { label: 'אורח', icon: Eye, color: '#F59E0B' },
};

export const FamilyMembersCard: React.FC<FamilyMembersCardProps> = ({
    onInvitePress,
    onJoinPress,
    onGuestInvitePress,
}) => {
    const { family, members, isAdmin, remove, leave } = useFamily();

    const handleRemoveMember = (memberId: string, memberName: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'הסרת חבר',
            `להסיר את ${memberName} מהמשפחה?`,
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

    // No family yet - show minimal setup
    if (!family) {
        return (
            <View style={styles.container}>
                {/* Create Family */}
                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={onInvitePress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={18} color="#D1D5DB" />
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>צור משפחה</Text>
                        <Text style={styles.actionSubtitle}>הזמן אחרים לצפות בתיעודים</Text>
                    </View>
                    <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                        <UserPlus size={18} color="#6366F1" strokeWidth={2} />
                    </View>
                </TouchableOpacity>

                {/* Join with code */}
                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={onJoinPress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={18} color="#D1D5DB" />
                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>הצטרף עם קוד</Text>
                        <Text style={styles.actionSubtitle}>יש לך קוד הזמנה?</Text>
                    </View>
                    <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                        <Link size={18} color="#10B981" strokeWidth={2} />
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    // Has family - show minimal members list
    return (
        <View style={styles.container}>
            {/* Family Name Header */}
            <View style={styles.familyHeader}>
                <Text style={styles.familySubtitle}>{members.length} חברים</Text>
                <Text style={styles.familyName}>משפחת {family.babyName}</Text>
            </View>

            {/* Members */}
            {members.map((member, index) => {
                const config = ROLE_CONFIG[member.role];
                const isMe = member.id === auth.currentUser?.uid;

                return (
                    <View key={member.id || index} style={styles.memberRow}>
                        {isAdmin && !isMe ? (
                            <TouchableOpacity
                                onPress={() => handleRemoveMember(member.id!, member.name)}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Trash2 size={16} color="#EF4444" />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 16 }} />
                        )}
                        <View style={styles.memberInfo}>
                            <Text style={[styles.memberRole, { color: config.color }]}>
                                {config.label}
                            </Text>
                            <Text style={styles.memberName}>
                                {member.name || 'משתמש'}
                                {isMe && <Text style={styles.meTag}> (אני)</Text>}
                            </Text>
                        </View>
                        <View style={[styles.memberAvatar, { backgroundColor: config.color + '20' }]}>
                            <Text style={[styles.memberInitial, { color: config.color }]}>
                                {(member.name || 'מ').charAt(0)}
                            </Text>
                        </View>
                    </View>
                );
            })}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Actions */}
            {isAdmin && (
                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={onInvitePress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={18} color="#D1D5DB" />
                    <Text style={styles.actionTitle}>הזמן חבר</Text>
                    <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                        <UserPlus size={16} color="#6366F1" strokeWidth={2} />
                    </View>
                </TouchableOpacity>
            )}

            {onGuestInvitePress && (
                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={onGuestInvitePress}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={18} color="#D1D5DB" />
                    <Text style={styles.actionTitle}>הזמן אורח</Text>
                    <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                        <Users size={16} color="#10B981" strokeWidth={2} />
                    </View>
                </TouchableOpacity>
            )}

            {/* Join another family with code */}
            <TouchableOpacity
                style={styles.actionRow}
                onPress={onJoinPress}
                activeOpacity={0.7}
            >
                <ChevronLeft size={18} color="#D1D5DB" />
                <Text style={styles.actionTitle}>הצטרף עם קוד</Text>
                <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Link size={16} color="#F59E0B" strokeWidth={2} />
                </View>
            </TouchableOpacity>

            {!isAdmin && (
                <TouchableOpacity
                    style={styles.actionRow}
                    onPress={handleLeaveFamily}
                    activeOpacity={0.7}
                >
                    <ChevronLeft size={18} color="#D1D5DB" />
                    <Text style={[styles.actionTitle, { color: '#EF4444' }]}>עזוב משפחה</Text>
                    <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                        <LogOut size={16} color="#EF4444" strokeWidth={2} />
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
    },

    // Family Header
    familyHeader: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        alignItems: 'flex-end',
    },
    familyName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    familySubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 2,
    },

    // Member Row
    memberRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberInitial: {
        fontSize: 16,
        fontWeight: '700',
    },
    memberInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    memberName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
    },
    meTag: {
        color: '#9CA3AF',
        fontWeight: '400',
    },
    memberRole: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 8,
    },

    // Action Row
    actionRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    actionTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'right',
    },
    actionSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 1,
    },
});

export default FamilyMembersCard;
