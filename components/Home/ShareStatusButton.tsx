import React, { memo, useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Linking, View } from 'react-native';
import { Send, Check, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

interface ShareStatusButtonProps {
    onShare: () => Promise<void>;
    message?: string;
}

/**
 * Premium Minimalist Share Button - Inline card style
 */
const ShareStatusButton = memo<ShareStatusButtonProps>(({ onShare, message }) => {
    const { theme } = useTheme();
    const [showSuccess, setShowSuccess] = useState(false);

    const handlePress = useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        try {
            const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message || 'עדכון מ-CalmParent')}`;
            const canOpen = await Linking.canOpenURL(whatsappUrl);

            if (canOpen) {
                await Linking.openURL(whatsappUrl);
                setShowSuccess(true);

                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }

                setTimeout(() => setShowSuccess(false), 2000);
            } else {
                await onShare();
            }
        } catch (e) {
            await onShare();
        }
    }, [onShare, message]);

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: theme.card }]}
            onPress={handlePress}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                {/* Icon */}
                <View style={[
                    styles.iconCircle,
                    { backgroundColor: showSuccess ? '#D1FAE5' : '#DCF8E6' }
                ]}>
                    {showSuccess ? (
                        <Check size={20} color="#10B981" strokeWidth={2.5} />
                    ) : (
                        <MessageCircle size={20} color="#25D366" fill="#25D366" />
                    )}
                </View>

                {/* Text */}
                <View style={styles.textSection}>
                    <Text style={[styles.title, { color: theme.textPrimary }]}>
                        {showSuccess ? 'נשלח בהצלחה!' : 'שתף סיכום יומי'}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                        {showSuccess ? 'ההודעה נשלחה לוואטסאפ' : 'שלח עדכון למשפחה בוואטסאפ'}
                    </Text>
                </View>

                {/* Arrow */}
                <View style={styles.arrow}>
                    <Send size={18} color="#25D366" />
                </View>
            </View>
        </TouchableOpacity>
    );
});

ShareStatusButton.displayName = 'ShareStatusButton';

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        marginBottom: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    content: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textSection: {
        flex: 1,
        marginRight: 14,
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    arrow: {
        opacity: 0.8,
    },
});

export default ShareStatusButton;
