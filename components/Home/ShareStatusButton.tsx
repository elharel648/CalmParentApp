import React, { memo, useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Linking, View } from 'react-native';
import { Send, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

interface ShareStatusButtonProps {
    onShare: () => Promise<void>;
    message?: string;
}

/**
 * Minimalist Share Button - Simple inline design
 */
const ShareStatusButton = memo<ShareStatusButtonProps>(({ onShare, message }) => {
    const { theme } = useTheme();
    const [showSuccess, setShowSuccess] = useState(false);

    const handlePress = useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.6}
        >
            <Send size={16} color="#9CA3AF" strokeWidth={2} />
            <Text style={[styles.text, { color: theme.textSecondary }]}>
                {showSuccess ? 'נשלח!' : 'שתף סיכום יומי'}
            </Text>
            {showSuccess && <Check size={14} color="#10B981" strokeWidth={2.5} />}
        </TouchableOpacity>
    );
});

ShareStatusButton.displayName = 'ShareStatusButton';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        marginBottom: 8,
        paddingVertical: 10,
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
});

export default ShareStatusButton;
