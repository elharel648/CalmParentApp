// pages/SitterRegistrationScreen.tsx - Minimalist Sitter Registration
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
    ActivityIndicator,
} from 'react-native';
import {
    Shield, User, Camera, Clock, CreditCard,
    ChevronLeft, ChevronRight, Check, Plus, Minus, X
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../services/firebaseConfig';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAYS_HEB = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

const SitterRegistrationScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const progressAnim = useRef(new Animated.Value(0.2)).current;

    // Current step
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: Verification
    const [fbConnected, setFbConnected] = useState(false);
    const [igConnected, setIgConnected] = useState(false);

    // Step 2: Personal info
    const [name, setName] = useState(auth.currentUser?.displayName || '');
    const [age, setAge] = useState('');
    const [phone, setPhone] = useState('');
    const [bio, setBio] = useState('');

    // Step 3: Media
    const [profilePhoto, setProfilePhoto] = useState<string | null>(auth.currentUser?.photoURL || null);

    // Step 4: Pricing & Availability
    const [pricePerHour, setPricePerHour] = useState(50);
    const [availability, setAvailability] = useState<{ [key: number]: boolean }>({
        0: false, 1: true, 2: true, 3: true, 4: true, 5: false, 6: false
    });

    // Navigate between steps
    const goToStep = (step: number) => {
        if (step < 1 || step > 4) return;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentStep(step);

        Animated.spring(progressAnim, {
            toValue: step / 4,
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
            default:
                return true;
        }
    };

    // Social connect handlers
    const connectFacebook = async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // TODO: Implement Facebook OAuth
        Alert.alert('חיבור פייסבוק', 'כאן תהיה התחברות לפייסבוק', [
            { text: 'סימולציה - מחובר', onPress: () => setFbConnected(true) }
        ]);
    };

    const connectInstagram = async () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('חיבור אינסטגרם', 'כאן תהיה התחברות לאינסטגרם', [
            { text: 'סימולציה - מחובר', onPress: () => setIgConnected(true) }
        ]);
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
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    // Toggle day availability
    const toggleDay = (dayIndex: number) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAvailability(prev => ({
            ...prev,
            [dayIndex]: !prev[dayIndex]
        }));
    };

    // Submit registration
    const handleSubmit = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            Alert.alert('שגיאה', 'יש להתחבר קודם');
            return;
        }

        setIsSubmitting(true);
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        try {
            await updateDoc(doc(db, 'users', userId), {
                isSitter: true,
                sitterActive: true,
                sitterPrice: pricePerHour,
                sitterBio: bio,
                sitterAvailability: Object.entries(availability)
                    .filter(([_, v]) => v)
                    .map(([k]) => parseInt(k)),
                sitterVerified: fbConnected || igConnected,
                sitterFbConnected: fbConnected,
                sitterIgConnected: igConnected,
                phone: phone,
                age: parseInt(age),
                displayName: name,
            });

            // Navigate directly to dashboard
            navigation.replace('SitterDashboard');
        } catch (error) {
            Alert.alert('שגיאה', 'לא ניתן לשמור, נסה שוב');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ========== STEP COMPONENTS ==========

    // Step 1: Verification
    const VerificationStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                    <Shield size={28} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>אימות חשבון</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    חבר רשת חברתית אחת לפחות לאימות
                </Text>
            </View>

            <View style={styles.socialButtons}>
                <TouchableOpacity
                    style={[
                        styles.socialBtn,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        fbConnected && styles.socialBtnConnected
                    ]}
                    onPress={connectFacebook}
                    disabled={fbConnected}
                >
                    <Text style={[styles.socialBtnText, { color: fbConnected ? '#fff' : theme.textPrimary }]}>
                        {fbConnected ? '✓ פייסבוק מחובר' : 'התחבר עם פייסבוק'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.socialBtn,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        igConnected && styles.socialBtnConnectedIG
                    ]}
                    onPress={connectInstagram}
                    disabled={igConnected}
                >
                    <Text style={[styles.socialBtnText, { color: igConnected ? '#fff' : theme.textPrimary }]}>
                        {igConnected ? '✓ אינסטגרם מחובר' : 'התחבר עם אינסטגרם'}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={[styles.infoBox, { backgroundColor: theme.cardSecondary }]}>
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    החיבור מאפשר להורים לראות שאתה אדם אמיתי ומגביר את האמון בפרופיל
                </Text>
            </View>
        </View>
    );

    // Step 2: Personal Info
    const PersonalInfoStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                    <User size={28} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>פרטים אישיים</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    ספר לנו קצת על עצמך
                </Text>
            </View>

            <View style={styles.inputsContainer}>
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>שם מלא *</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="השם שלך"
                        placeholderTextColor={theme.textSecondary}
                        textAlign="right"
                    />
                </View>

                <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>גיל *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                            value={age}
                            onChangeText={setAge}
                            placeholder="18+"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            textAlign="right"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 2 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>טלפון *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="050-1234567"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="phone-pad"
                            textAlign="right"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>קצת עליך</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                        value={bio}
                        onChangeText={setBio}
                        placeholder="ספר על הניסיון שלך, מה אתה אוהב לעשות עם ילדים..."
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        numberOfLines={4}
                        textAlign="right"
                    />
                </View>
            </View>
        </View>
    );

    // Step 3: Photo
    const PhotoStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                    <Camera size={28} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>תמונת פרופיל</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    העלה תמונה שתראה להורים
                </Text>
            </View>

            <TouchableOpacity style={styles.photoUpload} onPress={pickImage}>
                {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.photoPreview} />
                ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <Camera size={40} color={theme.textSecondary} strokeWidth={1} />
                        <Text style={[styles.photoPlaceholderText, { color: theme.textSecondary }]}>הקש להעלאת תמונה</Text>
                    </View>
                )}
                {profilePhoto && (
                    <View style={styles.photoCheckmark}>
                        <Check size={20} color="#fff" />
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    // Step 4: Pricing
    const PricingStep = () => (
        <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
                <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                    <Clock size={28} color={theme.textSecondary} strokeWidth={1.5} />
                </View>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>מחיר וזמינות</Text>
                <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    קבע את המחיר לשעה ואת הימים הפנויים
                </Text>
            </View>

            {/* Price */}
            <View style={[styles.priceCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>מחיר לשעה</Text>
                <View style={styles.priceRow}>
                    <TouchableOpacity
                        style={[styles.priceBtn, { backgroundColor: theme.cardSecondary }]}
                        onPress={() => setPricePerHour(Math.max(30, pricePerHour - 5))}
                    >
                        <Minus size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.priceValue, { color: theme.textPrimary }]}>₪{pricePerHour}</Text>
                    <TouchableOpacity
                        style={[styles.priceBtn, { backgroundColor: theme.cardSecondary }]}
                        onPress={() => setPricePerHour(pricePerHour + 5)}
                    >
                        <Plus size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Availability */}
            <View style={[styles.availabilityCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.availabilityLabel, { color: theme.textSecondary }]}>ימים פנויים</Text>
                <View style={styles.daysRow}>
                    {DAYS_HEB.map((day, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayBtn,
                                { backgroundColor: availability[index] ? theme.textPrimary : theme.cardSecondary }
                            ]}
                            onPress={() => toggleDay(index)}
                        >
                            <Text style={[
                                styles.dayBtnText,
                                { color: availability[index] ? theme.card : theme.textSecondary }
                            ]}>
                                {day}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Summary */}
            <View style={[styles.summaryCard, { backgroundColor: theme.cardSecondary }]}>
                <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>סיכום</Text>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>שם:</Text>
                    <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>{name}</Text>
                </View>
                <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>מחיר:</Text>
                    <Text style={[styles.summaryValue, { color: theme.textPrimary }]}>₪{pricePerHour}/שעה</Text>
                </View>
            </View>
        </View>
    );

    // Render current step - using direct JSX to avoid re-creating components
    const renderStep = () => {
        if (currentStep === 1) {
            return (
                <View style={styles.stepContent}>
                    <View style={styles.stepHeader}>
                        <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                            <Shield size={28} color={theme.textSecondary} strokeWidth={1.5} />
                        </View>
                        <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>אימות חשבון</Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                            חבר רשת חברתית אחת לפחות לאימות
                        </Text>
                    </View>
                    <View style={styles.socialButtons}>
                        <TouchableOpacity
                            style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }, fbConnected && styles.socialBtnConnected]}
                            onPress={connectFacebook}
                            disabled={fbConnected}
                        >
                            <Text style={[styles.socialBtnText, { color: fbConnected ? '#fff' : theme.textPrimary }]}>
                                {fbConnected ? '✓ פייסבוק מחובר' : 'התחבר עם פייסבוק'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.socialBtn, { backgroundColor: theme.card, borderColor: theme.border }, igConnected && styles.socialBtnConnectedIG]}
                            onPress={connectInstagram}
                            disabled={igConnected}
                        >
                            <Text style={[styles.socialBtnText, { color: igConnected ? '#fff' : theme.textPrimary }]}>
                                {igConnected ? '✓ אינסטגרם מחובר' : 'התחבר עם אינסטגרם'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.infoBox, { backgroundColor: theme.cardSecondary }]}>
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                            החיבור מאפשר להורים לראות שאתה אדם אמיתי ומגביר את האמון בפרופיל
                        </Text>
                    </View>
                </View>
            );
        }

        if (currentStep === 2) {
            return (
                <View style={styles.stepContent}>
                    <View style={styles.stepHeader}>
                        <View style={[styles.stepIcon, { backgroundColor: theme.cardSecondary }]}>
                            <User size={28} color={theme.textSecondary} strokeWidth={1.5} />
                        </View>
                        <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>פרטים אישיים</Text>
                        <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                            ספר לנו קצת על עצמך
                        </Text>
                    </View>
                    <View style={styles.inputsContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>שם מלא *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="השם שלך"
                                placeholderTextColor={theme.textSecondary}
                                textAlign="right"
                            />
                        </View>
                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>גיל *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                                    value={age}
                                    onChangeText={setAge}
                                    placeholder="18+"
                                    placeholderTextColor={theme.textSecondary}
                                    keyboardType="numeric"
                                    textAlign="right"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 2 }]}>
                                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>טלפון *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="050-1234567"
                                    placeholderTextColor={theme.textSecondary}
                                    keyboardType="phone-pad"
                                    textAlign="right"
                                />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>קצת עליך</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.textPrimary, borderColor: theme.border }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="ספר על הניסיון שלך, מה אתה אוהב לעשות עם ילדים..."
                                placeholderTextColor={theme.textSecondary}
                                multiline
                                numberOfLines={4}
                                textAlign="right"
                            />
                        </View>
                    </View>
                </View>
            );
        }

        if (currentStep === 3) {
            return <PhotoStep />;
        }

        if (currentStep === 4) {
            return <PricingStep />;
        }

        return null;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color={theme.textSecondary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>הרשמה כסיטר</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            { backgroundColor: theme.textPrimary },
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
                    שלב {currentStep} מתוך 4
                </Text>
            </View>

            {/* Content */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {renderStep()}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                {currentStep > 1 && (
                    <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: theme.border }]}
                        onPress={prevStep}
                    >
                        <ChevronRight size={18} color={theme.textSecondary} />
                        <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>חזרה</Text>
                    </TouchableOpacity>
                )}

                {currentStep < 4 ? (
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}
                        onPress={nextStep}
                    >
                        <Text style={[styles.primaryBtnText, { color: theme.card }]}>המשך</Text>
                        <ChevronLeft size={18} color={theme.card} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={theme.card} />
                        ) : (
                            <Text style={[styles.primaryBtnText, { color: theme.card }]}>סיים הרשמה</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 45,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },

    // Progress
    progressContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    progressTrack: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },

    // Content
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
    stepIcon: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    stepSubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },

    // Social
    socialButtons: {
        gap: 12,
    },
    socialBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    socialBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    socialBtnConnected: {
        backgroundColor: '#374151',
        borderColor: '#374151',
    },
    socialBtnConnectedIG: {
        backgroundColor: '#374151',
        borderColor: '#374151',
    },

    // Info Box
    infoBox: {
        padding: 16,
        borderRadius: 12,
    },
    infoText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Inputs
    inputsContainer: {
        gap: 16,
    },
    inputGroup: {
        gap: 6,
    },
    inputRow: {
        flexDirection: 'row-reverse',
        gap: 12,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'right',
    },
    input: {
        fontSize: 15,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 1,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },

    // Photo
    photoUpload: {
        alignSelf: 'center',
    },
    photoPlaceholder: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    photoPlaceholderText: {
        fontSize: 13,
    },
    photoPreview: {
        width: 160,
        height: 160,
        borderRadius: 80,
    },
    photoCheckmark: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#374151',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Pricing
    priceCard: {
        padding: 20,
        borderRadius: 14,
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 13,
        marginBottom: 12,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },
    priceBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priceValue: {
        fontSize: 36,
        fontWeight: '700',
    },

    // Availability
    availabilityCard: {
        padding: 20,
        borderRadius: 14,
    },
    availabilityLabel: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
    },
    daysRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 8,
    },
    dayBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Summary
    summaryCard: {
        padding: 16,
        borderRadius: 14,
    },
    summaryTitle: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'right',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Footer
    footer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 120 : 100,
        gap: 12,
        borderTopWidth: 1,
    },
    secondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    primaryBtn: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default SitterRegistrationScreen;
