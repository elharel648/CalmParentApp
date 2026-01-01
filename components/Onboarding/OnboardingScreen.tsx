import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolate,
} from 'react-native-reanimated';
import { Baby, BarChart2, Users, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlide {
    icon: React.ComponentType<{ size: number; color: string }>;
    title: string;
    description: string;
    color: string;
}

const slides: OnboardingSlide[] = [
    {
        icon: Baby,
        title: 'ברוכים הבאים ל-CalmParent',
        description: 'אפליקציה אחת לכל מה שצריך כדי לטפל בתינוק שלך',
        color: '#6366F1',
    },
    {
        icon: BarChart2,
        title: 'עקוב אחרי הכל',
        description: 'תעד האכלות, שינה, חיתולים וכל מה שחשוב',
        color: '#8B5CF6',
    },
    {
        icon: Users,
        title: 'שתף עם המשפחה',
        description: 'אפשר למשפחה ולסבים לעקוב ולעדכן יחד',
        color: '#10B981',
    },
];

interface OnboardingScreenProps {
    onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { theme, isDarkMode } = useTheme();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useSharedValue(0);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleScroll = (event: any) => {
        scrollX.value = event.nativeEvent.contentOffset.x;
        const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentIndex(index);
    };

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            scrollViewRef.current?.scrollTo({
                x: (currentIndex + 1) * SCREEN_WIDTH,
                animated: true,
            });
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {slides.map((slide, index) => {
                    const Icon = slide.icon;
                    return (
                        <View key={index} style={styles.slide}>
                            <View style={styles.iconContainer}>
                                <LinearGradient
                                    colors={[slide.color, slide.color + '80']}
                                    style={styles.iconGradient}
                                >
                                    <Icon size={64} color="#fff" />
                                </LinearGradient>
                            </View>
                            <Text style={[styles.title, { color: theme.textPrimary }]}>
                                {slide.title}
                            </Text>
                            <Text style={[styles.description, { color: theme.textSecondary }]}>
                                {slide.description}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor:
                                        index === currentIndex ? theme.primary : theme.border,
                                    width: index === currentIndex ? 24 : 8,
                                },
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.buttons}>
                    {currentIndex < slides.length - 1 && (
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={handleSkip}
                        >
                            <Text style={[styles.skipText, { color: theme.textSecondary }]}>
                                דלג
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[styles.nextButton, { backgroundColor: theme.primary }]}
                        onPress={handleNext}
                    >
                        <Text style={styles.nextText}>
                            {currentIndex === slides.length - 1 ? 'התחל' : 'הבא'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        marginBottom: 40,
    },
    iconGradient: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 32,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipButton: {
        padding: 12,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '600',
    },
    nextButton: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

