// hooks/useSitters.ts - Real Firebase Sitters Hook
import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export interface Sitter {
    id: string;
    name: string;
    age: number;
    photoUrl: string | null;
    rating: number;
    reviewCount: number;
    pricePerHour: number;
    isVerified: boolean;
    experience: string;
    bio: string;
    distance?: number;
    availability: string[];
    languages: string[];
    certifications: string[];
}

/**
 * Custom Hook לניהול רשימת בייביסיטרים מ-Firebase
 */
const useSitters = () => {
    const [sitters, setSitters] = useState<Sitter[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSitters = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Query registered sitters from Firebase
            const q = query(
                collection(db, 'users'),
                where('isSitter', '==', true),
                where('sitterActive', '==', true)
            );

            const snapshot = await getDocs(q);
            const fetchedSitters: Sitter[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedSitters.push({
                    id: doc.id,
                    name: data.displayName || 'סיטר',
                    age: data.age || 0,
                    photoUrl: data.photoUrl || null,
                    rating: data.sitterRating || 0,
                    reviewCount: data.sitterReviewCount || 0,
                    pricePerHour: data.sitterPrice || 50,
                    isVerified: data.sitterVerified || false,
                    experience: data.sitterExperience || '',
                    bio: data.sitterBio || '',
                    distance: 0, // Calculate based on location if needed
                    availability: data.sitterAvailability || [],
                    languages: data.sitterLanguages || ['עברית'],
                    certifications: data.sitterCertifications || [],
                });
            });

            // Sort by rating by default
            fetchedSitters.sort((a, b) => b.rating - a.rating);
            setSitters(fetchedSitters);

        } catch (err) {
            setError('שגיאה בטעינת בייביסיטרים');
            setSitters([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSitters();
    }, [fetchSitters]);

    return {
        sitters,
        isLoading,
        error,
        refetch: fetchSitters,
    };
};

export default useSitters;
