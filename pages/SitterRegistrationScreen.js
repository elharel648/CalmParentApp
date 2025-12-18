import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Steps configuration
const STEPS = [
    { id: 1, title: 'אימות חשבון', icon: 'shield-checkmark' },
    { id: 2, title: 'פרטים אישיים', icon: 'person' },
    { id: 3, title: 'תמונה ווידאו', icon: 'camera' },
    { id: 4, title: 'מחיר וזמינות', icon: 'time' },
    { id: 5, title: 'סיום הרשמה', icon: 'card' },
];

const DAYS_HEB = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const SitterRegistrationScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const scrollRef = useRef(null);
    const progressAnim = useRef(new Animated.Value(0.2)).current;

    // Current step
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Social verification
    const [fbConnected, setFbConnected] = useState(false);
    const [igConnected, setIgConnected] = useState(false);

    // Step 2: Personal info
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');

    // Step 3: Media
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [introVideo, setIntroVideo] = useState(null);

    // Step 4: Pricing & Availability
    const [pricePerHour, setPricePerHour] = useState('50');
    const [availability, setAvailability] = useState({
        0: false, 1: true, 2: true, 3: true, 4: true, 5: false, 6: false
    });

    // Navigate between steps
    const goToStep = (step) => {
        if (step < 1 || step > 5) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentStep(step);

        // Animate progress
        Animated.spring(progressAnim, {
            toValue: step / 5,
            useNativeDriver: false,
        }).start();
    };

    const nextStep = () => {
        if (validateCurrentStep()) {
            goToStep(currentStep + 1);
        }
    };

    const prevStep = () => goToStep(currentStep - 1);

    // Validation
    const validateCurrentStep = () => {
        switch (currentStep) {
            case 1:
                if (!fbConnected && !igConnected) {
                    Alert.alert('נדרש אימות', 'יש לחבר לפחות רשת חברתית אחת');
                    return false;
                }
                return true;
            case 2:
                if (!name.trim() || !age || !phone.trim()) {
                    Alert.alert('שדות חובה', 'יש למלא שם, גיל וטלפון');
                    return false;
                }
                return true;
            case 3:
                if (!profilePhoto) {
                    Alert.alert('תמונה נדרשת', 'יש להעלות תמונת פרופיל');
                    return false;
                }
                return true;
            case 4:
                if (!pricePerHour || parseInt(pricePerHour) < 30) {
                    Alert.alert('מחיר', 'מחיר מינימלי 30₪ לשעה');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    // Social connect handlers
    const connectFacebook = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // TODO: Implement Facebook OAuth
        Alert.alert(
            'חיבור פייסבוק',
            'כאן תהיה התחברות לפייסבוק',
            [{ text: 'סימולציה - מחובר', onPress: () => setFbConnected(true) }]
        );
    };

    const connectInstagram = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // TODO: Implement Instagram OAuth
        Alert.alert(
            'חיבור אינסטגרם',
            'כאן תהיה התחברות לאינסטגרם',
            [{ text: 'סימולציה - מחובר', onPress: () => setIgConnected(true) }]
        );
    };

    // Media handlers
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setProfilePhoto(result.assets[0].uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            videoMaxDuration: 30,
            quality: 0.7,
        });

        if (!result.canceled) {
            setIntroVideo(result.assets[0].uri);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    // Toggle day availability
    const toggleDay = (dayIndex) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAvailability(prev => ({
            ...prev,
            [dayIndex]: !prev[dayIndex]
        }));
    };

    // Submit registration
    const handleSubmit = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // TODO: Save to Firebase + Stripe payment
        Alert.alert(
            'ההרשמה הושלמה! 🎉',
            'תודה שנרשמת! ברוכה הבאה לדשבורד שלך.',
            [{ text: 'התחילי!', onPress: () => navigation.replace('SitterDashboard') }]
        );
    };

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderVerificationStep();
            case 2:
                return renderPersonalInfoStep();
            case 3:
                return renderMediaStep();
            case 4:
                return renderPricingStep();
            case 5:
                return renderPaymentStep();
            default:
                return null;
        }
    };

    // Step 1: Social Verification
    const renderVerificationStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.stepIconBg}>
                    <Ionicons name="shield-checkmark" size={32} color="#fff" />
                </LinearGradient>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>אימות חשבון</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    חברי רשת חברתית אחת לפחות לאימות זהותך
                </Text>
            </View>

            <View style={styles.socialButtons}>
                <TouchableOpacity
                    style={[styles.socialBtn, fbConnected && styles.socialBtnConnected]}
                    onPress={connectFacebook}
                    disabled={fbConnected}
                >
                    <Ionicons name="logo-facebook" size={24} color={fbConnected ? '#fff' : '#1877F2'} />
                    <Text style={[styles.socialBtnText, fbConnected && styles.socialBtnTextConnected]}>
                        {fbConnected ? 'מחובר ✓' : 'התחבר עם פייסבוק'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.socialBtn, igConnected && styles.socialBtnConnectedIG]}
                    onPress={connectInstagram}
                    disabled={igConnected}
                >
                    <Ionicons name="logo-instagram" size={24} color={igConnected ? '#fff' : '#E4405F'} />
                    <Text style={[styles.socialBtnText, igConnected && styles.socialBtnTextConnected]}>
                        {igConnected ? 'מחובר ✓' : 'התחבר עם אינסטגרם'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#6366F1" />
                <Text style={styles.infoText}>
                    החיבור מאפשר להורים לראות שאת אדם אמיתי ומוגבר את האמון בפרופיל שלך
                </Text>
            </View>
        </View>
    );

    // Step 2: Personal Info
    const renderPersonalInfoStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.stepIconBg}>
                    <Ionicons name="person" size={32} color="#fff" />
                </LinearGradient>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>פרטים אישיים</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    ספרי לנו קצת על עצמך
                </Text>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שם מלא *</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="למשל: נועה כהן"
                    placeholderTextColor={theme.textSecondary}
                    textAlign="right"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>גיל *</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary }]}
                    value={age}
                    onChangeText={setAge}
                    placeholder="18+"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    textAlign="right"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>טלפון *</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="050-1234567"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    textAlign="right"
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>קצת עלייך 🧸</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.textPrimary }]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="ספרי על הניסיון שלך, מה את אוהבת לעשות עם ילדים..."
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    numberOfLines={4}
                    textAlign="right"
                />
            </View>
        </View>
    );

    // Step 3: Media
    const renderMediaStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.stepIconBg}>
                    <Ionicons name="camera" size={32} color="#fff" />
                </LinearGradient>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>תמונה ווידאו</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    העלי תמונת פרופיל ווידאו היכרות קצר
                </Text>
            </View>

            <View style={styles.mediaRow}>
                {/* Profile Photo */}
                <TouchableOpacity style={styles.mediaCard} onPress={pickImage}>
                    {profilePhoto ? (
                        <Image source={{ uri: profilePhoto }} style={styles.mediaPreview} />
                    ) : (
                        <View style={[styles.mediaPlaceholder, { backgroundColor: theme.card }]}>
                            <Ionicons name="camera" size={32} color="#9CA3AF" />
                            <Text style={styles.mediaPlaceholderText}>תמונת פרופיל *</Text>
                        </View>
                    )}
                    {profilePhoto && (
                        <View style={styles.mediaCheckmark}>
                            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        </View>
                    )}
                </TouchableOpacity>

                {/* Intro Video */}
                <TouchableOpacity style={styles.mediaCard} onPress={pickVideo}>
                    {introVideo ? (
                        <View style={[styles.mediaPlaceholder, { backgroundColor: '#10B981' }]}>
                            <Ionicons name="videocam" size={32} color="#fff" />
                            <Text style={[styles.mediaPlaceholderText, { color: '#fff' }]}>וידאו הועלה ✓</Text>
                        </View>
                    ) : (
                        <View style={[styles.mediaPlaceholder, { backgroundColor: theme.card }]}>
                            <Ionicons name="videocam" size={32} color="#9CA3AF" />
                            <Text style={styles.mediaPlaceholderText}>וידאו היכרות</Text>
                            <Text style={styles.mediaHint}>עד 30 שניות</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="bulb" size={20} color="#F59E0B" />
                <Text style={styles.infoText}>
                    וידאו קצר שבו את מציגה את עצמך מגדיל את הסיכוי להזמנות פי 3!
                </Text>
            </View>
        </View>
    );

    // Step 4: Pricing & Availability
    const renderPricingStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.stepIconBg}>
                    <Ionicons name="time" size={32} color="#fff" />
                </LinearGradient>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>מחיר וזמינות</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    קבעי את המחיר לשעה ואת הימים שבהם את פנויה
                </Text>
            </View>

            <View style={styles.priceSection}>
                <Text style={styles.inputLabel}>מחיר לשעה (₪)</Text>
                <View style={styles.priceInputRow}>
                    <TouchableOpacity
                        style={styles.priceBtn}
                        onPress={() => setPricePerHour(String(Math.max(30, parseInt(pricePerHour || '0') - 5)))}
                    >
                        <Ionicons name="remove" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View style={[styles.priceDisplay, { backgroundColor: theme.card }]}>
                        <Text style={[styles.priceValue, { color: theme.textPrimary }]}>₪{pricePerHour}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.priceBtn}
                        onPress={() => setPricePerHour(String(parseInt(pricePerHour || '0') + 5))}
                    >
                        <Ionicons name="add" size={24} color="#6366F1" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.availabilitySection}>
                <Text style={styles.inputLabel}>ימים שאני פנויה</Text>
                <View style={styles.daysGrid}>
                    {DAYS_HEB.map((day, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayBtn,
                                availability[index] && styles.dayBtnActive
                            ]}
                            onPress={() => toggleDay(index)}
                        >
                            <Text style={[
                                styles.dayBtnText,
                                availability[index] && styles.dayBtnTextActive
                            ]}>
                                {day}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );

    // Step 5: Payment
    const renderPaymentStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.stepIconBg}>
                    <Ionicons name="card" size={32} color="#fff" />
                </LinearGradient>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>סיום הרשמה 🎉</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    כמעט סיימנו! הנה סיכום הפרטים שלך
                </Text>
            </View>

            {/* Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
                <View style={styles.summaryRow}>
                    {profilePhoto && <Image source={{ uri: profilePhoto }} style={styles.summaryAvatar} />}
                    <View style={styles.summaryInfo}>
                        <Text style={[styles.summaryName, { color: theme.textPrimary }]}>{name}, {age}</Text>
                        <Text style={[styles.summaryPrice, { color: '#6366F1' }]}>₪{pricePerHour}/שעה</Text>
                    </View>
                </View>
                <Text style={[styles.summaryBio, { color: theme.textSecondary }]} numberOfLines={2}>
                    {bio || 'לא הוזן תיאור'}
                </Text>
                <View style={styles.summaryBadges}>
                    {fbConnected && (
                        <View style={styles.summaryBadge}>
                            <Ionicons name="logo-facebook" size={14} color="#1877F2" />
                            <Text style={styles.summaryBadgeText}>מאומת</Text>
                        </View>
                    )}
                    {igConnected && (
                        <View style={styles.summaryBadge}>
                            <Ionicons name="logo-instagram" size={14} color="#E4405F" />
                            <Text style={styles.summaryBadgeText}>מאומת</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Pricing */}
            <View style={[styles.pricingCard, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.pricingTitle}>דמי הרשמה חודשיים</Text>
                <View style={styles.pricingRow}>
                    <Text style={styles.pricingAmount}>₪49</Text>
                    <Text style={styles.pricingPeriod}>/חודש</Text>
                </View>
                <Text style={styles.pricingIncludes}>כולל: פרופיל מאומת • הופעה בחיפוש • צ'אט עם הורים</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-forward" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>הרשמה כבייביסיטר</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>
                <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                    שלב {currentStep} מתוך 5
                </Text>
            </View>

            {/* Content */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {renderStepContent()}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer Buttons */}
            <View style={[styles.footer, { backgroundColor: theme.background }]}>
                {currentStep > 1 && (
                    <TouchableOpacity style={styles.secondaryBtn} onPress={prevStep}>
                        <Text style={styles.secondaryBtnText}>חזרה</Text>
                    </TouchableOpacity>
                )}

                {currentStep < 5 ? (
                    <TouchableOpacity style={styles.primaryBtn} onPress={nextStep}>
                        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.primaryBtnGradient}>
                            <Text style={styles.primaryBtnText}>המשך</Text>
                            <Ionicons name="arrow-back" size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.primaryBtnGradient}>
                            <Text style={styles.primaryBtnText}>שלם והרשם</Text>
                            <Ionicons name="card" size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    progressContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6366F1',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 8,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    stepContent: {
        gap: 24,
    },
    stepHeader: {
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    stepIconBg: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
    },
    stepSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Social Buttons
    socialButtons: {
        gap: 12,
    },
    socialBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#fff',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    socialBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#374151',
    },
    socialBtnConnected: {
        backgroundColor: '#1877F2',
        borderColor: '#1877F2',
    },
    socialBtnConnectedIG: {
        backgroundColor: '#E4405F',
        borderColor: '#E4405F',
    },
    socialBtnTextConnected: {
        color: '#fff',
    },

    // Info Box
    infoBox: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#EEF2FF',
        padding: 16,
        borderRadius: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#4338CA',
        lineHeight: 20,
        textAlign: 'right',
    },

    // Input Group
    inputGroup: {
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        textAlign: 'right',
    },
    input: {
        fontSize: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },

    // Media
    mediaRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    mediaCard: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    mediaPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
        borderRadius: 16,
    },
    mediaPlaceholderText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    mediaHint: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    mediaPreview: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    mediaCheckmark: {
        position: 'absolute',
        top: 8,
        right: 8,
    },

    // Pricing
    priceSection: {
        gap: 12,
    },
    priceInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    priceBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceDisplay: {
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 16,
    },
    priceValue: {
        fontSize: 32,
        fontWeight: '800',
    },

    // Availability
    availabilitySection: {
        gap: 12,
    },
    daysGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
    },
    dayBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    dayBtnActive: {
        backgroundColor: '#6366F1',
    },
    dayBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    dayBtnTextActive: {
        color: '#fff',
    },

    // Summary
    summaryCard: {
        padding: 20,
        borderRadius: 20,
        gap: 12,
    },
    summaryRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 16,
    },
    summaryAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    summaryInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    summaryName: {
        fontSize: 20,
        fontWeight: '700',
    },
    summaryPrice: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    summaryBio: {
        fontSize: 14,
        textAlign: 'right',
        lineHeight: 20,
    },
    summaryBadges: {
        flexDirection: 'row-reverse',
        gap: 10,
    },
    summaryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F3F4F6',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    summaryBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
    },

    // Pricing Card
    pricingCard: {
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        gap: 8,
    },
    pricingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#059669',
    },
    pricingRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    pricingAmount: {
        fontSize: 40,
        fontWeight: '800',
        color: '#059669',
    },
    pricingPeriod: {
        fontSize: 16,
        fontWeight: '600',
        color: '#10B981',
        marginBottom: 6,
    },
    pricingIncludes: {
        fontSize: 12,
        color: '#059669',
        textAlign: 'center',
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 90,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row-reverse',
        padding: 20,
        paddingBottom: 20,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    primaryBtn: {
        flex: 2,
    },
    primaryBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 16,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    secondaryBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
});

export default SitterRegistrationScreen;
