import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast, { ToastConfig, ToastType } from '../components/Toast';

interface ToastContextType {
    showToast: (config: ToastConfig) => void;
    showSuccess: (message: string, duration?: number) => void;
    showError: (message: string, duration?: number) => void;
    showWarning: (message: string, duration?: number) => void;
    showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toast, setToast] = useState<ToastConfig & { visible: boolean } | null>(null);

    const showToast = useCallback((config: ToastConfig) => {
        setToast({ ...config, visible: true });
    }, []);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    const showSuccess = useCallback((message: string, duration = 3000) => {
        showToast({ message, type: 'success', duration });
    }, [showToast]);

    const showError = useCallback((message: string, duration = 4000) => {
        showToast({ message, type: 'error', duration });
    }, [showToast]);

    const showWarning = useCallback((message: string, duration = 3000) => {
        showToast({ message, type: 'warning', duration });
    }, [showToast]);

    const showInfo = useCallback((message: string, duration = 3000) => {
        showToast({ message, type: 'info', duration });
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
            {children}
            {toast && (
                <Toast
                    visible={toast.visible}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    action={toast.action}
                    onDismiss={toast.onDismiss}
                    onHide={hideToast}
                />
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

