import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { WeatherData } from '../types/home';

// Weather code to icon mapping for Open-Meteo
const getWeatherIcon = (code: number): string => {
    // https://open-meteo.com/en/docs - Weather interpretation codes
    if (code === 0) return '☀️'; // Clear sky
    if (code <= 3) return '⛅'; // Partly cloudy
    if (code <= 48) return '☁️'; // Fog/Cloudy
    if (code <= 55) return '🌧️'; // Drizzle
    if (code <= 65) return '🌧️'; // Rain
    if (code <= 77) return '❄️'; // Snow
    if (code <= 82) return '🌧️'; // Rain showers
    if (code <= 86) return '❄️'; // Snow showers
    if (code >= 95) return '⛈️'; // Thunderstorm
    return '☁️';
};

interface UseWeatherReturn {
    weather: WeatherData;
    refresh: () => Promise<void>;
}

/**
 * Custom hook for weather data using Open-Meteo (free, no API key)
 */
export const useWeather = (): UseWeatherReturn => {
    const [weather, setWeather] = useState<WeatherData>({
        temp: 24,
        city: 'טוען...',
        icon: '☁️',
        recommendation: 'טוען...',
        loading: true,
    });

    const getRecommendation = useCallback((temp: number): string => {
        if (temp >= 25) return 'חם ☀️ שכבה דקה.';
        if (temp >= 20) return 'נעים 😎 שכבה ארוכה.';
        if (temp >= 15) return 'קריר 🍃 שתי שכבות.';
        return 'קר 🥶 לחמם טוב!';
    }, []);

    const getCityName = async (lat: number, lon: number): Promise<string> => {
        try {
            const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
            return address?.city || address?.region || 'איזורך';
        } catch {
            return 'איזורך';
        }
    };

    const fetchWeather = useCallback(async () => {
        setWeather(prev => ({ ...prev, loading: true, error: undefined }));

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setWeather(prev => ({
                    ...prev,
                    loading: false,
                    recommendation: 'אין גישה למיקום',
                    error: 'permission_denied',
                }));
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            const { latitude, longitude } = location.coords;

            // Open-Meteo API - FREE, no API key needed!
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
            );

            if (!response.ok) {
                throw new Error('Weather API error');
            }

            const data = await response.json();
            const temp = Math.round(data.current.temperature_2m);
            const weatherCode = data.current.weather_code;
            const cityName = await getCityName(latitude, longitude);

            setWeather({
                temp,
                city: cityName,
                icon: getWeatherIcon(weatherCode),
                recommendation: getRecommendation(temp),
                loading: false,
            });
        } catch (e) {
            if (__DEV__) console.log('Weather fetch issue:', e);
            setWeather({
                temp: 22,
                city: 'ישראל',
                icon: '☁️',
                recommendation: 'בדוק חיבור 🔧',
                loading: false,
                error: 'fetch_failed',
            });
        }
    }, [getRecommendation]);

    useEffect(() => {
        fetchWeather();
    }, [fetchWeather]);

    return {
        weather,
        refresh: fetchWeather,
    };
};

export default useWeather;
