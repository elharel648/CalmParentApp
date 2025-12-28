import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define all available quick action keys
// Define all available quick action keys
export type QuickActionKey =
    | 'food' | 'sleep' | 'diaper' | 'supplements' | 'whiteNoise'
    | 'sos' | 'health' | 'growth' | 'milestones' | 'magicMoments' | 'tools' | 'custom'
    | 'teeth' | 'nightLight';

// Default order of actions (right to left in RTL)
const DEFAULT_ORDER: QuickActionKey[] = [
    'custom', 'tools', 'health', 'growth', 'teeth', 'nightLight', 'magicMoments', 'milestones',
    'sos', 'whiteNoise', 'supplements', 'diaper', 'sleep', 'food'
];

// Actions that cannot be hidden (core functionality)
const PROTECTED_ACTIONS: QuickActionKey[] = ['food', 'sleep', 'diaper'];

interface QuickActionsContextType {
    actionOrder: QuickActionKey[];
    hiddenActions: QuickActionKey[];
    isEditMode: boolean;
    setEditMode: (value: boolean) => void;
    setActionOrder: (order: QuickActionKey[]) => void;
    moveAction: (key: QuickActionKey, direction: 'up' | 'down') => void;
    toggleActionVisibility: (key: QuickActionKey) => void;
    resetToDefault: () => void;
    isProtected: (key: QuickActionKey) => boolean;
}

const STORAGE_KEY_ORDER = '@quick_actions_order';
const STORAGE_KEY_HIDDEN = '@quick_actions_hidden';

const QuickActionsContext = createContext<QuickActionsContextType | undefined>(undefined);

export const QuickActionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [actionOrder, setActionOrder] = useState<QuickActionKey[]>(DEFAULT_ORDER);
    const [hiddenActions, setHiddenActions] = useState<QuickActionKey[]>([]);
    const [isEditMode, setEditMode] = useState(false);

    // Load saved preferences on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const [savedOrder, savedHidden] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEY_ORDER),
                AsyncStorage.getItem(STORAGE_KEY_HIDDEN),
            ]);

            if (savedOrder) {
                const parsed = JSON.parse(savedOrder) as QuickActionKey[];
                // Ensure all actions are present (in case new ones were added)
                const merged = [...parsed, ...DEFAULT_ORDER.filter(k => !parsed.includes(k))];
                setActionOrder(merged);
            }

            if (savedHidden) {
                setHiddenActions(JSON.parse(savedHidden));
            }
        } catch (error) {
            console.error('Error loading quick actions preferences:', error);
        }
    };

    const savePreferences = async (order: QuickActionKey[], hidden: QuickActionKey[]) => {
        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(order)),
                AsyncStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(hidden)),
            ]);
        } catch (error) {
            console.error('Error saving quick actions preferences:', error);
        }
    };

    const moveAction = (key: QuickActionKey, direction: 'up' | 'down') => {
        const index = actionOrder.indexOf(key);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= actionOrder.length) return;

        const newOrder = [...actionOrder];
        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

        setActionOrder(newOrder);
        savePreferences(newOrder, hiddenActions);
    };

    const toggleActionVisibility = (key: QuickActionKey) => {
        // Cannot hide protected actions
        if (PROTECTED_ACTIONS.includes(key)) return;

        const newHidden = hiddenActions.includes(key)
            ? hiddenActions.filter(k => k !== key)
            : [...hiddenActions, key];

        setHiddenActions(newHidden);
        savePreferences(actionOrder, newHidden);
    };

    const resetToDefault = () => {
        setActionOrder(DEFAULT_ORDER);
        setHiddenActions([]);
        savePreferences(DEFAULT_ORDER, []);
    };

    const isProtected = (key: QuickActionKey) => PROTECTED_ACTIONS.includes(key);

    return (
        <QuickActionsContext.Provider
            value={{
                actionOrder,
                hiddenActions,
                isEditMode,
                setEditMode,
                setActionOrder: (order: QuickActionKey[]) => {
                    setActionOrder(order);
                    savePreferences(order, hiddenActions);
                },
                moveAction,
                toggleActionVisibility,
                resetToDefault,
                isProtected,
            }}
        >
            {children}
        </QuickActionsContext.Provider>
    );
};

export const useQuickActions = () => {
    const context = useContext(QuickActionsContext);
    if (!context) {
        throw new Error('useQuickActions must be used within QuickActionsProvider');
    }
    return context;
};
