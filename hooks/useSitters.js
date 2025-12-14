import { useState, useEffect } from 'react';
import { MOCK_SITTERS } from '../constants/babySitter';

/**
 * Custom Hook לניהול רשימת בייביסיטרים
 * כרגע משתמש בנתוני Mock, אך מוכן להחלפה ב-API Call
 * @returns {Object} { sitters, isLoading, error, refetch }
 */
const useSitters = () => {
    const [sitters, setSitters] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSitters = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // סימולציה של API call
            await new Promise(resolve => setTimeout(resolve, 300));

            // TODO: להחליף ב-fetch מ-API אמיתי
            // const response = await fetch('YOUR_API_ENDPOINT/sitters');
            // const data = await response.json();

            setSitters(MOCK_SITTERS);
        } catch (err) {
            console.error('Error fetching sitters:', err);
            setError('שגיאה בטעינת בייביסיטרים');
            setSitters([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSitters();
    }, []);

    return {
        sitters,
        isLoading,
        error,
        refetch: fetchSitters,
    };
};

export default useSitters;
