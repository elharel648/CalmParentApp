import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react-native';

export interface DynamicIslandContent {
    type: 'timer' | 'notification' | 'activity';
    icon?: LucideIcon;
    title: string;
    subtitle?: string;
    color?: string;
    duration?: number;
    onDismiss?: () => void;
}

interface DynamicIslandContextType {
    content: DynamicIslandContent | null;
    isVisible: boolean;
    show: (content: DynamicIslandContent) => void;
    hide: () => void;
    updateContent: (updates: Partial<DynamicIslandContent>) => void;
    onDismiss?: () => void;
}

const DynamicIslandContext = createContext<DynamicIslandContextType | null>(null);

export function DynamicIslandProvider({ children }: { children: ReactNode }) {
    const [content, setContent] = useState<DynamicIslandContent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    const show = useCallback((newContent: DynamicIslandContent) => {
        setContent(newContent);
        setIsVisible(true);

        // Auto hide if duration is set (0 means don't auto-hide)
        if (newContent.duration && newContent.duration > 0) {
            setTimeout(() => {
                hide();
            }, newContent.duration);
        }
    }, []);

    const hide = useCallback(() => {
        setIsVisible(false);
        setTimeout(() => {
            setContent(null);
        }, 300); // Wait for animation to complete
    }, []);

    const updateContent = useCallback((updates: Partial<DynamicIslandContent>) => {
        setContent((prev) => {
            if (!prev) return null;
            return { ...prev, ...updates };
        });
    }, []);

    return (
        <DynamicIslandContext.Provider value={{ content, isVisible, show, hide, updateContent, onDismiss: content?.onDismiss }}>
            {children}
        </DynamicIslandContext.Provider>
    );
}

export function useDynamicIsland() {
    const context = useContext(DynamicIslandContext);
    if (!context) {
        // Return default values if not in provider (for components that might not have it)
        return {
            content: null,
            isVisible: false,
            show: () => {},
            hide: () => {},
            updateContent: () => {},
            onDismiss: undefined,
        };
    }
    return context;
}

