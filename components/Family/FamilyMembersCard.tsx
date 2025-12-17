import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native';
import { Users, UserPlus, Crown, Eye, Edit3, Trash2, LogOut, Link } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useFamily } from '../../hooks/useFamily';
import { FamilyRole } from '../../services/familyService';
import { auth } from '../../services/firebaseConfig';

interface FamilyMembersCardProps {
    onInvitePress: () => void;
    onJoinPress: () => void;
    onGuestInvitePress?: () => void;
}

const ROLE_CONFIG: Record<FamilyRole, { label: string; icon: any; color: string; bgColor: string; gradient: [string, string] }> = {
    admin: { label: 'מנהל', icon: Crown, color: '#F59E0B', bgColor: '#FEF3C7', gradient: ['#FBBF24', '#F59E0B'] },
    member: { label: 'חבר', icon: Edit3, color: '#6366F1', bgColor: '#E0E7FF', gradient: ['#818CF8', '#6366F1'] },
    viewer: { label: 'צופה', icon: Eye, color: '#10B981', bgColor: '#D1FAE5', gradient: ['#34D399', '#10B981'] },
    guest: { label: 'אורח', icon: Eye, color: '#F59E0B', bgColor: '#FEF3C7', gradient: ['#FBBF24', '#F59E0B'] },
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
            'בטוח שברצונך לעזוב? לא תוכל לראות יותר את התיעודים',
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

    // No family yet - show setup card
    if (!family) {
        return (
            <View style={styles.card}>
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconWrapper}>
                        <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={styles.emptyIconGradient}
                        >
                            <Users size={32} color="#fff" />
                        </LinearGradient>
                    </View>

                    <Text style={styles.emptyTitle}>שיתוף משפחתי</Text>
                    <Text style={styles.emptyDescription}>
                        שתפו את המעקב אחרי התינוק עם בן/בת הזוג, סבא וסבתא או המטפלת
                    </Text>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={onInvitePress}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#6366F1', '#4F46E5']}
                            style={styles.primaryButtonGradient}
                        >
                            <UserPlus size={20} color="#fff" />
                            <Text style={styles.primaryButtonText}>הזמן לצפייה משותפת</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={onJoinPress}>
                        <Link size={16} color="#6366F1" />
                        <Text style={styles.secondaryButtonText}>יש לי קוד הזמנה</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Has family - show members
    return (
        <View style={styles.card}>
            {/* Header with gradient */}
            <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerIcon}>
                        <Users size={20} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>משפחת {family.babyName}</Text>
                        <Text style={styles.headerSubtitle}>{members.length} חברים משותפים</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Members list */}
            <View style={styles.membersContainer}>
                {members.map((member, index) => {
                    const config = ROLE_CONFIG[member.role];
                    const Icon = config.icon;
                    const isMe = member.id === auth.currentUser?.uid;

                    return (
                        <View
                            key={member.id || index}
                            style={[
                                styles.memberRow,
                                index === members.length - 1 && { borderBottomWidth: 0 }
                            ]}
                        >
                            <View style={styles.memberLeft}>
                                <LinearGradient
                                    colors={config.gradient}
                                    style={styles.memberIcon}
                                >
                                    <Icon size={16} color="#fff" />
                                </LinearGradient>
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>
                                        {member.name || 'משתמש'}
                                        {isMe && <Text style={styles.meTag}> (אני)</Text>}
                                    </Text>
                                    <Text style={[styles.memberRole, { color: config.color }]}>
                                        {config.label}
                                    </Text>
                                </View>
                            </View>

                            {isAdmin && !isMe && (
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => handleRemoveMember(member.id!, member.name)}
                                >
                                    <Trash2 size={16} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                        </View>
                    );
                })}
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
                {isAdmin && (
                    <TouchableOpacity
                        style={styles.inviteButton}
                        onPress={onInvitePress}
                        activeOpacity={0.8}
                    >
                        <UserPlus size={18} color="#6366F1" />
                        <Text style={styles.inviteButtonText}>הזמן עוד חברים</Text>
                    </TouchableOpacity>
                )}

                {/* Join with code - always visible */}
                <TouchableOpacity
                    style={[styles.inviteButton, { backgroundColor: '#ECFDF5', marginTop: isAdmin ? 8 : 0 }]}
                    onPress={onJoinPress}
                    activeOpacity={0.8}
                >
                    <Link size={18} color="#10B981" />
                    <Text style={[styles.inviteButtonText, { color: '#10B981' }]}>הצטרף עם קוד</Text>
                </TouchableOpacity>

                {/* Guest Invite Button - Large Green */}
                {onGuestInvitePress && (
                    <TouchableOpacity
                        style={[styles.guestInviteButton, { marginTop: 8 }]}
                        onPress={onGuestInvitePress}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#10B981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.guestInviteGradient}
                        >
                            <UserPlus size={20} color="#fff" strokeWidth={2.5} />
                            <Text style={styles.guestInviteText}>הזמן אורח</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {!isAdmin && (
                    <TouchableOpacity
                        style={[styles.leaveButton, { marginTop: 8 }]}
                        onPress={handleLeaveFamily}
                        activeOpacity={0.8}
                    >
                        <LogOut size={18} color="#EF4444" />
                        <Text style={styles.leaveButtonText}>עזוב משפחה</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },

    // Empty state
    emptyContainer: {
        padding: 28,
        alignItems: 'center',
    },
    emptyIconWrapper: {
        marginBottom: 16,
    },
    emptyIconGradient: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    primaryButton: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 12,
    },
    primaryButtonGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    secondaryButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
    },

    // Header with members
    header: {
        padding: 16,
    },
    headerContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'right',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'right',
    },

    // Members
    membersContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    memberRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    memberLeft: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    memberIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberInfo: {
        alignItems: 'flex-end',
    },
    memberName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    meTag: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '400',
    },
    memberRole: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    removeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEE2E2',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Actions
    actionsContainer: {
        padding: 16,
        paddingTop: 8,
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EEF2FF',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    inviteButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6366F1',
        flex: 1,
        textAlign: 'right',
    },
    leaveButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        paddingVertical: 14,
        borderRadius: 12,
    },
    leaveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
    },
    // Guest Invite Button
    guestInviteButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    guestInviteGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 10,
    },
    guestInviteText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
        textAlign: 'right',
    },
});

export default FamilyMembersCard;
