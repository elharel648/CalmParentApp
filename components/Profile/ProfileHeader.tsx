import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Edit2, Camera, ChevronRight } from 'lucide-react-native';

interface ProfileHeaderProps {
    babyName: string;
    babyAgeMonths: number;
    photoUrl?: string;
    onSettingsPress: () => void;
    onBackPress: () => void;
    onPhotoPress: () => void;
    onAgePress: () => void;
}

const ProfileHeader = memo(({
    babyName,
    babyAgeMonths,
    photoUrl,
    onSettingsPress,
    onBackPress,
    onPhotoPress,
    onAgePress,
}: ProfileHeaderProps) => {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4f46e5', '#818cf8']}
                style={StyleSheet.absoluteFill}
            />

            {/* Navbar */}
            <View style={styles.navbar}>
                <TouchableOpacity
                    onPress={onSettingsPress}
                    style={styles.navBtn}
                    accessibilityLabel="הגדרות"
                >
                    <Settings size={20} color="white" />
                </TouchableOpacity>
                <Text style={styles.navTitle}>הבייבי שלי</Text>
                <TouchableOpacity
                    onPress={onBackPress}
                    style={styles.navBtn}
                    accessibilityLabel="חזרה"
                >
                    <ChevronRight size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Profile Section */}
            <View style={styles.profileSection}>
                <TouchableOpacity style={styles.avatarWrapper} onPress={onPhotoPress}>
                    {photoUrl ? (
                        <Image source={{ uri: photoUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarEmoji}>👶</Text>
                        </View>
                    )}
                    <View style={styles.cameraBtn}>
                        <Camera size={12} color="#4f46e5" />
                    </View>
                </TouchableOpacity>

                <View style={styles.nameSection}>
                    <Text style={styles.babyName}>{babyName || 'הבייבי'}</Text>
                    <TouchableOpacity style={styles.agePill} onPress={onAgePress}>
                        <Text style={styles.ageText}>{babyAgeMonths} חודשים</Text>
                        <Edit2 size={10} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

ProfileHeader.displayName = 'ProfileHeader';

const styles = StyleSheet.create({
    container: {
        height: 220,
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    navbar: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    navBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 50,
    },
    navTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    profileSection: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginTop: 30,
        gap: 15,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: 'white',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    avatarEmoji: {
        fontSize: 40,
    },
    cameraBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 6,
        borderRadius: 20,
    },
    nameSection: {
        alignItems: 'flex-end',
    },
    babyName: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    agePill: {
        flexDirection: 'row-reverse',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
        alignItems: 'center',
    },
    ageText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
});

export default ProfileHeader;
