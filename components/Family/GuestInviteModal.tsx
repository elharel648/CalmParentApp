import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Share,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, UserPlus, Copy, Share2, Clock, CheckCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { createGuestInvite } from '../../services/familyService';
import { useTheme } from '../../context/ThemeContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    childId: string;
    childName: string;
    familyId: string;
}

const GuestInviteModal: React.FC<Props> = ({ visible, onClose, childId, childName, familyId }) => {
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreateInvite = async () => {
        setIsLoading(true);
        try {
            const result = await createGuestInvite(childId, familyId, 24);
            if (result) {
                setInviteCode(result.code);
                setExpiresAt(result.expiresAt);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert('שגיאה', 'לא הצלחנו ליצור קוד הזמנה');
            }
        } catch (error) {
            Alert.alert('שגיאה', 'משהו השתבש');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!inviteCode) return;
        await Clipboard.setStringAsync(inviteCode);
        setCopied(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (!inviteCode) return;
        try {
            await Share.share({
                message: `הוזמנת לצפות ב${childName}! 👶\n\nקוד ההזמנה שלך: ${inviteCode}\n\nהורד את האפליקציה והזן את הקוד.`,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const formatExpiry = (date: Date) => {
        const hours = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
        return `${hours} שעות`;
    };

    // Reset when modal closes
    useEffect(() => {
        if (!visible) {
            setInviteCode(null);
            setExpiresAt(null);
            setCopied(false);
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: theme.textPrimary }]}>
                            הזמן אורח
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Icon */}
                    <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.iconContainer}
                    >
                        <UserPlus size={32} color="#fff" />
                    </LinearGradient>

                    {/* Description */}
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        צור קוד הזמנה לבייביסיטר או בן משפחה.{'\n'}
                        האורח יוכל לבצע פעולות אבל לא לראות דוחות.
                    </Text>

                    {!inviteCode ? (
                        /* Create Button */
                        <TouchableOpacity
                            style={styles.createBtn}
                            onPress={handleCreateInvite}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={['#6366F1', '#4F46E5']}
                                style={styles.createBtnGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.createBtnText}>צור קוד הזמנה</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        /* Code Display */
                        <View style={styles.codeSection}>
                            <View style={[styles.codeBox, { backgroundColor: theme.background }]}>
                                <Text style={[styles.codeText, { color: theme.textPrimary }]}>
                                    {inviteCode}
                                </Text>
                            </View>

                            {/* Expiry */}
                            {expiresAt && (
                                <View style={styles.expiryRow}>
                                    <Clock size={14} color={theme.textSecondary} />
                                    <Text style={[styles.expiryText, { color: theme.textSecondary }]}>
                                        תקף ל-{formatExpiry(expiresAt)}
                                    </Text>
                                </View>
                            )}

                            {/* Actions */}
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: copied ? '#10B981' : '#EEF2FF' }]}
                                    onPress={handleCopy}
                                >
                                    {copied ? (
                                        <CheckCircle size={20} color="#fff" />
                                    ) : (
                                        <Copy size={20} color="#6366F1" />
                                    )}
                                    <Text style={[styles.actionText, { color: copied ? '#fff' : '#6366F1' }]}>
                                        {copied ? 'הועתק!' : 'העתק'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]}
                                    onPress={handleShare}
                                >
                                    <Share2 size={20} color="#10B981" />
                                    <Text style={[styles.actionText, { color: '#10B981' }]}>
                                        שתף
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    closeBtn: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    createBtn: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    createBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    createBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    codeSection: {
        alignItems: 'center',
    },
    codeBox: {
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 16,
        marginBottom: 12,
    },
    codeText: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: 8,
    },
    expiryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 20,
    },
    expiryText: {
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default GuestInviteModal;
