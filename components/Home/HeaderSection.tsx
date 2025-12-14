import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { ChildProfile } from '../../types/home';

interface HeaderSectionProps {
    greeting: string;
    profile: ChildProfile;
    isNightMode: boolean;
    onNightModeToggle: () => void;
    dynamicStyles: {
        text: string;
        textSub: string;
    };
}

/**
 * Header section with greeting, child info, and night mode toggle
 */
const HeaderSection = memo<HeaderSectionProps>(({
    greeting,
    profile,
    isNightMode,
    onNightModeToggle,
    dynamicStyles,
}) => {
    return (
        <View style={styles.headerContainer}>
            <View>
                <Text
                    style={[styles.greetingText, { color: dynamicStyles.text }]}
                    accessibilityRole="header"
                >
                    {greeting},
                </Text>
                <Text style={[styles.parentName, { color: dynamicStyles.textSub }]}>
                    {profile.name} {profile.ageMonths > 0 ? `בן/בת ${profile.ageMonths} חודשים` : 'הבייבי החדש'}
                </Text>
            </View>

            <TouchableOpacity
                onPress={onNightModeToggle}
                style={styles.nightModeBtn}
                accessibilityLabel={isNightMode ? 'עבור למצב יום' : 'עבור למצב לילה'}
                accessibilityRole="button"
            >
                {isNightMode ? (
                    <Sun size={24} color="#EF4444" />
                ) : (
                    <Moon size={24} color="#1f2937" />
                )}
            </TouchableOpacity>
        </View>
    );
});

HeaderSection.displayName = 'HeaderSection';

const styles = StyleSheet.create({
    headerContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greetingText: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'right',
    },
    parentName: {
        fontSize: 16,
        textAlign: 'right',
        marginTop: 4,
        color: '#6B7280',
    },
    nightModeBtn: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 50,
    },
});

export default HeaderSection;
