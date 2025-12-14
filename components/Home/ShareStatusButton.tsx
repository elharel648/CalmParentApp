import React, { memo, useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Linking, Alert, View } from 'react-native';
import { Share2, CheckCircle, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface ShareStatusButtonProps {
    onShare: () => Promise<void>;
    message?: string;
}

/**
 * Circular WhatsApp share button
 */
const ShareStatusButton = memo<ShareStatusButtonProps>(({ onShare, message }) => {
    const [showSuccess, setShowSuccess] = useState(false);

    const handlePress = useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        try {
            // Try to open WhatsApp with the message
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
                // Fallback to regular share
                await onShare();
            }
        } catch (e) {
            // Fallback to regular share
            await onShare();
        }
    }, [onShare, message]);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.button, showSuccess && styles.successButton]}
                onPress={handlePress}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={showSuccess ? ['#10B981', '#059669'] : ['#25D366', '#128C7E']}
                    style={styles.gradient}
                >
                    {showSuccess ? (
                        <CheckCircle size={22} color="#fff" />
                    ) : (
                        <MessageCircle size={22} color="#fff" fill="#fff" />
                    )}
                </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.label}>
                {showSuccess ? 'נשלח!' : 'שתף בוואטסאפ'}
            </Text>
        </View>
    );
});

ShareStatusButton.displayName = 'ShareStatusButton';

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 16,
    },
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        shadowColor: '#25D366',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    successButton: {
        shadowColor: '#10B981',
    },
    gradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
});

export default ShareStatusButton;
