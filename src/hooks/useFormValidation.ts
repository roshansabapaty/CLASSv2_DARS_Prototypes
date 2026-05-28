import { useState, useCallback } from 'react';

export interface ValidationRule<T> {
  validate: (value: T) => string | undefined;
  message?: string;
}

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]> | ((value: T[K], formData: T) => string | undefined);
};

export const useFormValidation = <T extends Record<string, any>>(
  validationRules: ValidationRules<T>
) => {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Set<keyof T>>(new Set());

  const validateField = useCallback((fieldName: keyof T, value: any, formData?: T) => {
    const rule = validationRules[fieldName];
    if (!rule) return true;

    let error: string | undefined;
    if (typeof rule === 'function') {
      error = formData ? rule(value, formData) : rule(value, {} as T);
    } else {
      error = rule.validate(value);
    }

    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });

    return !error;
  }, [validationRules]);

  const validateForm = useCallback((formData: T) => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach((key) => {
      const fieldName = key as keyof T;
      const rule = validationRules[fieldName];
      if (!rule) return;

      let error: string | undefined;
      if (typeof rule === 'function') {
        error = rule(formData[fieldName], formData);
      } else {
        error = rule.validate(formData[fieldName]);
      }

      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    // Mark all fields as touched on form validation
    setTouched(new Set(Object.keys(validationRules) as Array<keyof T>));
    return isValid;
  }, [validationRules]);

  const touchField = useCallback((fieldName: keyof T) => {
    setTouched(prev => new Set(prev).add(fieldName));
  }, []);

  const getFieldError = useCallback((fieldName: keyof T) => {
    return touched.has(fieldName) ? errors[fieldName] : undefined;
  }, [touched, errors]);

  const clearFieldError = useCallback((fieldName: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouched(new Set());
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    touched,
    hasErrors,
    validateField,
    validateForm,
    touchField,
    getFieldError,
    clearFieldError,
    clearAllErrors
  };
};

// Common validation rules
export const validators = {
  required: (fieldName: string) => (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return undefined;
  },

  email: (value: string) => {
    if (!value) return undefined;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  },

  minLength: (min: number, fieldName: string) => (value: string) => {
    if (!value) return undefined;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return undefined;
  },

  maxLength: (max: number, fieldName: string) => (value: string) => {
    if (!value) return undefined;
    if (value.length > max) {
      return `${fieldName} must not exceed ${max} characters`;
    }
    return undefined;
  },

  pattern: (pattern: RegExp, message: string) => (value: string) => {
    if (!value) return undefined;
    if (!pattern.test(value)) {
      return message;
    }
    return undefined;
  },

  dateRange: (startDate: Date | undefined, endDate: Date | undefined, fieldName: string) => {
    if (!startDate || !endDate) return undefined;
    if (startDate > endDate) {
      return `${fieldName} end date must be after start date`;
    }
    return undefined;
  },

  futureDate: (fieldName: string) => (value: Date | undefined) => {
    if (!value) return undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (value < today) {
      return `${fieldName} must be a future date`;
    }
    return undefined;
  },

  pastDate: (fieldName: string) => (value: Date | undefined) => {
    if (!value) return undefined;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (value > today) {
      return `${fieldName} must be a past date`;
    }
    return undefined;
  }
};
