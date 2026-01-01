import { useState, useCallback } from 'react';

export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => string | null;
    email?: boolean;
    numeric?: boolean;
}

export interface FormErrors {
    [key: string]: string;
}

export function useFormValidation<T extends Record<string, string>>(
    initialValues: T,
    rules: Record<keyof T, ValidationRule>
) {
    const [values, setValues] = useState<T>(initialValues);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const validateField = useCallback(
        (name: keyof T, value: string): string | null => {
            const rule = rules[name];
            if (!rule) return null;

            if (rule.required && !value.trim()) {
                return 'שדה חובה';
            }

            if (value && rule.minLength && value.length < rule.minLength) {
                return `מינימום ${rule.minLength} תווים`;
            }

            if (value && rule.maxLength && value.length > rule.maxLength) {
                return `מקסימום ${rule.maxLength} תווים`;
            }

            if (value && rule.pattern && !rule.pattern.test(value)) {
                return 'פורמט לא תקין';
            }

            if (value && rule.email) {
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailPattern.test(value)) {
                    return 'כתובת אימייל לא תקינה';
                }
            }

            if (value && rule.numeric) {
                if (isNaN(Number(value))) {
                    return 'יש להזין מספר בלבד';
                }
            }

            if (value && rule.custom) {
                return rule.custom(value);
            }

            return null;
        },
        [rules]
    );

    const setValue = useCallback(
        (name: keyof T, value: string) => {
            setValues((prev) => ({ ...prev, [name]: value }));
            if (touched[name]) {
                const error = validateField(name, value);
                setErrors((prev) => ({
                    ...prev,
                    [name]: error || '',
                }));
            }
        },
        [touched, validateField]
    );

    const setFieldTouched = useCallback((name: keyof T) => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        const error = validateField(name, values[name]);
        setErrors((prev) => ({
            ...prev,
            [name]: error || '',
        }));
    }, [values, validateField]);

    const validate = useCallback((): boolean => {
        const newErrors: FormErrors = {};
        let isValid = true;

        Object.keys(values).forEach((key) => {
            const error = validateField(key as keyof T, values[key as keyof T]);
            if (error) {
                newErrors[key] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        setTouched(
            Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {})
        );
        return isValid;
    }, [values, validateField]);

    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
    }, [initialValues]);

    return {
        values,
        errors,
        touched,
        setValue,
        setFieldTouched,
        validate,
        reset,
    };
}

