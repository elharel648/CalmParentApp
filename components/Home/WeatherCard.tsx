import React, { memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WeatherData } from '../../types/home';

interface WeatherCardProps {
    weather: WeatherData;
}

/**
 * Weather card with skeleton loading state
 */
const WeatherCard = memo<WeatherCardProps>(({ weather }) => {
    if (weather.loading) {
        // Skeleton loading state
        return (
            <View style={styles.weatherCard}>
                <View style={styles.weatherIcon}>
                    <View style={styles.skeletonTemp} />
                </View>
                <View style={styles.weatherInfo}>
                    <View style={styles.skeletonCity} />
                    <View style={styles.skeletonRec} />
                </View>
            </View>
        );
    }

    return (
        <View
            style={styles.weatherCard}
            accessibilityLabel={`מזג אוויר ב${weather.city}: ${weather.temp} מעלות. ${weather.recommendation}`}
        >
            <View style={styles.weatherIcon}>
                <Text style={styles.weatherTemp}>{weather.temp}°</Text>
            </View>
            <View style={styles.weatherInfo}>
                <Text style={styles.weatherTitle}>{weather.city}</Text>
                <Text style={styles.weatherRec}>{weather.recommendation}</Text>
            </View>
        </View>
    );
});

WeatherCard.displayName = 'WeatherCard';

const styles = StyleSheet.create({
    weatherCard: {
        flexDirection: 'row-reverse',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    weatherIcon: {
        alignItems: 'center',
        paddingLeft: 16,
        borderLeftWidth: 1,
        borderLeftColor: '#f3f4f6',
        minWidth: 60,
    },
    weatherTemp: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 4,
    },
    weatherInfo: {
        flex: 1,
        paddingRight: 12,
    },
    weatherTitle: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
        textAlign: 'right',
    },
    weatherRec: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'right',
    },
    // Skeleton styles
    skeletonTemp: {
        width: 40,
        height: 28,
        backgroundColor: '#E5E7EB',
        borderRadius: 6,
    },
    skeletonCity: {
        width: 60,
        height: 14,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        marginBottom: 8,
        alignSelf: 'flex-end',
    },
    skeletonRec: {
        width: 120,
        height: 18,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        alignSelf: 'flex-end',
    },
});

export default WeatherCard;
