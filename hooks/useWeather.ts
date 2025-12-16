import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { WeatherData } from '../types/home';

const WEATHER_API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY || '41f2779d99ca3ddd58629c9708ab787d';

interface UseWeatherReturn {
    weather: WeatherData;
    refresh: () => Promise<void>;
}

/**
 * Custom hook for weather data with clothing recommendations
 */
export const useWeather = (): UseWeatherReturn => {
    const [weather, setWeather] = useState<WeatherData>({
        temp: 24,
        city: 'תל אביב',
        recommendation: 'טוען...',
        loading: true,
    });

    const getRecommendation = useCallback((temp: number): string => {
        if (temp >= 25) return 'חם ☀️ שכבה דקה.';
        if (temp >= 20) return 'נעים 😎 שכבה ארוכה.';
        if (temp >= 15) return 'קריר 🍃 שתי שכבות.';
        return 'קר 🥶 לחמם טוב!';
    }, []);

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

            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${location.coords.latitude}&lon=${location.coords.longitude}&appid=${WEATHER_API_KEY}&units=metric&lang=he`
            );

            if (!response.ok) {
                throw new Error('Weather API error');
            }

            const data = await response.json();
            const temp = Math.round(data.main.temp);

            setWeather({
                temp,
                city: data.name || 'איזורך',
                recommendation: getRecommendation(temp),
                loading: false,
            });
        } catch (e) {
            if (__DEV__) console.log('Weather fetch issue:', e);
            setWeather({
                temp: 22,
                city: 'ישראל',
                recommendation: 'בדוק חיבור או API key 🔧',
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
