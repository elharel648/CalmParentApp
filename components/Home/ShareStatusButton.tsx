import React, { memo, useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Share2, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface ShareStatusButtonProps {
    onShare: () => Promise<void>;
}

/**
 * Share status button with success feedback
 */
const ShareStatusButton = memo<ShareStatusButtonProps>(({ onShare }) => {
    const [showSuccess, setShowSuccess] = useState(false);

    const handlePress = useCallback(async () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        try {
            await onShare();
            setShowSuccess(true);

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            setTimeout(() => setShowSuccess(false), 2000);
        } catch (e) {
            // Silent fail
        }
    }, [onShare]);

    return (
        <TouchableOpacity
            style={[styles.handoffButton, showSuccess && styles.successButton]}
            onPress={handlePress}
            accessibilityLabel="שתף סטטוס משמרת לוואטסאפ"
            accessibilityRole="button"
        >
            {showSuccess ? (
                <>
                    <CheckCircle size={20} color="#10B981" />
                    <Text style={[styles.handoffText, { color: '#10B981' }]}>שותף בהצלחה!</Text>
                </>
            ) : (
                <>
                    <Share2 size={20} color="#4f46e5" />
                    <Text style={styles.handoffText}>שתף סטטוס משמרת (וואטסאפ)</Text>
                </>
            )}
        </TouchableOpacity>
    );
});

ShareStatusButton.displayName = 'ShareStatusButton';

const styles = StyleSheet.create({
    handoffButton: {
        flexDirection: 'row-reverse',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        borderWidth: 2,
        borderColor: '#e5e7eb',
    },
    successButton: {
        borderColor: '#10B981',
        backgroundColor: '#ECFDF5',
    },
    handoffText: {
        color: '#4f46e5',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 10,
    },
});

export default ShareStatusButton;
