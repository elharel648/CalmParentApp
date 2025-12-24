import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface UseLocationReturn {
    address: string;
    coordinates: Coordinates | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

/**
 * Custom Hook לניהול מיקום משתמש
 */
const useLocation = (): UseLocationReturn => {
    const [address, setAddress] = useState('מאתר מיקום...');
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLocation = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // בקשת הרשאות
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setAddress('תל אביב');
                setError('לא ניתנה הרשאה למיקום');
                setIsLoading(false);
                return;
            }

            // קבלת מיקום נוכחי
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setCoordinates({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            // Reverse Geocoding
            const reverseGeocode = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (reverseGeocode.length > 0) {
                const addr = reverseGeocode[0];
                const formattedAddress = addr.street
                    ? `${addr.city || ''}, ${addr.street}`.trim()
                    : addr.city || 'מיקום נוכחי';
                setAddress(formattedAddress);
            } else {
                setAddress('מיקום נוכחי');
            }
        } catch (err) {
            if (__DEV__) console.error('Location error:', err);
            setError('שגיאה באיתור מיקום');
            setAddress('לא ניתן לאתר מיקום');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLocation();
    }, [fetchLocation]);

    return {
        address,
        coordinates,
        isLoading,
        error,
        refetch: fetchLocation,
    };
};

export default useLocation;
