import { useState, useCallback } from 'react';

interface UseSecretInputReturn {
  value: string;
  hasSecret: boolean;
  handleChange: (value: string) => void;
  reset: () => void;
}

interface UseSecretInputOptions {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export function useSecretInput({ 
  initialValue = '', 
  onChange 
}: UseSecretInputOptions = {}): UseSecretInputReturn {
  const [value, setValue] = useState(initialValue);
  const [hasSecret, setHasSecret] = useState(!!initialValue);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setHasSecret(!!newValue);
    onChange?.(newValue);
  }, [onChange]);

  const reset = useCallback(() => {
    setValue('');
    setHasSecret(false);
  }, []);

  return {
    value,
    hasSecret,
    handleChange,
    reset
  };
}