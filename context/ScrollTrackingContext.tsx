import React, { createContext, useContext, ReactNode } from 'react';
import { useSharedValue } from 'react-native-reanimated';

interface ScrollTrackingContextType {
    scrollY: ReturnType<typeof useSharedValue<number>>;
    scrollX: ReturnType<typeof useSharedValue<number>>;
    gestureX: ReturnType<typeof useSharedValue<number>>;
    gestureY: ReturnType<typeof useSharedValue<number>>;
}

const ScrollTrackingContext = createContext<ScrollTrackingContextType | null>(null);

export function ScrollTrackingProvider({ children }: { children: ReactNode }) {
    const scrollY = useSharedValue(0);
    const scrollX = useSharedValue(0);
    const gestureX = useSharedValue(0);
    const gestureY = useSharedValue(0);

    return (
        <ScrollTrackingContext.Provider value={{ scrollY, scrollX, gestureX, gestureY }}>
            {children}
        </ScrollTrackingContext.Provider>
    );
}

export function useScrollTracking() {
    const context = useContext(ScrollTrackingContext);
    if (!context) {
        throw new Error('useScrollTracking must be used within ScrollTrackingProvider');
    }
    return context;
}

