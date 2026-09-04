import { useGetMe } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { useCallback } from 'react';
import { getGetMeQueryKey } from '@workspace/api-client-react';

export function useStaffAuth() {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem('staff_token');
  
  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    }
  });

  const isAuthenticated = !!token && !error;

  const logout = useCallback(() => {
    localStorage.removeItem('staff_token');
    setLocation('/login');
  }, [setLocation]);

  return {
    user,
    isLoading: !!token && isLoading,
    isAuthenticated,
    logout,
  };
}
