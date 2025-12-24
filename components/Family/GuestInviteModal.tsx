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
    ScrollView,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, UserPlus, Copy, Share2, Clock, CheckCircle, Check, Users, Baby } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { createGuestInvite } from '../../services/familyService';
import { useTheme } from '../../context/ThemeContext';
import { useActiveChild, ActiveChild } from '../../context/ActiveChildContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    familyId: string;
}

type Step = 'select' | 'code';

const GuestInviteModal: React.FC<Props> = ({ visible, onClose, familyId }) => {
    const { theme } = useTheme();
    const { allChildren } = useActiveChild();

    const [step, setStep] = useState<Step>('select');
    const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [copied, setCopied] = useState(false);

    const toggleChild = (childId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectedChildren.includes(childId)) {
            setSelectedChildren(prev => prev.filter(id => id !== childId));
            setSelectAll(false);
        } else {
            const newSelected = [...selectedChildren, childId];
            setSelectedChildren(newSelected);
            if (newSelected.length === allChildren.length) {
                setSelectAll(true);
            }
        }
    };

    const toggleSelectAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (selectAll) {
            setSelectedChildren([]);
            setSelectAll(false);
        } else {
            setSelectedChildren(allChildren.map(c => c.childId));
            setSelectAll(true);
        }
    };

    const handleCreateInvite = async () => {
        if (selectedChildren.length === 0) {
            Alert.alert('שגיאה', 'יש לבחור לפחות ילד אחד');
            return;
        }

        setIsLoading(true);
        try {
            // For now, we'll use the first selected child as the primary
            // In the future, the service can be updated to support multiple children
            const result = await createGuestInvite(selectedChildren[0], familyId, 24);
            if (result) {
                setInviteCode(result.code);
                setExpiresAt(result.expiresAt);
                setStep('code');
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
        const childNames = allChildren
            .filter(c => selectedChildren.includes(c.childId))
            .map(c => c.childName)
            .join(', ');
        try {
            await Share.share({
                message: `הוזמנת לצפות ב${childNames}! 👶\n\nקוד ההזמנה שלך: ${inviteCode}\n\nהורד את האפליקציה והזן את הקוד.`,
            });
        } catch (error) {
            if (__DEV__) console.log('Share error:', error);
        }
    };

    const formatExpiry = (date: Date) => {
        const hours = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
        return `${hours} שעות`;
    };

    // Reset when modal closes
    useEffect(() => {
        if (!visible) {
            setStep('select');
            setSelectedChildren([]);
            setSelectAll(false);
            setInviteCode(null);
            setExpiresAt(null);
            setCopied(false);
        }
    }, [visible]);

    const renderChildItem = (child: ActiveChild) => {
        const isSelected = selectedChildren.includes(child.childId);
        return (
            <TouchableOpacity
                key={child.childId}
                style={[
                    styles.childItem,
                    {
                        backgroundColor: isSelected ? '#EEF2FF' : theme.background,
                        borderColor: isSelected ? '#6366F1' : '#E5E7EB',
                    }
                ]}
                onPress={() => toggleChild(child.childId)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.checkbox,
                    {
                        backgroundColor: isSelected ? '#6366F1' : 'transparent',
                        borderColor: isSelected ? '#6366F1' : '#D1D5DB',
                    }
                ]}>
                    {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>

                <View style={styles.childInfo}>
                    <Text style={[styles.childName, { color: theme.textPrimary }]}>
                        {child.childName}
                    </Text>
                </View>

                {child.photoUrl ? (
                    <Image source={{ uri: child.photoUrl }} style={styles.childAvatar} />
                ) : (
                    <View style={[styles.childAvatarPlaceholder, { backgroundColor: '#EEF2FF' }]}>
                        <Baby size={18} color="#6366F1" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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

                    {step === 'select' ? (
                        <>
                            {/* Icon */}
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.iconContainer}
                            >
                                <UserPlus size={32} color="#fff" />
                            </LinearGradient>

                            {/* Description */}
                            <Text style={[styles.description, { color: theme.textSecondary }]}>
                                בחר אילו ילדים האורח יוכל לצפות
                            </Text>

                            {/* Select All Option */}
                            {allChildren.length > 1 && (
                                <TouchableOpacity
                                    style={[
                                        styles.selectAllBtn,
                                        {
                                            backgroundColor: selectAll ? '#EEF2FF' : theme.background,
                                            borderColor: selectAll ? '#6366F1' : '#E5E7EB',
                                        }
                                    ]}
                                    onPress={toggleSelectAll}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        {
                                            backgroundColor: selectAll ? '#6366F1' : 'transparent',
                                            borderColor: selectAll ? '#6366F1' : '#D1D5DB',
                                        }
                                    ]}>
                                        {selectAll && <Check size={14} color="#fff" strokeWidth={3} />}
                                    </View>
                                    <View style={styles.selectAllContent}>
                                        <Text style={[styles.selectAllText, { color: theme.textPrimary }]}>
                                            כל הילדים
                                        </Text>
                                        <Text style={[styles.selectAllSubtext, { color: theme.textSecondary }]}>
                                            גישה לכל הילדים במשפחה
                                        </Text>
                                    </View>
                                    <Users size={20} color="#6366F1" />
                                </TouchableOpacity>
                            )}

                            {/* Children List */}
                            <ScrollView
                                style={styles.childrenList}
                                showsVerticalScrollIndicator={false}
                            >
                                {allChildren.map(renderChildItem)}
                            </ScrollView>

                            {/* Info Text */}
                            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                                האורח יוכל לצפות במעקב בלבד.{'\n'}
                                ללא גישה לדוחות ובייביסיטר.
                            </Text>

                            {/* Create Button */}
                            <TouchableOpacity
                                style={[
                                    styles.createBtn,
                                    { opacity: selectedChildren.length === 0 ? 0.5 : 1 }
                                ]}
                                onPress={handleCreateInvite}
                                disabled={isLoading || selectedChildren.length === 0}
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
                        </>
                    ) : (
                        <>
                            {/* Code Display Step */}
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.iconContainer}
                            >
                                <CheckCircle size={32} color="#fff" />
                            </LinearGradient>

                            <Text style={[styles.successText, { color: theme.textPrimary }]}>
                                הקוד נוצר בהצלחה!
                            </Text>

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
                        </>
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
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
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
        marginBottom: 20,
    },
    selectAllBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        marginBottom: 12,
        gap: 12,
    },
    selectAllContent: {
        flex: 1,
        alignItems: 'flex-end',
    },
    selectAllText: {
        fontSize: 15,
        fontWeight: '600',
    },
    selectAllSubtext: {
        fontSize: 12,
        marginTop: 2,
    },
    childrenList: {
        maxHeight: 200,
        marginBottom: 16,
    },
    childItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        marginBottom: 8,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    childInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    childName: {
        fontSize: 15,
        fontWeight: '600',
    },
    childAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    childAvatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
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
    successText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
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
