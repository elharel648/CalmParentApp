import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { X, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useBabyProfile } from '../../hooks/useBabyProfile';
import { useActiveChild } from '../../context/ActiveChildContext';
import AlbumCarousel from '../Profile/AlbumCarousel';

interface MagicMomentsModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function MagicMomentsModal({ visible, onClose }: MagicMomentsModalProps) {
    const { theme } = useTheme();
    const { activeChild } = useActiveChild();
    const { baby, updatePhoto } = useBabyProfile(activeChild?.childId);

    const handleClose = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onClose();
    };

    const handleMonthPress = async (month: number) => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        await updatePhoto('album', month);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: theme.card }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={22} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.headerContent}>
                            <Sparkles size={18} color="#A78BFA" strokeWidth={2.5} />
                            <Text style={[styles.title, { color: theme.textPrimary }]}>רגעים קסומים</Text>
                        </View>
                        <View style={{ width: 30 }} />
                    </View>

                    {/* Description */}
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        לחצו על חודש כדי להוסיף תמונה מהרגע הקסום
                    </Text>

                    {/* Album Carousel */}
                    <View style={styles.carouselContainer}>
                        <AlbumCarousel
                            album={baby?.album}
                            onMonthPress={handleMonthPress}
                        />
                    </View>

                    {/* Baby Name */}
                    {baby?.name && (
                        <Text style={[styles.babyName, { color: theme.textPrimary }]}>
                            📸 האלבום של {baby.name}
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        padding: 20,
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    closeBtn: {
        padding: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    description: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 20,
    },
    carouselContainer: {
        marginBottom: 16,
    },
    babyName: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 8,
    },
});
