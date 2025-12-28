import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Modal, Alert } from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Types
interface Review {
    user: string;
    text: string;
    rating?: number;
}

interface SitterData {
    id: string;
    name: string;
    age: number;
    image: string;
    rating: number;
    reviews: number;
    reviewsList?: Review[];
    price: number;
    distance: number;
    phone?: string;
    bio?: string;
}

type RootStackParamList = {
    SitterProfile: { sitterData: SitterData };
    ChatScreen: { sitterName: string; sitterImage: string };
};

type SitterProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'SitterProfile'>;

const SitterProfileScreen = ({ route, navigation }: SitterProfileScreenProps) => {
    const { sitterData } = route.params || {};
    const [showFullVideo, setShowFullVideo] = useState(false);

    // Extended data (in reality would come from database)
    const extendedData = {
        ...sitterData,
        responseRate: '100%',
        repeatHires: 12,
        gallery: [
            'https://images.pexels.com/photos/1741230/pexels-photo-1741230.jpeg',
            'https://images.pexels.com/photos/3845492/pexels-photo-3845492.jpeg',
            'https://images.pexels.com/photos/5426401/pexels-photo-5426401.jpeg',
        ],
        videoUri: 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4',
    };

    if (!sitterData) return null;

    const handleCall = () => {
        if (sitterData.phone) {
            Linking.openURL(`tel:${sitterData.phone}`);
        } else {
            Alert.alert('שים לב', 'מספר טלפון לא זמין');
        }
    };

    const handleWhatsApp = () => {
        const cleanPhone = sitterData.phone ? sitterData.phone.replace(/\D/g, '') : '';
        const formattedPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone;
        const message = `היי ${sitterData.name}, הגעתי דרך CalmParent, אשמח לשמוע פרטים :)`;
        const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => Alert.alert('שגיאה', 'וואצאפ לא מותקן'));
    };

    const handleChat = () => {
        navigation.navigate('ChatScreen', {
            sitterName: sitterData.name,
            sitterImage: sitterData.image
        });
    };

    return (
        <View style={styles.container}>
            {/* Back button */}
            <View style={styles.topNav}>
                <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-forward" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Video Hero */}
                <View style={styles.heroContainer}>
                    <Video
                        style={styles.heroVideo}
                        source={{ uri: extendedData.videoUri }}
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        shouldPlay
                        isMuted
                    />
                    <View style={styles.heroOverlay} />

                    <View style={styles.heroContent}>
                        <View style={styles.avatarContainer}>
                            <Image source={{ uri: sitterData.image }} style={styles.profileAvatar} />
                            <View style={styles.verifiedBadge}>
                                <MaterialIcons name="verified" size={20} color="#6366F1" />
                            </View>
                        </View>
                        <Text style={styles.heroName}>{sitterData.name}, {sitterData.age}</Text>
                        <View style={styles.ratingTag}>
                            <Ionicons name="star" size={14} color="#FBBF24" />
                            <Text style={styles.ratingText}>{sitterData.rating} ({sitterData.reviews} ביקורות)</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.playFullBtn} onPress={() => setShowFullVideo(true)}>
                        <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.95)" />
                        <Text style={styles.playText}>נגן היכרות</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={styles.trustRow}>
                    <View style={styles.trustItem}>
                        <Text style={styles.trustValue}>{extendedData.repeatHires}+</Text>
                        <Text style={styles.trustLabel}>הזמנות חוזרות</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.trustItem}>
                        <Text style={styles.trustValue}>{sitterData.distance} ק"מ</Text>
                        <Text style={styles.trustLabel}>מרחק ממך</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.trustItem}>
                        <Text style={styles.trustValue}>{extendedData.responseRate}</Text>
                        <Text style={styles.trustLabel}>אחוז תגובה</Text>
                    </View>
                </View>

                {/* About & Gallery */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>קצת עליי</Text>
                    <Text style={styles.bioText}>
                        {sitterData.bio || "היי! אני סטודנטית לחינוך, יש לי ניסיון של 4 שנים. אני מביאה איתי תיק הפעלות ואוהבת יצירה."}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                        {extendedData.gallery.map((img, index) => (
                            <Image key={index} source={{ uri: img }} style={styles.galleryImg} />
                        ))}
                    </ScrollView>
                </View>

                {/* Reviews */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>מה ההורים אומרים</Text>
                    {sitterData.reviewsList && sitterData.reviewsList.length > 0 ? (
                        sitterData.reviewsList.map((review, i) => (
                            <View key={i} style={styles.reviewCard}>
                                <View style={styles.reviewHeader}>
                                    <Text style={styles.reviewerName}>{review.user}</Text>
                                    {review.rating && (
                                        <View style={styles.reviewRating}>
                                            <Ionicons name="star" size={12} color="#FBBF24" />
                                            <Text style={styles.reviewRatingText}>{review.rating}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.reviewBody}>"{review.text}"</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyReviews}>
                            <Ionicons name="chatbubble-outline" size={32} color="#D1D5DB" />
                            <Text style={styles.emptyReviewsText}>אין ביקורות עדיין</Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View style={styles.stickyFooter}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>מחיר לשעה</Text>
                    <Text style={styles.priceValue}>₪{sitterData.price}</Text>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
                        <Ionicons name="call" size={20} color="#6366F1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconBtn} onPress={handleChat}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="#6366F1" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
                        <FontAwesome5 name="whatsapp" size={18} color="#fff" />
                        <Text style={styles.whatsappText}>וואצאפ</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Video Modal */}
            <Modal visible={showFullVideo} animationType="slide" presentationStyle="fullScreen">
                <View style={styles.videoModal}>
                    <TouchableOpacity style={styles.closeVideoBtn} onPress={() => setShowFullVideo(false)}>
                        <Ionicons name="close-circle" size={44} color="#fff" />
                    </TouchableOpacity>
                    <Video
                        style={styles.fullVideo}
                        source={{ uri: extendedData.videoUri }}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={showFullVideo}
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff'
    },
    scrollContent: {
        paddingBottom: 180,
    },
    topNav: {
        position: 'absolute',
        top: 54,
        right: 20,
        zIndex: 100
    },
    navBtn: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    // Hero
    heroContainer: {
        height: 340,
        width: '100%',
        position: 'relative',
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    heroVideo: {
        ...StyleSheet.absoluteFillObject
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)'
    },
    heroContent: {
        alignItems: 'center',
        marginBottom: 24
    },
    avatarContainer: {
        position: 'relative',
    },
    profileAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff'
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: -4,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 2,
    },
    heroName: {
        fontSize: 26,
        fontWeight: '800',
        color: '#fff',
        marginTop: 12
    },
    ratingTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 8,
        gap: 4
    },
    ratingText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13
    },
    playFullBtn: {
        position: 'absolute',
        top: '35%',
        alignItems: 'center'
    },
    playText: {
        color: '#fff',
        fontWeight: '600',
        marginTop: 4,
        fontSize: 13,
    },

    // Stats
    trustRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-evenly',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    trustItem: {
        alignItems: 'center'
    },
    trustValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937'
    },
    trustLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 32,
        backgroundColor: '#E5E7EB'
    },

    // Sections
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
        textAlign: 'right'
    },
    bioText: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 24,
        textAlign: 'right'
    },
    galleryScroll: {
        marginTop: 16,
        flexDirection: 'row-reverse'
    },
    galleryImg: {
        width: 110,
        height: 110,
        borderRadius: 14,
        marginLeft: 10
    },

    // Reviews
    reviewCard: {
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10
    },
    reviewHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewerName: {
        fontWeight: '600',
        color: '#1F2937',
        fontSize: 14,
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    reviewRatingText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    reviewBody: {
        textAlign: 'right',
        color: '#4B5563',
        fontSize: 14,
        fontStyle: 'italic',
        lineHeight: 22,
    },
    emptyReviews: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    emptyReviewsText: {
        color: '#9CA3AF',
        marginTop: 8,
        fontSize: 14,
    },

    // Footer
    stickyFooter: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
    },
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'right'
    },
    priceValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
        textAlign: 'right'
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10
    },
    iconBtn: {
        width: 48,
        height: 48,
        backgroundColor: '#EEF2FF',
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    whatsappBtn: {
        flexDirection: 'row',
        backgroundColor: '#25D366',
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
    },
    whatsappText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14
    },

    // Video Modal
    videoModal: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    closeVideoBtn: {
        position: 'absolute',
        top: 54,
        right: 20,
        zIndex: 10
    },
    fullVideo: {
        width: '100%',
        height: 400,
    },
});

export default SitterProfileScreen;
