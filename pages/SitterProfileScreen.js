import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Dimensions, Modal } from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

const SitterProfileScreen = ({ route, navigation }) => {
    const { sitterData } = route.params || {};
    const [showFullVideo, setShowFullVideo] = useState(false);

    // נתונים מורחבים (במציאות יגיעו מהדאטה בייס)
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
        if (sitterData.phone) Linking.openURL(`tel:${sitterData.phone}`);
    };

    const handleWhatsApp = () => {
        const cleanPhone = sitterData.phone ? sitterData.phone.replace(/\D/g, '') : '';
        const formattedPhone = cleanPhone.startsWith('0') ? '972' + cleanPhone.substring(1) : cleanPhone;
        const message = `היי ${sitterData.name}, הגעתי דרך CalmParent, אשמח לשמוע פרטים :)`;
        const url = `whatsapp://send?phone=${formattedPhone}&text=${message}`;
        Linking.openURL(url).catch(() => alert('וואצאפ לא מותקן'));
    };

    // ✅ התיקון: מעבר למסך הצ'אט החדש
    const handleChat = () => {
        navigation.navigate('ChatScreen', { sitterName: sitterData.name, sitterImage: sitterData.image });
    };

    return (
        <View style={styles.container}>

            {/* כפתור חזרה */}
            <View style={styles.topNav}>
                <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-forward" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>

                {/* --- אזור הוידאו --- */}
                <View style={styles.heroContainer}>
                    <Video
                        style={styles.heroVideo}
                        source={{ uri: extendedData.videoUri }}
                        resizeMode={ResizeMode.COVER}
                        isLooping
                        shouldPlay
                        isMuted={true}
                    />
                    <View style={styles.heroOverlay} />

                    <View style={styles.heroContent}>
                        <Image source={{ uri: sitterData.image }} style={styles.profileAvatar} />
                        <View style={styles.verifiedBadge}>
                            <MaterialIcons name="verified" size={20} color="#4f46e5" />
                        </View>
                        <Text style={styles.heroName}>{sitterData.name}, {sitterData.age}</Text>
                        <View style={styles.ratingTag}>
                            <Ionicons name="star" size={14} color="#FFC107" />
                            <Text style={styles.ratingText}>{sitterData.rating} ({sitterData.reviews} ביקורות)</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.playFullBtn} onPress={() => setShowFullVideo(true)}>
                        <Ionicons name="play-circle" size={50} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.playText}>נגן היכרות</Text>
                    </TouchableOpacity>
                </View>

                {/* --- נתונים יבשים --- */}
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
                </View>

                {/* --- אודות וגלריה --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>קצת עליי 🧸</Text>
                    <Text style={styles.bioText}>
                        {sitterData.bio || "היי! אני סטודנטית לחינוך, יש לי ניסיון של 4 שנים. אני מביאה איתי תיק הפעלות ואוהבת יצירה."}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                        {extendedData.gallery.map((img, index) => (
                            <Image key={index} source={{ uri: img }} style={styles.galleryImg} />
                        ))}
                    </ScrollView>
                </View>

                {/* --- ביקורות --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>מה ההורים אומרים</Text>
                    {sitterData.reviewsList?.length > 0 ? (
                        sitterData.reviewsList.map((review, i) => (
                            <View key={i} style={styles.reviewCard}>
                                <Text style={styles.reviewerName}>{review.user}</Text>
                                <Text style={styles.reviewBody}>"{review.text}"</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{ textAlign: 'center', color: '#999', marginTop: 10 }}>אין ביקורות טקסטואליות</Text>
                    )}
                </View>

            </ScrollView>

            {/* --- 🔥 התיקון: הבר צף בגובה 100 מעל התפריט --- */}
            <View style={styles.stickyFooter}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.priceLabel}>מחיר לשעה</Text>
                    <Text style={styles.priceValue}>₪{sitterData.price}</Text>
                </View>

                <View style={styles.actionButtons}>
                    {/* כפתור חיוג */}
                    <TouchableOpacity style={styles.iconBtn} onPress={handleCall}>
                        <Ionicons name="call" size={22} color="#4f46e5" />
                    </TouchableOpacity>

                    {/* כפתור צ'אט בתוך האפליקציה */}
                    <TouchableOpacity style={styles.iconBtn} onPress={handleChat}>
                        <Ionicons name="chatbubble-ellipses" size={22} color="#4f46e5" />
                    </TouchableOpacity>

                    {/* כפתור וואצאפ */}
                    <TouchableOpacity style={styles.whatsappBtn} onPress={handleWhatsApp}>
                        <FontAwesome5 name="whatsapp" size={20} color="#fff" />
                        <Text style={styles.whatsappText}>וואצאפ</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* מודל וידאו */}
            <Modal visible={showFullVideo} animationType="slide">
                <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
                    <TouchableOpacity style={styles.closeVideoBtn} onPress={() => setShowFullVideo(false)}>
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                    <Video
                        style={{ width: '100%', height: 400 }}
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
    container: { flex: 1, backgroundColor: '#fff' },
    topNav: { position: 'absolute', top: 50, right: 20, zIndex: 100 },
    navBtn: { backgroundColor: 'rgba(255,255,255,0.8)', padding: 10, borderRadius: 20 },

    heroContainer: { height: 320, width: '100%', position: 'relative', justifyContent: 'flex-end', alignItems: 'center' },
    heroVideo: { ...StyleSheet.absoluteFillObject },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },

    heroContent: { alignItems: 'center', marginBottom: 20 },
    profileAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#fff' },
    verifiedBadge: { position: 'absolute', bottom: 70, right: -5, backgroundColor: '#fff', borderRadius: 12 },
    heroName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 10 },
    ratingTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 5, gap: 5 },
    ratingText: { color: '#fff', fontWeight: '600', fontSize: 12 },
    playFullBtn: { position: 'absolute', top: '40%', alignItems: 'center' },
    playText: { color: '#fff', fontWeight: '600', marginTop: 5 },

    trustRow: { flexDirection: 'row-reverse', justifyContent: 'space-evenly', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    trustItem: { alignItems: 'center' },
    trustValue: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    trustLabel: { fontSize: 12, color: '#64748b' },
    divider: { width: 1, height: 30, backgroundColor: '#e2e8f0' },

    section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 10, textAlign: 'right' },
    bioText: { fontSize: 15, color: '#475569', lineHeight: 24, textAlign: 'right' },
    galleryScroll: { marginTop: 15, flexDirection: 'row-reverse' },
    galleryImg: { width: 100, height: 100, borderRadius: 12, marginRight: 10 },

    reviewCard: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, marginBottom: 10 },
    reviewerName: { fontWeight: '700', color: '#333', textAlign: 'right', marginBottom: 5 },
    reviewBody: { textAlign: 'right', color: '#475569', fontSize: 14 },

    // --- 🔥 התיקון הגדול 🔥 ---
    stickyFooter: {
        position: 'absolute',
        bottom: 100, // הרמנו את זה מעל התפריט!
        left: 20,
        right: 20,
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 15,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10
    },
    priceLabel: { fontSize: 12, color: '#64748b', textAlign: 'right' },
    priceValue: { fontSize: 22, fontWeight: '800', color: '#1e293b', textAlign: 'right' },

    actionButtons: { flexDirection: 'row', gap: 10 },
    iconBtn: { width: 50, height: 50, backgroundColor: '#EEF2FF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    whatsappBtn: { flexDirection: 'row', backgroundColor: '#25D366', paddingHorizontal: 15, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 5 },
    whatsappText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

    closeVideoBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 }
});

export default SitterProfileScreen;