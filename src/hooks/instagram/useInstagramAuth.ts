import { useState, useCallback } from 'react';

export function useInstagramAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateLogin = useCallback(() => {
    try {
      setLoading(true);
      setError(null);
      window.location.href = '/api/auth/instagram/start';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate Instagram login';
      setError(message);
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    initiateLogin,
  };
}
